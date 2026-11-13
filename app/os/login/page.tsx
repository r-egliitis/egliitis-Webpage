import { Container } from "@/components/container";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Container className="flex flex-1 items-center py-20">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">/os</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Sign in</h1>
        <LoginForm />
      </div>
    </Container>
  );
}
