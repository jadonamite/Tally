import { Logo } from "@/components/Logo";

export default function AppHome() {
  return (
    <main className="app-dark mx-auto min-h-dvh max-w-md bg-(--s-bg) p-5 text-(--s-text)">
      <Logo />
      <p className="mt-4 text-(--s-sub)">Shell works.</p>
    </main>
  );
}
