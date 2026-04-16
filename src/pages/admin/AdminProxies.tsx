import { ProxyManagerPanel } from "@/components/admin/ProxyManagerPanel";

export default function AdminProxies() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Proxies</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerenciamento de proxies para WhatsApp</p>
      </div>
      <ProxyManagerPanel />
    </div>
  );
}
