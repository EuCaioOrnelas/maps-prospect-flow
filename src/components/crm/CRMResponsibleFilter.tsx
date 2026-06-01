import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import type { ResponsibleMember } from "./ResponsibleAvatar";

export type ResponsibleFilter = "me" | "all" | string;

interface Props {
  value: ResponsibleFilter;
  onChange: (v: ResponsibleFilter) => void;
  members: ResponsibleMember[];
  currentUserId: string | null;
}

export function CRMResponsibleFilter({ value, onChange, members, currentUserId }: Props) {
  const others = members.filter((m) => m.user_id !== currentUserId);
  return (
    <div className="flex items-center gap-1.5">
      <Users className="w-3.5 h-3.5 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 sm:h-9 w-[150px] bg-card/60 border-border/60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="me">Eu</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
          {others.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.name || m.email || m.user_id.slice(0, 8)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
