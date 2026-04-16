import { AgentsMonitorPanel } from "@/components/admin/AgentsMonitorPanel";

export default function AdminIAAgentes() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Agentes IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitoramento de todos os agentes de IA ativos</p>
      </div>
      <AgentsMonitorPanel />
    </div>
  );
}
