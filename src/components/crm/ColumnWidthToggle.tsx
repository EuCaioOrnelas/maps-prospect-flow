import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Columns2, Columns3, Columns4 } from 'lucide-react';
import { type ColumnWidth } from './KanbanColumn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ColumnWidthToggleProps {
  value: ColumnWidth;
  onChange: (value: ColumnWidth) => void;
}

const COLUMN_WIDTH_OPTIONS: { value: ColumnWidth; label: string; icon: typeof Columns2 }[] = [
  { value: 'compact', label: 'Compacta', icon: Columns4 },
  { value: 'medium', label: 'Média', icon: Columns3 },
  { value: 'large', label: 'Larga', icon: Columns2 },
];

export const ColumnWidthToggle = ({ value, onChange }: ColumnWidthToggleProps) => {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as ColumnWidth);
          }
        }}
        className="border border-border rounded-lg p-0.5 bg-muted/30"
      >
        {COLUMN_WIDTH_OPTIONS.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={option.value}
                aria-label={option.label}
                className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <option.icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{option.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
};
