"use client";

import { useEffect } from "react";
import { MessagePage } from "@/components/starhold/MessagePage";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MessagePage
      title="Something went wrong"
      action={
        <button className="btn-primary" onClick={() => retry()}>
          Try again
        </button>
      }
    >
      <p>The server hit a problem. Your game is saved; trying again usually works.</p>
    </MessagePage>
  );
}
