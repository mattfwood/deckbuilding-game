import { Suspense } from "react";
import { NewGameForm } from "@/components/realm/NewGameForm";
import { YourGames } from "@/components/realm/YourGames";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-10 px-4 py-12">
      <NewGameForm />
      {/* Reads this browser's cookie, so it renders per request; the form above stays static. */}
      <Suspense fallback={null}>
        <YourGames />
      </Suspense>
    </main>
  );
}
