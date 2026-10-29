import { notFound } from "next/navigation";
import ChatKitSmoke from "./smoke";

export default function ChatKitSmokePage() {
  if (process.env.NODE_ENV === "production" || process.env.KIVVI_CHATKIT_SMOKE !== "true")
    notFound();
  return <ChatKitSmoke />;
}
