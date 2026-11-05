import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Loader2,
  Download,
  DollarSign,
  Tag,
  Lightbulb,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useSdrProducts, type SdrProductInput } from "@/hooks/useSdrProducts";
import { productPriceLabel, type SdrProduct } from "@/lib/sdrSales";
import { cn } from "@/lib/utils";

const EMPTY_FORM: SdrProductInput = {
  name: "",
  description: "",
  category: "",
  segments: [],
  problems_solved: "",
  benefits: "",
  differentials: "",
  price_type: "fixed",
  price_value: null,
  price_min: null,
  price_max: null,
  price_display: "",
  billing_model: "unico",
  installments: "",
  payment_conditions: "",
  max_discount_percent: 0,
  negotiation_rules: "",
  delivery_estimate: "",
  hiring_conditions: "",
  sales_arguments: "",
  objections: [],
  qualification_questions: [],
  target_audience: "",
  priority_segments: [],
  requirements: "",
  when_to_offer: "",
  when_not_to_offer: "",
  full_description: "",
  priority: "media",
  proposal_file: null,
  active: true,
};

function toForm(p: SdrProduct): SdrProductInput {
  return { ...EMPTY_FORM, ...p };
}

function csvToList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SDRProductCatalog({ open, onClose }: Props) {
  const { accountOwnerId } = useAuth();
  const { products, loading, save, remove, toggleActive, importFromCompanyServices } = useSdrProducts();
  const [editing, setEditing] = useState<SdrProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SdrProductInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SdrProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  // Textos livres de listas (edição amigável com vírgulas)
  const [segmentsText, setSegmentsText] = useState("");
  const [questionsText, setQuestionsText] = useState("");

  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setEditing(null);
    }
  }, [open]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSegmentsText("");
    setQuestionsText("");
    setFormOpen(true);
  };

  const openEdit = (p: SdrProduct) => {
    setEditing(p);
    setForm(toForm(p));
    setSegmentsText((p.segments ?? []).join(", "));
    setQuestionsText((p.qualification_questions ?? []).join("\n"));
    setFormOpen(true);
  };

  const set = <K extends keyof SdrProductInput>(key: K, value: SdrProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadProposal = async (file: File) => {
    if (!accountOwnerId) return;
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("O PDF precisa ter no máximo 15 MB.");
      return;
    }
    setUploading(true);
    try {
      const path = `${accountOwnerId}/catalogo-${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage
        .from("sdr-proposals")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (error) throw error;
      set("proposal_file", { url: path, name: file.name, path });
      toast.success("Proposta anexada ao produto.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar o PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Informe o nome do produto.");
      return;
    }
    setSaving(true);
    const payload: SdrProductInput = {
      ...form,
      segments: csvToList(segmentsText),
      qualification_questions: questionsText.split("\n").map((s) => s.trim()).filter(Boolean),
      price_value: form.price_value != null && form.price_value !== ("" as any) ? Number(form.price_value) : null,
      price_min: form.price_min != null && form.price_min !== ("" as any) ? Number(form.price_min) : null,
      price_max: form.price_max != null && form.price_max !== ("" as any) ? Number(form.price_max) : null,
      max_discount_percent: Number(form.max_discount_percent) || 0,
    };
    const ok = await save(payload, editing?.id);
    setSaving(false);
    if (ok) setFormOpen(false);
  };

  const handleImport = async () => {
    setImporting(true);
    const count = await importFromCompanyServices();
    setImporting(false);
    if (count > 0) toast.success(`${count} serviço(s) importado(s) do perfil da empresa.`);
    else toast.info("Nenhum serviço novo para importar.");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" strokeWidth={1.75} />
            Catálogo comercial do SDR
          </DialogTitle>
        </DialogHeader>

        {!formOpen ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cadastre os produtos e serviços que o SDR pode oferecer no modo venda direta. Ele só
              apresenta preços, condições e propostas cadastrados aqui — nunca inventa informações.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Novo produto
              </Button>
              <Button variant="outline" onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Importar serviços da empresa
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Package className="h-8 w-8 mx-auto text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium text-foreground">Nenhum produto cadastrado</p>
                <p className="text-xs text-muted-foreground">
                  Cadastre o primeiro produto ou importe os serviços do perfil da empresa.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border bg-card p-3",
                      !p.active && "opacity-60"
                    )}
                  >
                    <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Tag className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        {p.category && (
                          <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            p.priority === "alta" && "border-primary text-primary",
                            p.priority === "baixa" && "text-muted-foreground"
                          )}
                        >
                          prioridade {p.priority}
                        </Badge>
                        {!p.active && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {productPriceLabel(p)}
                        {p.proposal_file?.path ? " • com proposta em PDF" : ""}
                        {(p.segments ?? []).length ? ` • ${(p.segments ?? []).join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="basico">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basico">Básico</TabsTrigger>
                <TabsTrigger value="comercial">Comercial</TabsTrigger>
                <TabsTrigger value="venda">Venda</TabsTrigger>
                <TabsTrigger value="proposta">Proposta</TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="space-y-3 pt-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nome do produto/serviço *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Ex.: Criação de sites"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Input
                      value={form.category ?? ""}
                      onChange={(e) => set("category", e.target.value)}
                      placeholder="Ex.: Desenvolvimento"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição comercial</Label>
                  <Textarea
                    rows={3}
                    value={form.description ?? ""}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="O que é, o que entrega e para quem é"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Segmentos atendidos (separados por vírgula)</Label>
                  <Input
                    value={segmentsText}
                    onChange={(e) => setSegmentsText(e.target.value)}
                    placeholder="Ex.: restaurantes, bares, clínicas"
                  />
                  <p className="text-xs text-muted-foreground">
                    Orienta a IA na escolha da oferta, sem impedir recomendações fora da lista.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Problemas que resolve</Label>
                  <Textarea
                    rows={2}
                    value={form.problems_solved ?? ""}
                    onChange={(e) => set("problems_solved", e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Benefícios principais</Label>
                    <Textarea
                      rows={2}
                      value={form.benefits ?? ""}
                      onChange={(e) => set("benefits", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Diferenciais competitivos</Label>
                    <Textarea
                      rows={2}
                      value={form.differentials ?? ""}
                      onChange={(e) => set("differentials", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comercial" className="space-y-3 pt-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de preço</Label>
                    <Select value={form.price_type} onValueChange={(v) => set("price_type", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Preço fixo</SelectItem>
                        <SelectItem value="from">A partir de</SelectItem>
                        <SelectItem value="range">Faixa de preço</SelectItem>
                        <SelectItem value="custom">Personalizado (sob consulta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo de cobrança</Label>
                    <Select value={form.billing_model} onValueChange={(v) => set("billing_model", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unico">Único</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.price_type === "range" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Preço mínimo (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.price_min ?? ""}
                        onChange={(e) => set("price_min", e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preço máximo (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.price_max ?? ""}
                        onChange={(e) => set("price_max", e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </div>
                  </div>
                ) : form.price_type !== "custom" ? (
                  <div className="space-y-1.5">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.price_value ?? ""}
                      onChange={(e) => set("price_value", e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="Ex.: 2500"
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>Texto de preço (opcional, exibido como está)</Label>
                  <Input
                    value={form.price_display ?? ""}
                    onChange={(e) => set("price_display", e.target.value)}
                    placeholder="Ex.: a partir de R$ 1.500/mês"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Desconto máximo autorizado (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.max_discount_percent ?? 0}
                      onChange={(e) => set("max_discount_percent", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Acima disso, o SDR encaminha a negociação para um humano.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Parcelamento</Label>
                    <Input
                      value={form.installments ?? ""}
                      onChange={(e) => set("installments", e.target.value)}
                      placeholder="Ex.: até 12x no cartão"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Condições de pagamento</Label>
                    <Textarea
                      rows={2}
                      value={form.payment_conditions ?? ""}
                      onChange={(e) => set("payment_conditions", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Regras de negociação</Label>
                    <Textarea
                      rows={2}
                      value={form.negotiation_rules ?? ""}
                      onChange={(e) => set("negotiation_rules", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prazo estimado de entrega</Label>
                    <Input
                      value={form.delivery_estimate ?? ""}
                      onChange={(e) => set("delivery_estimate", e.target.value)}
                      placeholder="Ex.: 15 dias úteis"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Condições de contratação</Label>
                    <Input
                      value={form.hiring_conditions ?? ""}
                      onChange={(e) => set("hiring_conditions", e.target.value)}
                      placeholder="Ex.: contrato mínimo de 6 meses"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="venda" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" /> Quando recomendar
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.when_to_offer ?? ""}
                    onChange={(e) => set("when_to_offer", e.target.value)}
                    placeholder="Ex.: quando o lead diz que não tem presença digital"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quando NÃO recomendar</Label>
                  <Textarea
                    rows={2}
                    value={form.when_not_to_offer ?? ""}
                    onChange={(e) => set("when_not_to_offer", e.target.value)}
                    placeholder="Ex.: quando o lead já tem site novo e bem avaliado"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Argumentos de venda</Label>
                  <Textarea
                    rows={3}
                    value={form.sales_arguments ?? ""}
                    onChange={(e) => set("sales_arguments", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Perguntas de qualificação (uma por linha)</Label>
                  <Textarea
                    rows={3}
                    value={questionsText}
                    onChange={(e) => setQuestionsText(e.target.value)}
                    placeholder={"Ex.:\nVocê já tem site hoje?\nQuem cuida do seu atendimento no WhatsApp?"}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Público-alvo</Label>
                    <Input
                      value={form.target_audience ?? ""}
                      onChange={(e) => set("target_audience", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prioridade comercial</Label>
                    <Select value={form.priority} onValueChange={(v) => set("priority", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Requisitos para contratação</Label>
                  <Textarea
                    rows={2}
                    value={form.requirements ?? ""}
                    onChange={(e) => set("requirements", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição completa para a IA (opcional)</Label>
                  <Textarea
                    rows={4}
                    value={form.full_description ?? ""}
                    onChange={(e) => set("full_description", e.target.value)}
                    placeholder="Informações detalhadas que a IA pode consultar durante a negociação"
                  />
                </div>
              </TabsContent>

              <TabsContent value="proposta" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">
                  Cada produto pode ter sua própria proposta comercial em PDF. O SDR envia
                  automaticamente quando o lead aceita receber a proposta.
                </p>
                {form.proposal_file?.path ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {form.proposal_file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF armazenado com segurança</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => set("proposal_file", null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center cursor-pointer transition-colors hover:border-primary/40",
                      uploading && "pointer-events-none opacity-60"
                    )}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadProposal(file);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {uploading ? "Enviando arquivo..." : "Enviar proposta em PDF"}
                    </span>
                    <span className="text-xs text-muted-foreground">Somente PDF, até 15 MB.</span>
                  </label>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch checked={form.active ?? true} onCheckedChange={(v) => set("active", v)} />
                <span className="text-sm text-foreground">Produto ativo no catálogo</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  Voltar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Salvar alterações" : "Cadastrar produto"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
              <AlertDialogDescription>
                “{deleting?.name}” será removido do catálogo e deixará de ser oferecido pelo SDR.
                O histórico de vendas já registrado é preservado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleting) await remove(deleting.id);
                  setDeleting(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export function SDRProductCatalogTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="gap-2">
      <DollarSign className="h-4 w-4" /> Catálogo comercial
    </Button>
  );
}
