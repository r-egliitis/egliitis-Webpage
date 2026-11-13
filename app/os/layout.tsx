import type { Metadata, Viewport } from "next";

// Nothing under /os should ever be indexed. proxy.ts also sends X-Robots-Tag.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

// Lets the phone tab bar sit above the home indicator (safe-area insets).
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function OsLayout({ children }: LayoutProps<"/os">) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
