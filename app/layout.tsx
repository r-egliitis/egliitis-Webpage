import { Space_Grotesk, Space_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Header } from "@/components/header";
import "./globals.css";

// latin-ext carries the Latvian letters (ā, ē, ī, ņ, š and so on).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-fg">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
