import { MessagePage } from "@/components/realm/MessagePage";

export default function NotFound() {
  return (
    <MessagePage title="Not found">
      <p>
        That page or game doesn&apos;t exist, or you aren&apos;t seated in it. Games are tied to the
        browser you played them in.
      </p>
    </MessagePage>
  );
}
