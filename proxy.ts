import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Backs up the robots metadata, and also covers redirects.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

// Only the private /os section goes through the proxy; public routes are untouched.
export const config = {
  matcher: ["/os", "/os/:path*"],
};
