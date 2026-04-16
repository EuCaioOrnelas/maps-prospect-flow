import { SubscriptionEventsLog } from "@/components/admin/SubscriptionEventsLog";
import { CampaignDebugPanel } from "@/components/admin/CampaignDebugPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminWebhooks() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Webhooks & Debug</h1>
        <p className="text-sm text-muted-foreground mt-1">Eventos de webhook e debug de subscriptions</p>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionEventsLog />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignDebugPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
