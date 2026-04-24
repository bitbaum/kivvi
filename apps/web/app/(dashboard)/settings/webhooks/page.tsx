import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSessionOrRedirect } from "@/lib/session";
import { listWebhookEndpointsAction } from "@/app/actions/webhooks";
import { WebhooksPanel } from "./webhooks-panel";

export default async function WebhooksSettingsPage() {
  await getSessionOrRedirect();
  const result = await listWebhookEndpointsAction();
  const endpoints = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Benachrichtige externe Systeme bei Ereignissen in Kivvi
          </p>
        </div>
      </div>

      <WebhooksPanel initialEndpoints={endpoints} />
    </div>
  );
}
