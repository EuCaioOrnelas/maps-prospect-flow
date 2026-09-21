import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCheck,
  Globe,
  LayoutDashboard,
  Link2,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

const VIEW = { once: true, amount: 0.3 } as const;

const FIELDS = [
  { label: "Nome completo", value: "Marina Oliveira", icon: UserCheck },
  { label: "E-mail profissional", value: "marina@empresa.com.br", icon: Mail },
  { label: "Empresa", value: "Oliveira Distribuidora", icon: Building2 },
];

/**
 * Réplica animada de um formulário Wiize publicado: endereço rastreado,
 * capa com a marca do cliente, campos preenchidos e o lead chegando no CRM.
 * Usada na página de vendas, na página do produto e nos cards de produtos.
 */
export const FormsMockup = () => (
  <div className="space-y-2">
    {/* Endereço com a origem da campanha */}
    <div className="flex items-center gap-2 rounded-card border border-border/60 bg-background/80 px-2.5 py-1.5">
      <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
      <p className="truncate text-[10px] text-muted-foreground">
        suaempresa.com.br/proposta
        <span className="text-primary/80">?utm_source=google&amp;utm_campaign=demo</span>
      </p>
      <ShieldCheck className="ml-auto h-3.5 w-3.5 shrink-0 text-primary/70" />
    </div>

    {/* Página do formulário */}
    <div className="overflow-hidden rounded-card border border-border/60 bg-card">
      <div className="relative h-9 overflow-hidden bg-primary/15">
        <motion.div
          aria-hidden
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        />
      </div>
      <div className="-mt-4 flex items-center gap-2 px-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-card border border-border/60 bg-background text-[10px] font-extrabold text-primary shadow-sm">
          SL
        </span>
        <div className="pt-3">
          <p className="text-[11px] font-semibold leading-none text-foreground">Sua Logo Aqui</p>
          <p className="mt-1 text-[9px] text-muted-foreground">Peça uma demonstração</p>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEW}
          className="ml-auto pt-3 text-[10px] font-bold text-primary"
        >
          67%
        </motion.span>
      </div>
      <div className="px-3 pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: "8%" }}
            whileInView={{ width: "67%" }}
            viewport={VIEW}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>
      <div className="space-y-1.5 p-3 pt-2.5">
        {FIELDS.map((field, index) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEW}
            transition={{ delay: 0.25 + index * 0.18, duration: 0.35 }}
            className="rounded-hover border border-border/60 bg-background/70 px-2.5 py-1.5"
          >
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground">{field.label}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <field.icon className="h-3 w-3 shrink-0 text-primary/70" />
              <p className="truncate text-[10px] font-medium text-foreground">{field.value}</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEW}
          transition={{ delay: 0.85 }}
          className="flex items-start gap-1.5 pt-0.5"
        >
          <span className="mt-[1px] flex h-3 w-3 items-center justify-center rounded-[3px] bg-primary">
            <Check className="h-2 w-2 text-primary-foreground" strokeWidth={4} />
          </span>
          <p className="text-[8.5px] leading-snug text-muted-foreground">
            Concordo com o uso dos meus dados para contato (LGPD).
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEW}
          transition={{ delay: 0.95 }}
          className="mt-1.5 flex h-8 items-center justify-center gap-1.5 rounded-hover bg-primary text-[11px] font-bold text-primary-foreground"
        >
          Enviar e falar com um especialista
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.span>
        </motion.div>
      </div>
    </div>

    {/* Rastreio e destino */}
    <div className="grid grid-cols-2 gap-2">
      {[
        { icon: Link2, label: "Origem rastreada", value: "Google Ads · demo" },
        { icon: LayoutDashboard, label: "Destino", value: "CRM Wiize" },
      ].map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEW}
          transition={{ delay: 1.05 + index * 0.12 }}
          className="flex items-center gap-2 rounded-card border border-border/60 bg-background/70 p-2.5"
        >
          <item.icon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[9px] text-muted-foreground">{item.label}</p>
            <p className="truncate text-[11px] font-semibold text-foreground">{item.value}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={{ delay: 1.3 }}
      className="flex items-center gap-2 rounded-card bg-primary/10 p-3 text-[11px] font-semibold text-primary"
    >
      <motion.span
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex"
      >
        <CheckCheck className="h-4 w-4" />
      </motion.span>
      Lead recebido com respostas, arquivos e origem
    </motion.div>
  </div>
);

export default FormsMockup;
