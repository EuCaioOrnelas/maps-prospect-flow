import { SubscriptionEventsLog } from "@/components/admin/SubscriptionEventsLog";

export default function AdminWebhooks() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Webhooks & Debug</h1>
        <p className="text-sm text-muted-foreground mt-1">Eventos de webhook e debug de subscriptions</p>
      </div>
      <SubscriptionEventsLog />
    </div>
  );
}
