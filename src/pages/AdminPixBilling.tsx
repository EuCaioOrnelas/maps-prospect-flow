import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Mail, FlaskConical } from "lucide-react";
import { PixDashboardTab } from "@/components/admin/pix-billing/PixDashboardTab";
import { PixInvoicesTab } from "@/components/admin/pix-billing/PixInvoicesTab";
import { PixEmailTemplatesTab } from "@/components/admin/pix-billing/PixEmailTemplatesTab";
import { PixTestsTrackingTab } from "@/components/admin/pix-billing/PixTestsTrackingTab";

const AdminPixBilling = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-sans">Billing PIX / Renovação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestão completa de cobranças PIX, renovações e emails
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 size={14} /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
            <FileText size={14} /> Faturas
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5 text-xs sm:text-sm">
            <Mail size={14} /> Emails
          </TabsTrigger>
          <TabsTrigger value="tests" className="gap-1.5 text-xs sm:text-sm">
            <FlaskConical size={14} /> Testes / Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <PixDashboardTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <PixInvoicesTab />
        </TabsContent>
        <TabsContent value="emails" className="mt-6">
          <PixEmailTemplatesTab />
        </TabsContent>
        <TabsContent value="tests" className="mt-6">
          <PixTestsTrackingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPixBilling;
