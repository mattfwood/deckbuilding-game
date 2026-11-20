"use client";

import { Board } from "./Board";
import { NewGameForm } from "./NewGameForm";
import { useRealmGame } from "./useRealmGame";

export default function GameRoot() {
  const { session, act, startGame, quit, dismissError } = useRealmGame();

  if (!session) return <NewGameForm onStart={startGame} />;
  return (
    <Board
      state={session.state}
      humanSeat={session.humanSeat}
      error={session.error}
      act={act}
      onDismissError={dismissError}
      onNewGame={quit}
    />
  );
}
