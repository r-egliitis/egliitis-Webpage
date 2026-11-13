import { Header } from "@/components/header";

// The public site. /os has its own shell, so the site header lives here.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
