import { TermsAcceptanceLog } from "@/components/admin/TermsAcceptanceLog";

export default function AdminTermos() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Termos & Aceite</h1>
        <p className="text-sm text-muted-foreground mt-1">Log de aceite dos termos de uso</p>
      </div>
      <TermsAcceptanceLog />
    </div>
  );
}
