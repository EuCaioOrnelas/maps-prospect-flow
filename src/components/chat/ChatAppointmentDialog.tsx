import { useMemo } from "react";
import { toast } from "sonner";
import { EventDialog } from "@/components/agenda/EventDialog";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useCalendarEvents, type CalendarEventInput } from "@/hooks/useCalendarEvents";

interface ChatAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string | null;
  contactPhone: string;
  currentUserId: string;
  leadId?: string | null;
}

/**
 * Cria um compromisso da Agenda já com os dados do contato do Chat preenchidos.
 */
export function ChatAppointmentDialog({
  open, onOpenChange, contactName, contactPhone, currentUserId, leadId = null,
}: ChatAppointmentDialogProps) {
  const { members } = useAccountMembers();
  const { role } = useAccountRole();

  const range = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 90);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { createEvent } = useCalendarEvents({ from: range.from, to: range.to, userFilter: currentUserId });

  const prefill = useMemo(
    () => ({
      title: contactName ? `Reunião com ${contactName}` : "Reunião com contato do WhatsApp",
      contact_name: contactName || "",
      contact_phone: contactPhone,
      lead_id: leadId,
      category: "comercial" as const,
    }),
    [contactName, contactPhone, leadId],
  );

  const handleSave = async (input: CalendarEventInput & { id?: string }) => {
    const { id: _ignored, ...rest } = input;
    await createEvent.mutateAsync(rest);
    toast.success("Compromisso criado na sua agenda.");
    onOpenChange(false);
  };

  return (
    <EventDialog
      open={open}
      onOpenChange={onOpenChange}
      event={null}
      members={members}
      currentUserId={currentUserId}
      canChooseResponsible={role === "owner" || role === "admin"}
      saving={createEvent.isPending}
      onSave={handleSave}
      prefill={prefill}
    />
  );
}
