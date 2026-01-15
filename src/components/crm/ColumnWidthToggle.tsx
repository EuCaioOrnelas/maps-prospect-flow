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
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="compact"
              aria-label="Compacta"
              className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Columns4 className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Compacta</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="medium"
              aria-label="Média"
              className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Columns3 className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Média</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value="large"
              aria-label="Larga"
              className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Columns2 className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Larga</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  );
};
