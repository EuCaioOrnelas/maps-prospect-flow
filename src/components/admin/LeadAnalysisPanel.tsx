import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Phone,
  Users,
  XCircle,
} from "lucide-react";

interface CampaignLead {
  phone?: string;
  name?: string;
  company_name?: string;
  contact_name?: string;
  [key: string]: unknown;
}

interface LeadIssue {
  type: "error" | "warning" | "info";
  message: string;
  details: string;
  fix: string;
  affectedLeads?: string[];
}

interface LeadAnalysisPanelProps {
  leads: unknown[];
  campaignId: string;
}

const normalizePhone = (phone: string): string => {
  return phone.replace(/[^0-9]/g, "");
};

const analyzeLeads = (rawLeads: unknown[]): { issues: LeadIssue[]; stats: Record<string, number> } => {
  const issues: LeadIssue[] = [];
  const stats = {
    total: rawLeads.length,
    validPhones: 0,
    invalidPhones: 0,
    missingPhones: 0,
    missingNames: 0,
    duplicatePhones: 0,
    shortPhones: 0,
    noCountryCode: 0,
    no9thDigit: 0,
    hasSpecialChars: 0,
    groupNumbers: 0,
  };

  if (rawLeads.length === 0) {
    issues.push({
      type: "error",
      message: "Campanha sem leads",
      details: "A lista de leads está vazia. A campanha não tem contatos para enviar mensagens.",
      fix: "O usuário precisa cancelar e recriar a campanha adicionando leads.",
    });
    return { issues, stats };
  }

  const leads = rawLeads as CampaignLead[];
  const phoneMap = new Map<string, number>();
  const invalidPhoneExamples: string[] = [];
  const missingPhoneExamples: string[] = [];
  const missingNameExamples: string[] = [];
  const shortPhoneExamples: string[] = [];
  const noCountryCodeExamples: string[] = [];
  const no9thDigitExamples: string[] = [];
  const specialCharExamples: string[] = [];
  const groupNumberExamples: string[] = [];
  const duplicateExamples: string[] = [];

  leads.forEach((lead, idx) => {
    const leadLabel = lead.name || lead.contact_name || lead.company_name || `Lead #${idx + 1}`;

    // Check for missing phone
    if (!lead.phone || String(lead.phone).trim() === "") {
      stats.missingPhones++;
      if (missingPhoneExamples.length < 5) missingPhoneExamples.push(leadLabel);
      return;
    }

    const rawPhone = String(lead.phone).trim();
    const cleanPhone = normalizePhone(rawPhone);

    // Check for group numbers (@g.us or @lid)
    if (rawPhone.includes("@g.us") || rawPhone.includes("@lid")) {
      stats.groupNumbers++;
      if (groupNumberExamples.length < 5) groupNumberExamples.push(`${leadLabel}: ${rawPhone}`);
      return;
    }

    // Check for special characters (besides +, -, spaces, parens)
    if (/[^0-9+\-\s().]/.test(rawPhone)) {
      stats.hasSpecialChars++;
      if (specialCharExamples.length < 5) specialCharExamples.push(`${leadLabel}: "${rawPhone}"`);
    }

    // Check phone length
    if (cleanPhone.length < 10) {
      stats.shortPhones++;
      stats.invalidPhones++;
      if (shortPhoneExamples.length < 5) shortPhoneExamples.push(`${leadLabel}: ${rawPhone} (${cleanPhone.length} dígitos)`);
      return;
    }

    // Check country code
    if (!cleanPhone.startsWith("55") && cleanPhone.length <= 11) {
      stats.noCountryCode++;
      if (noCountryCodeExamples.length < 5) noCountryCodeExamples.push(`${leadLabel}: ${rawPhone}`);
    }

    // Check 9th digit for Brazilian mobiles
    const phoneForCheck = cleanPhone.startsWith("55") ? cleanPhone.substring(2) : cleanPhone;
    if (phoneForCheck.length === 10) {
      const firstDigit = phoneForCheck.charAt(2);
      if (["6", "7", "8", "9"].includes(firstDigit)) {
        stats.no9thDigit++;
        if (no9thDigitExamples.length < 5) no9thDigitExamples.push(`${leadLabel}: ${rawPhone} (falta o 9)`);
      }
    }

    // Valid phone check
    if (cleanPhone.length >= 12 && cleanPhone.length <= 13) {
      stats.validPhones++;
    } else if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      // Acceptable but missing country code
      stats.validPhones++;
    } else {
      stats.invalidPhones++;
      if (invalidPhoneExamples.length < 5) invalidPhoneExamples.push(`${leadLabel}: ${rawPhone} (${cleanPhone.length} dígitos)`);
    }

    // Duplicate check
    const phoneKey = cleanPhone.slice(-8);
    const count = (phoneMap.get(phoneKey) || 0) + 1;
    phoneMap.set(phoneKey, count);

    // Check missing name
    if (!lead.name && !lead.contact_name && !lead.company_name) {
      stats.missingNames++;
      if (missingNameExamples.length < 5) missingNameExamples.push(`Lead com tel: ${rawPhone}`);
    }
  });

  // Count duplicates
  phoneMap.forEach((count, phone) => {
    if (count > 1) {
      stats.duplicatePhones += count - 1;
      if (duplicateExamples.length < 5) duplicateExamples.push(`...${phone} (${count}x)`);
    }
  });

  // Build issues

  if (stats.missingPhones > 0) {
    issues.push({
      type: "error",
      message: `${stats.missingPhones} lead(s) sem telefone`,
      details: "Leads sem número de telefone não podem receber mensagens. Provavelmente a planilha importada não tem a coluna 'phone' ou está com nome diferente.",
      fix: "O modelo correto da planilha deve ter a coluna 'phone' (obrigatória). Verificar se o usuário renomeou ou removeu essa coluna.",
      affectedLeads: missingPhoneExamples,
    });
  }

  if (stats.shortPhones > 0) {
    issues.push({
      type: "error",
      message: `${stats.shortPhones} telefone(s) com poucos dígitos`,
      details: "Telefones com menos de 10 dígitos são inválidos e não serão enviados. Formato esperado: 55 + DDD (2) + 9 + Número (8) = 13 dígitos.",
      fix: "Verificar se os telefones na planilha estão completos. Formato correto: 5511999998888. O Excel pode ter cortado zeros à esquerda se a coluna estiver como 'Número'.",
      affectedLeads: shortPhoneExamples,
    });
  }

  if (stats.noCountryCode > 0) {
    issues.push({
      type: "warning",
      message: `${stats.noCountryCode} telefone(s) sem código do país (55)`,
      details: "Telefones sem o código '55' na frente. O sistema tenta adicionar automaticamente, mas pode causar erros em alguns casos.",
      fix: "Recomendado: todos os telefones devem começar com 55. Ex: 5511999998888. Se importou de planilha, adicionar '55' no início de todos.",
      affectedLeads: noCountryCodeExamples,
    });
  }

  if (stats.no9thDigit > 0) {
    issues.push({
      type: "warning",
      message: `${stats.no9thDigit} telefone(s) possivelmente sem o 9º dígito`,
      details: "Celulares brasileiros devem ter 9 dígitos após o DDD. Detectados números com apenas 8 dígitos após DDD, o que indica falta do 9 inicial.",
      fix: "O sistema normaliza automaticamente, mas confirme se os números estão corretos. Formato: 55 + DDD + 9 + 8 dígitos.",
      affectedLeads: no9thDigitExamples,
    });
  }

  if (stats.hasSpecialChars > 0) {
    issues.push({
      type: "warning",
      message: `${stats.hasSpecialChars} telefone(s) com caracteres especiais`,
      details: "Telefones contêm letras ou símbolos inesperados. Isso pode causar falhas no envio.",
      fix: "A planilha deve conter apenas números na coluna de telefone. Remover caracteres como letras, vírgulas, pontos e vírgulas, etc.",
      affectedLeads: specialCharExamples,
    });
  }

  if (stats.groupNumbers > 0) {
    issues.push({
      type: "error",
      message: `${stats.groupNumbers} número(s) de grupo detectado(s)`,
      details: "Foram encontrados identificadores de grupos do WhatsApp (@g.us/@lid) na lista de leads. Campanhas só funcionam com números individuais.",
      fix: "Remover todos os contatos que são grupos. A planilha deve conter apenas números de celular individuais.",
      affectedLeads: groupNumberExamples,
    });
  }

  if (stats.invalidPhones > 0 && stats.invalidPhones !== stats.shortPhones) {
    const extraInvalid = stats.invalidPhones - stats.shortPhones;
    if (extraInvalid > 0) {
      issues.push({
        type: "error",
        message: `${extraInvalid} telefone(s) com formato inválido`,
        details: "Telefones com quantidade de dígitos fora do esperado (10-13 dígitos para números brasileiros).",
        fix: "Verificar a formatação da planilha. A coluna de telefone deve estar como 'Texto' no Excel, não como 'Número' (isso pode truncar zeros).",
        affectedLeads: invalidPhoneExamples,
      });
    }
  }

  if (stats.duplicatePhones > 0) {
    issues.push({
      type: "warning",
      message: `${stats.duplicatePhones} telefone(s) duplicado(s)`,
      details: "Existem números repetidos na lista de leads. O sistema tentará enviar para todos, causando envio duplicado para o mesmo contato.",
      fix: "Remover duplicatas da planilha antes de importar. Use a função 'Remover Duplicatas' do Excel na coluna de telefone.",
      affectedLeads: duplicateExamples,
    });
  }

  if (stats.missingNames > 0) {
    const pct = Math.round((stats.missingNames / stats.total) * 100);
    issues.push({
      type: pct > 50 ? "warning" : "info",
      message: `${stats.missingNames} lead(s) sem nome (${pct}%)`,
      details: "Leads sem nome/empresa identificados. As variáveis {nome} e {empresa} nas mensagens ficarão vazias para esses contatos.",
      fix: "Se as mensagens usam variáveis de personalização, a planilha deve ter as colunas 'name' ou 'contact_name' e 'company_name' preenchidas.",
      affectedLeads: missingNameExamples,
    });
  }

  // Check for wrong column structure
  if (leads.length > 0) {
    const firstLead = leads[0];
    const keys = Object.keys(firstLead);
    const expectedKeys = ["phone", "name", "company_name", "contact_name"];
    const hasExpectedKeys = expectedKeys.some((k) => keys.includes(k));

    if (!hasExpectedKeys) {
      issues.push({
        type: "error",
        message: "Estrutura da planilha incorreta",
        details: `As colunas encontradas foram: ${keys.join(", ")}. Nenhuma coluna esperada (phone, name, company_name, contact_name) foi encontrada.`,
        fix: "O modelo da planilha deve ter pelo menos a coluna 'phone'. Outras colunas recomendadas: 'name', 'company_name', 'contact_name'. Verificar se o usuário usou nomes de colunas diferentes (ex: 'telefone' ao invés de 'phone').",
      });
    }

    // Check if phone column might have a different name
    const phoneAliases = ["telefone", "tel", "celular", "whatsapp", "numero", "número", "fone"];
    const foundAlias = keys.find((k) => phoneAliases.includes(k.toLowerCase()));
    if (foundAlias && !keys.includes("phone")) {
      issues.push({
        type: "error",
        message: `Coluna de telefone com nome errado: "${foundAlias}"`,
        details: `A planilha usa "${foundAlias}" ao invés de "phone". O sistema espera a coluna chamada exatamente "phone".`,
        fix: `Renomear a coluna "${foundAlias}" para "phone" na planilha e reimportar.`,
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      type: "info",
      message: `Todos os ${stats.total} leads parecem válidos`,
      details: `${stats.validPhones} telefones válidos detectados. Nenhum problema de formato encontrado.`,
      fix: "",
    });
  }

  return { issues, stats };
};

