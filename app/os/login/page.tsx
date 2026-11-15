import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <Container className="flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between pt-[env(safe-area-inset-top)]">
        <Link href="/" className="flex items-center gap-2" aria-label="egliitis home">
          <Image src="/joker.png" alt="" width={22} height={22} />
          <span className="font-bold tracking-tight">egliitis</span>
        </Link>
        <ThemeToggle />
      </Container>
      <Container className="flex flex-1 items-center py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">/os</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Sign in</h1>
          <LoginForm />
        </div>
      </Container>
    </>
  );
}
