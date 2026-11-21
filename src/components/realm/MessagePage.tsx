import Link from "next/link";

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
      <p className="text-sm font-semibold tracking-tight text-stone-500">Realm</p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="text-stone-600 dark:text-stone-400">{children}</div>
      <div className="flex items-center gap-4">
        {action}
        <Link href="/" className="text-sm underline">
          Back to your games
        </Link>
      </div>
    </main>
  );
}