export const LeadAnalysisPanel = ({ leads, campaignId }: LeadAnalysisPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  const { issues, stats } = analyzeLeads(leads);
  const hasErrors = issues.some((i) => i.type === "error");
  const hasWarnings = issues.some((i) => i.type === "warning");

  return (
    <div className={`rounded-lg border p-3 ${
      hasErrors
        ? "border-destructive/30 bg-destructive/5"
        : hasWarnings
        ? "border-yellow-500/30 bg-yellow-500/5"
        : "border-green-500/30 bg-green-500/5"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileSpreadsheet size={14} />
          <span>Análise de Leads</span>
          <Badge variant="outline" className="text-xs gap-1">
            <Users size={10} />
            {stats.total}
          </Badge>
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              {issues.filter((i) => i.type === "error").length} erro(s)
            </Badge>
          )}
          {hasWarnings && (
            <Badge variant="secondary" className="text-xs">
              {issues.filter((i) => i.type === "warning").length} alerta(s)
            </Badge>
          )}
          {!hasErrors && !hasWarnings && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
              OK
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-muted/40 rounded-lg p-2">
              <span className="text-muted-foreground">Total de leads</span>
              <p className="font-semibold">{stats.total}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <span className="text-muted-foreground">Telefones válidos</span>
              <p className="font-semibold text-green-600">{stats.validPhones}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <span className="text-muted-foreground">Telefones inválidos</span>
              <p className="font-semibold text-destructive">{stats.invalidPhones + stats.missingPhones}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <span className="text-muted-foreground">Sem nome</span>
              <p className="font-semibold text-muted-foreground">{stats.missingNames}</p>
            </div>
          </div>

          {/* Issues */}
          <div className="space-y-2">
            {issues.map((issue, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${
                  issue.type === "error"
                    ? "bg-destructive/10 border border-destructive/30"
                    : issue.type === "warning"
                    ? "bg-yellow-500/10 border border-yellow-500/30"
                    : "bg-green-500/10 border border-green-500/30"
                }`}
              >
                <div className={`flex items-center gap-2 font-medium ${
                  issue.type === "error"
                    ? "text-destructive"
                    : issue.type === "warning"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
                }`}>
                  {issue.type === "error" ? (
                    <XCircle size={14} />
                  ) : issue.type === "warning" ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>{issue.message}</span>
                </div>
                <div className="mt-2 ml-5 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Detalhes:</strong> {issue.details}
                  </p>
                  {issue.fix && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Como resolver:</strong> {issue.fix}
                    </p>
                  )}
                  {issue.affectedLeads && issue.affectedLeads.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground font-medium">Exemplos:</p>
                      <ul className="text-xs text-muted-foreground ml-3 mt-0.5 space-y-0.5">
                        {issue.affectedLeads.map((lead, j) => (
                          <li key={j} className="font-mono">• {lead}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
