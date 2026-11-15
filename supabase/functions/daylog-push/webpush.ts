// Minimal Web Push sender: RFC 8291 (aes128gcm message encryption) and
// RFC 8292 (VAPID). WebCrypto only, so it runs on Deno (Supabase Edge
// Functions) and Node alike, with no dependencies.

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string }; // base64url, as `web-push generate-vapid-keys` prints

const encoder = new TextEncoder();

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function base64UrlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((sum, part) => sum + part.length, 0)));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hmac(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
}

/** RFC 8291 §3.4: encrypts `payload` for one subscription (single record). */
export async function encryptPayload(
  payload: Uint8Array<ArrayBuffer>,
  keys: { p256dh: string; auth: string },
  // Injectable for tests; random in production.
  options: { salt?: Uint8Array<ArrayBuffer>; serverKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = base64UrlDecode(keys.p256dh);
  const authSecret = base64UrlDecode(keys.auth);
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const serverKeys =
    options.serverKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, serverKeys.privateKey, 256),
  );

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const prkKey = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(encoder.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);

  // CEK and nonce from HKDF(salt, IKM, ...)
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(encoder.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(encoder.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  // One record: plaintext || 0x02 (last-record delimiter).
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, concat(payload, new Uint8Array([2]))),
  );

  // Header: salt(16) || record size(4, BE) || key id length(1) || key id (as_public)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

/**
 * Cleans pasted key values: whitespace/newlines, quotes, a leading "NAME=",
 * and standard (+/) base64. Returns base64url without padding.
 */
export function cleanKey(raw: string, name: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(new RegExp(`^${name}\\s*=\\s*`), "")
    .replace(/\s+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Normalises and checks a VAPID key pair. Throws a message that says what is
 * wrong (never the key itself): wrong length, swapped keys, or keys that
 * don't belong together.
 */
export async function checkedVapidKeys(raw: VapidKeys): Promise<VapidKeys> {
  const publicKey = cleanKey(raw.publicKey, "VAPID_PUBLIC_KEY");
  const privateKey = cleanKey(raw.privateKey, "VAPID_PRIVATE_KEY");
  let publicBytes: Uint8Array;
  let privateBytes: Uint8Array;
  try {
    publicBytes = base64UrlDecode(publicKey);
    privateBytes = base64UrlDecode(privateKey);
  } catch {
    throw new Error("VAPID keys aren't valid base64url. Re-paste them in Edge Function secrets.");
  }
  if (publicBytes.length === 32 && privateBytes.length === 65) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY look swapped.");
  }
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error(`VAPID_PUBLIC_KEY should be 65 bytes (87 characters); got ${publicBytes.length} bytes.`);
  }
  if (privateBytes.length !== 32) {
    throw new Error(`VAPID_PRIVATE_KEY should be 32 bytes (43 characters); got ${privateBytes.length} bytes.`);
  }
  const keys = { publicKey, privateKey, subject: raw.subject };

  // Prove the pair matches: sign with the private key, verify with the public one.
  let valid = false;
  try {
    const header = await vapidAuthorization("https://check.invalid/", keys);
    const [, jwt] = header.match(/^vapid t=([^,]+),/) ?? [];
    const [h, c, s] = jwt.split(".");
    const verifyKey = await crypto.subtle.importKey(
      "raw",
      publicBytes as Uint8Array<ArrayBuffer>,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, verifyKey, base64UrlDecode(s), encoder.encode(`${h}.${c}`));
  } catch {
    valid = false; // some runtimes reject a mismatched x/y/d at import time
  }
  if (!valid) throw new Error("VAPID_PRIVATE_KEY doesn't belong to VAPID_PUBLIC_KEY. Re-paste both from the same pair.");
  return keys;
}

/** RFC 8292: the `Authorization: vapid t=..., k=...` header for an endpoint. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()): Promise<string> {
  const publicRaw = base64UrlDecode(vapid.publicKey); // 0x04 || x(32) || y(32)
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicRaw.slice(1, 33)),
    y: base64UrlEncode(publicRaw.slice(33, 65)),
    d: vapid.privateKey,
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64UrlEncode(
    encoder.encode(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: vapid.subject }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  // WebCrypto ECDSA signatures are raw r||s, which is exactly JOSE's ES256 format.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned));
  return `vapid t=${unsigned}.${base64UrlEncode(signature)}, k=${vapid.publicKey}`;
}

export type SendResult = { status: number; ok: boolean; gone: boolean; body?: string };

/** Sends one push. `gone` = the subscription is dead (404/410): delete it. */
export async function sendPush(
  subscription: PushSubscriptionKeys,
  payload: unknown,
  vapid: VapidKeys,
  options: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high"; topic?: string } = {},
): Promise<SendResult> {
  const body = await encryptPayload(encoder.encode(JSON.stringify(payload)), subscription);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(options.ttl ?? 600),
      Urgency: options.urgency ?? "high",
      ...(options.topic && { Topic: options.topic }),
    },
    body,
  });
  const ok = response.status >= 200 && response.status < 300;
  return {
    status: response.status,
    ok,
    gone: response.status === 404 || response.status === 410,
    body: ok ? undefined : (await response.text()).slice(0, 300),
  };
}
