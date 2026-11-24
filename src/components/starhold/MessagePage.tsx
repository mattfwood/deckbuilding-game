import Link from "next/link";
import { Wordmark } from "./Wordmark";

/** A simple full-page message, for errors and missing games. */
export function MessagePage({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <Wordmark as="p" size="sm" />
      <h1 className="font-hud text-2xl font-bold tracking-wide text-cyan-50 uppercase">{title}</h1>
      <div className="text-dim">{children}</div>
      <div className="flex items-center gap-4">
        {action}
        <Link href="/" className="text-sm underline">
          Back to your games
        </Link>
      </div>
    </main>
  );
}
