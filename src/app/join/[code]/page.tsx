import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinForm } from "@/components/starhold/JoinForm";
import { Wordmark } from "@/components/starhold/Wordmark";
import { GameNotFoundError, type InviteInfo } from "@/server/games";
import { gameService, getGuestId } from "@/server/guest";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Wordmark as="h1" size="lg" />
      <Suspense fallback={<p className="text-sm text-dim">Loading invite…</p>}>
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let invite: InviteInfo;
  try {
    invite = await gameService().getInvite(code, await getGuestId());
  } catch (e) {
    if (e instanceof GameNotFoundError)
      return <Problem>That invite link isn&apos;t valid.</Problem>;
    throw e;
  }
  if (invite.joined) redirect(`/game/${invite.gameId}`);
  if (invite.status !== "lobby") return <Problem>This game has already started.</Problem>;
  if (invite.seats.length >= invite.maxSeats) return <Problem>This game is full.</Problem>;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-dim">
        <strong className="text-ink">{invite.hostName}</strong> invited you to a game. Seated so
        far: {invite.seats.map((s) => s.name).join(", ")}.
      </p>
      <JoinForm code={code} />
    </section>
  );
}

function Problem({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-dim">{children}</p>
      <Link href="/" className="text-sm underline">
        Start your own game
      </Link>
    </section>
  );
}
