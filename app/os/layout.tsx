import type { Metadata } from "next";

// Nothing under /os should ever be indexed. proxy.ts also sends X-Robots-Tag.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function OsLayout({ children }: LayoutProps<"/os">) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
