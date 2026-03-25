import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

interface ReportEmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
  icon?: React.ReactNode;
}

export function ReportEmptyState({ title, description, actionLabel, actionLink, icon }: ReportEmptyStateProps) {
  return (
    <Card className="bg-card border-border/50 rounded-xl">
      <CardContent className="py-16 px-6 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          {icon || <BarChart3 size={28} className="text-muted-foreground/40" />}
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={actionLink}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}