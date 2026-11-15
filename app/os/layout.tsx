import type { Metadata, Viewport } from "next";

// Nothing under /os should ever be indexed. proxy.ts also sends X-Robots-Tag.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  // Installable as the "Day Log" app (scope /os/). Declared here, not at the
  // root, so the public site doesn't become installable.
  manifest: "/daylog.webmanifest",
  appleWebApp: { capable: true, title: "Day Log", statusBarStyle: "black-translucent" },
};

// Lets the phone tab bar sit above the home indicator (safe-area insets).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#2e2c2b" },
    { media: "(prefers-color-scheme: light)", color: "#f0eee9" },
  ],
};

export default function OsLayout({ children }: LayoutProps<"/os">) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
