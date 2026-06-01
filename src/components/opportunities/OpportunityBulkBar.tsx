import { useState } from "react";
import { Users, Archive, X, Loader2, UserCog, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { ResponsibleMember } from "@/components/crm/ResponsibleAvatar";

interface Props {
  selectedCount: number;
  totalVisible: number;
  onSelectAllVisible: () => void;
  onClear: () => void;
  onChangeResponsible: (userId: string | null) => Promise<void>;
  onArchive: () => Promise<void>;
  onMarkSent?: () => Promise<void>;
  members: ResponsibleMember[];
  canChangeResponsible: boolean;
}

export function OpportunityBulkBar({
  selectedCount,
  totalVisible,
  onSelectAllVisible,
  onClear,
  onChangeResponsible,
  onArchive,
  onMarkSent,
  members,
  canChangeResponsible,
}: Props) {
  const [busy, setBusy] = useState<"resp" | "arch" | "sent" | null>(null);
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-2 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/95 px-3 py-2 shadow-md backdrop-blur">
      <span className="text-sm font-medium">
        {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
      </span>
      <Button size="sm" variant="ghost" onClick={onSelectAllVisible} className="h-7 text-xs">
        Selecionar todos visíveis ({totalVisible})
      </Button>
      <div className="ml-auto flex items-center gap-2">
        {canChangeResponsible && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={busy !== null}>
                {busy === "resp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCog className="h-3.5 w-3.5" />}
                Responsável
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-1" align="end">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                Transferir para
              </div>
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted text-muted-foreground"
                onClick={async () => { setBusy("resp"); try { await onChangeResponsible(null); } finally { setBusy(null); } }}
              >
                Sem responsável
              </button>
              <div className="max-h-56 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.user_id}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted"
                    onClick={async () => { setBusy("resp"); try { await onChangeResponsible(m.user_id); } finally { setBusy(null); } }}
                  >
                    {m.name || m.email || m.user_id.slice(0, 8)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          disabled={busy !== null}
          onClick={async () => { setBusy("arch"); try { await onArchive(); } finally { setBusy(null); } }}
        >
          {busy === "arch" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
          Arquivar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} className="h-8 gap-1.5">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
