"use client";

import dynamic from "next/dynamic";

// The game runs entirely in the browser (localStorage save, random seeds), so skip SSR.
const GameRoot = dynamic(() => import("./GameRoot"), {
  ssr: false,
  loading: () => <p className="m-auto text-stone-500">Loading Realm…</p>,
});

export function RealmLoader() {
  return <GameRoot />;
}
