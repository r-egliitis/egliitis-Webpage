import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { Background } from "@/components/background";
import { Skills } from "@/components/skills";
import { Now } from "@/components/now";
import { Contact } from "@/components/contact";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <About />
      <Background />
      <Skills />
      <Now />
      <Contact />
    </main>
  );
}
