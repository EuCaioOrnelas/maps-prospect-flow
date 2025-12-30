import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  CalendarIcon, 
  Clock, 
  Zap,
  CalendarClock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CampaignSchedulerProps {
  isScheduled: boolean;
  onScheduleChange: (scheduled: boolean) => void;
  scheduledDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  scheduledTime: string;
  onTimeChange: (time: string) => void;
}

export const CampaignScheduler = ({
  isScheduled,
  onScheduleChange,
  scheduledDate,
  onDateChange,
  scheduledTime,
  onTimeChange
}: CampaignSchedulerProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const getMinDate = () => {
    const now = new Date();
    return now;
  };

  const isValidSchedule = () => {
    if (!isScheduled) return true;
    if (!scheduledDate || !scheduledTime) return false;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);
    
    return scheduled > new Date();
  };

  const getScheduledDateTime = () => {
    if (!scheduledDate || !scheduledTime) return null;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);
    
    return scheduled;
  };

  return (
    <div className="space-y-4">
      {/* Schedule Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarClock size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-medium">Agendar envio</p>
            <p className="text-sm text-muted-foreground">
              Programar para uma data/hora específica
            </p>
          </div>
        </div>
        <Switch
          checked={isScheduled}
          onCheckedChange={onScheduleChange}
        />
      </div>

      {isScheduled ? (
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon size={14} />
                Data
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => {
                      onDateChange(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < getMinDate()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock size={14} />
                Horário
              </Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {scheduledDate && scheduledTime && (
            <div className={cn(
              "p-3 rounded-lg text-sm flex items-center gap-2",
              isValidSchedule() 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
            )}>
              <CalendarClock size={16} />
              {isValidSchedule() ? (
                <span>
                  Campanha será iniciada em{" "}
                  <strong>
                    {format(getScheduledDateTime()!, "PPP 'às' HH:mm", { locale: ptBR })}
                  </strong>
                </span>
              ) : (
                <span>O horário selecionado já passou. Escolha um horário futuro.</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm flex items-center gap-2 text-muted-foreground">
          <Zap size={16} className="text-primary" />
          <span>A campanha será iniciada imediatamente após confirmar</span>
        </div>
      )}
    </div>
  );
};
