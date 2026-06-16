import { History } from "lucide-react";

export function WorkforceVersions() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
        <History className="size-6" />
      </div>
      <h3 className="text-lg font-semibold">Histórico de versões</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-2">
        Em breve você poderá visualizar e restaurar versões anteriores do seu colaborador digital.
      </p>
    </div>
  );
}
