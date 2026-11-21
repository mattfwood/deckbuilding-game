"use client";

import { useEffect } from "react";
import { MessagePage } from "@/components/realm/MessagePage";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MessagePage
      title="Something went wrong"
      action={
        <button
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
          onClick={() => retry()}
        >
          Try again
        </button>
      }
    >
      <p>The server hit a problem. Your game is saved; trying again usually works.</p>
    </MessagePage>
  );
}
