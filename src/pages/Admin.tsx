import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  BarChart3,
  LogOut,
  ArrowLeft,
  Loader2,
  Crown,
  TrendingUp,
  Activity,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  Server,
  Zap,
  Calendar,
  CheckCircle2,
  XCircle,
  Key,
  LayoutDashboard,
  Bug,
  Bell,
  FlaskConical,
  Mail,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Menu,
  Receipt,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SubscriptionEventsLog } from "@/components/admin/SubscriptionEventsLog";
import { PhoneCleanupTool } from "@/components/admin/PhoneCleanupTool";
import { TermsAcceptanceLog } from "@/components/admin/TermsAcceptanceLog";
import { AgentsMonitorPanel } from "@/components/admin/AgentsMonitorPanel";

import { CampaignDebugPanel } from "@/components/admin/CampaignDebugPanel";
import { ProxyManagerPanel } from "@/components/admin/ProxyManagerPanel";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserActionsMenu } from "@/components/admin/UserActionsMenu";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";

// Função para verificar admin via banco de dados (seguro)
// Preços dos planos (fallback caso Stripe falhe)
const PLAN_PRICES: { [key: string]: number } = {
  free: 0,
  start: 197,
  growth: 497,
  scale: 897,
};

// Função para verificar admin via banco de dados (seguro)
const checkIsAdmin = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_current_user_admin');
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return data === true;
};

const PLAN_COLORS: { [key: string]: string } = {
  free: '#6b7280',
  start: '#3b82f6',
  growth: '#8b5cf6',
  scale: '#f59e0b',
};

const monthKeyToLocalDate = (monthKey: string) => {
  const [y, m] = monthKey.split('-');
  return new Date(Number(y), Number(m) - 1, 1);
};

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  searches_used: number;
  searches_limit: number;
  plan: string;
  created_at: string;
  updated_at: string;
  is_blocked?: boolean;
  payment_provider?: string | null;
}

const getProviderFromSessionId = (sessionId?: string | null) => {
  if (!sessionId) return null;
  if (sessionId.startsWith('asaas_')) return 'asaas';
  if (sessionId.startsWith('abacate_')) return 'abacate_pay';
  return 'stripe';
};

interface StripeMRRData {
  totalMRR: number;
  activeSubscriptions: number;
  totalRefunded: number;
  refundCount: number;
  canceledSubscriptions: number;
  churnRate: number;
  totalSalesValue?: number;
  totalSalesCount?: number;
  totalNewSales?: number;
  monthlyMRR: Array<{ month: string; mrr: number; activeCount?: number }>;
  monthlyRefunds?: Array<{ month: string; amount: number; count: number }>;
  monthlySales?: Array<{ month: string; newSales: number; salesValue: number; cancellations: number }>;
}

interface PixMRRData {
  pixMrr: number;
  pixActiveSubscriptions: number;
  pixSalesThisMonth: number;
  pixSalesValueThisMonth: number;
  pixCancellations: number;
  pixMonthlySales: Array<{ month: string; sales: number; salesValue: number; cancellations: number }>;
  pixMonthlyMRR: Array<{ month: string; mrr: number; activeCount: number }>;
}

interface SalesChartData {
  month: string;
  newSales: number;
  upgrades: number;
  cancellations: number;
  salesValue: number;
  refundValue: number;
  refundCount: number;
}

type ChartPeriodFilter = '1m' | '3m' | '6m' | '12m' | 'year' | 'all' | 'custom';

interface Stats {
  totalUsers: number;
  totalSearches: number;
  activeUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
  mrr: number;
  activationRate: number;
  payingUsers: number;
}

interface PeriodStats {
  usersInPeriod: number;
  searchesInPeriod: number;
  activeUsersInPeriod: number;
  conversionRateInPeriod: number;
  activatedInPeriod: number;
  purchasesInPeriod: number;
  usedAIInPeriod: number;
  createdCampaignInPeriod: number;
  checkoutStartedInPeriod: number;
  checkoutNotCompletedInPeriod: number;
}

interface ApiKeyStatus {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'unknown' | 'exhausted' | 'not_configured';
  message: string;
}

interface ApiStatus {
  serpApi: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    lastCheck: Date;
    errorCount: number;
    keys: ApiKeyStatus[];
  };
  evolutionApi: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    lastCheck: Date;
    errorCount: number;
  };
}

const Admin = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [pixMRR, setPixMRR] = useState<PixMRRData | null>(null);
  const [loadingMRR, setLoadingMRR] = useState(false);
  const [stripeMRRError, setStripeMRRError] = useState<string | null>(null);
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
  const [allSalesEvents, setAllSalesEvents] = useState<any[]>([]);
  const [loadingSalesChart, setLoadingSalesChart] = useState(false);
  const [chartPeriodFilter, setChartPeriodFilter] = useState<ChartPeriodFilter>('6m');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    serpApi: { 
      status: 'ok', 
      message: 'Funcionando normalmente', 
      lastCheck: new Date(), 
      errorCount: 0,
      keys: [
        { name: 'Chave 1 (Principal)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 2 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 3 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 4 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 5 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 6 (Backup)', status: 'unknown', message: 'Não verificada' },
      ]
    },
    evolutionApi: { status: 'ok', message: 'Funcionando normalmente', lastCheck: new Date(), errorCount: 0 },
  });
  const [revenueHistory, setRevenueHistory] = useState<{ date: string; mrr: number; users: number }[]>([]);
  const [checkingApis, setCheckingApis] = useState(false);
  
  // User table states - pagination and filters
  type UserActivityFilter = 'all' | 'active_7d' | 'active_30d' | 'inactive_30d' | 'checkout_not_completed';
  const [userPlanFilter, setUserPlanFilter] = useState<string>('all');
  const [userActivityFilter, setUserActivityFilter] = useState<UserActivityFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 20;

  // Period date filter for stats cards
  const [statsStartDate, setStatsStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [statsEndDate, setStatsEndDate] = useState<Date>(new Date());
  const [periodStats, setPeriodStats] = useState<PeriodStats>({
    usersInPeriod: 0, searchesInPeriod: 0, activeUsersInPeriod: 0,
    conversionRateInPeriod: 0, activatedInPeriod: 0, purchasesInPeriod: 0,
    usedAIInPeriod: 0, createdCampaignInPeriod: 0, checkoutStartedInPeriod: 0,
    checkoutNotCompletedInPeriod: 0,
  });
  const [checkoutLeadsList, setCheckoutLeadsList] = useState<any[]>([]);

  // Fetch real MRR from Stripe
  const loadStripeMRR = useCallback(async () => {
    setLoadingMRR(true);
    setStripeMRRError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-mrr');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeMRR(data);
    } catch (error) {
      console.error('Error loading Stripe MRR:', error);
      setStripeMRRError(error instanceof Error ? error.message : 'Erro ao carregar MRR');
      setStripeMRR({ totalMRR: 0, activeSubscriptions: 0, totalRefunded: 0, refundCount: 0, canceledSubscriptions: 0, churnRate: 0, monthlyMRR: [] });
    } finally {
      setLoadingMRR(false);
    }
  }, []);

  // Fetch PIX MRR from database
  const loadPixMRR = useCallback(async () => {
    try {
      const planPrices: Record<string, number> = { start: 197, growth: 497, scale: 897 };
      const planNameToKey: Record<string, string> = { 'Wiize Start': 'start', 'Wiize Growth': 'growth', 'Wiize Scale': 'scale' };
      
      // Get PIX user IDs
      const { data: pixInvoiceUsers } = await supabase
        .from("pix_invoices")
        .select("user_id");
      const { data: pixCheckouts } = await supabase
        .from("checkout_leads")
        .select("user_id, plan_attempted, checkout_completed_at, stripe_session_id, checkout_completed")
        .eq("checkout_completed", true)
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_%");
      
      const pixUserIds = new Set<string>();
      for (const p of pixInvoiceUsers || []) if (p.user_id) pixUserIds.add(p.user_id);
      for (const c of pixCheckouts || []) if (c.user_id) pixUserIds.add(c.user_id);
      
      // Get active PIX profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan, subscription_current_period_end, payment_provider")
        .neq("plan", "free")
        .eq("is_blocked", false);
      
      let pixMrrTotal = 0;
      let pixActiveSubs = 0;
      const now = new Date();
      
      for (const p of profiles || []) {
        if (!pixUserIds.has(p.id) && (p as any).payment_provider !== 'abacate_pay' && (p as any).payment_provider !== 'asaas') continue;
        if (p.subscription_current_period_end && new Date(p.subscription_current_period_end) < now) continue;
        pixMrrTotal += planPrices[p.plan] || 0;
        pixActiveSubs++;
      }
      
      // PIX sales this month from pix_invoices
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthInvoices } = await supabase
        .from("pix_invoices")
        .select("amount_cents")
        .eq("status", "paid")
        .gte("paid_at", monthStart);
      
      let pixSalesValue = 0;
      for (const inv of monthInvoices || []) pixSalesValue += (inv.amount_cents || 0) / 100;

      // Also count PIX checkouts completed this month
      const pixCheckoutsThisMonth = (pixCheckouts || []).filter(c => 
        c.checkout_completed_at && new Date(c.checkout_completed_at) >= new Date(monthStart)
      );
      
      // Add checkout values not already in pix_invoices
      for (const c of pixCheckoutsThisMonth) {
        const planKey = planNameToKey[c.plan_attempted] || 'start';
        const userId = c.user_id;
        const hasInvoice = (pixInvoiceUsers || []).some((p: any) => p.user_id === userId);
        if (!hasInvoice) {
          pixSalesValue += planPrices[planKey] || 197;
        }
      }

      // Build PIX monthly sales from BOTH checkout_leads AND pix_invoices
      const pixMonthlySalesMap: Record<string, { sales: number; salesValue: number; cancellations: number }> = {};
      
      // From completed PIX checkouts (initial purchases)
      for (const c of pixCheckouts || []) {
        if (!c.checkout_completed_at) continue;
        const d = new Date(c.checkout_completed_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!pixMonthlySalesMap[key]) pixMonthlySalesMap[key] = { sales: 0, salesValue: 0, cancellations: 0 };
        pixMonthlySalesMap[key].sales++;
        const planKey = planNameToKey[c.plan_attempted] || 'start';
        pixMonthlySalesMap[key].salesValue += planPrices[planKey] || 197;
      }

      // From paid pix_invoices (renewals)
      const { data: allPaidInvoices } = await supabase
        .from("pix_invoices")
        .select("amount_cents, paid_at, user_id")
        .eq("status", "paid")
        .not("paid_at", "is", null);
      
      // Track checkout user+month combos to avoid double counting
      const checkoutKeys = new Set<string>();
      for (const c of pixCheckouts || []) {
        if (!c.checkout_completed_at || !c.user_id) continue;
        const d = new Date(c.checkout_completed_at);
        checkoutKeys.add(`${c.user_id}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      
      for (const inv of allPaidInvoices || []) {
        if (!inv.paid_at) continue;
        const d = new Date(inv.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const userMonthKey = `${inv.user_id}_${key}`;
        // Skip if already counted from checkout_leads for same user+month
        if (checkoutKeys.has(userMonthKey)) continue;
        if (!pixMonthlySalesMap[key]) pixMonthlySalesMap[key] = { sales: 0, salesValue: 0, cancellations: 0 };
        pixMonthlySalesMap[key].sales++;
        pixMonthlySalesMap[key].salesValue += (inv.amount_cents || 0) / 100;
      }

      // PIX cancellations from subscription_events
      const { data: pixCancelEvents } = await supabase
        .from("subscription_events")
        .select("created_at")
        .eq("event_type", "pix_not_renewed");
      
      let pixCancellationsTotal = 0;
      for (const evt of pixCancelEvents || []) {
        const d = new Date(evt.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!pixMonthlySalesMap[key]) pixMonthlySalesMap[key] = { sales: 0, salesValue: 0, cancellations: 0 };
        pixMonthlySalesMap[key].cancellations++;
        pixCancellationsTotal++;
      }

      const pixMonthlySales = Object.entries(pixMonthlySalesMap)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Build historical PIX MRR by reconstructing active PIX users per month
      // Use checkout dates as "start" and churn events as "end"
      const pixUserTimelines: Array<{ userId: string; startMonth: string; endMonth: string | null; planKey: string }> = [];
      
      for (const c of pixCheckouts || []) {
        if (!c.checkout_completed_at || !c.user_id) continue;
        const d = new Date(c.checkout_completed_at);
        const startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const planKey = planNameToKey[c.plan_attempted] || 'start';
        
        // Check if this user churned
        const churnEvent = (pixCancelEvents || []).find((evt: any) => {
          // We don't have user_id in cancel events directly, so skip per-user matching
          return false;
        });
        
        pixUserTimelines.push({ userId: c.user_id, startMonth, endMonth: null, planKey });
      }
      
      // Get PIX cancel events with user_id
      const { data: pixCancelEventsDetailed } = await supabase
        .from("subscription_events")
        .select("created_at, user_id")
        .eq("event_type", "pix_not_renewed");
      
      const churnByUser: Record<string, string> = {};
      for (const evt of pixCancelEventsDetailed || []) {
        if (!evt.user_id) continue;
        const d = new Date(evt.created_at);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        churnByUser[evt.user_id] = month;
      }
      
      // Update timelines with churn data
      for (const tl of pixUserTimelines) {
        if (churnByUser[tl.userId]) {
          tl.endMonth = churnByUser[tl.userId];
        }
      }
      
      // Build monthly MRR from timelines
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const allMonths = new Set<string>();
      // Generate months from earliest checkout to now
      if (pixUserTimelines.length > 0) {
        const earliest = pixUserTimelines.reduce((min, tl) => tl.startMonth < min ? tl.startMonth : min, pixUserTimelines[0].startMonth);
        let [y, m] = earliest.split('-').map(Number);
        const [cy, cm] = currentMonthKey.split('-').map(Number);
        while (y < cy || (y === cy && m <= cm)) {
          allMonths.add(`${y}-${String(m).padStart(2, '0')}`);
          m++;
          if (m > 12) { m = 1; y++; }
        }
      }
      
      const pixMonthlyMRR: Array<{ month: string; mrr: number; activeCount: number }> = [];
      for (const month of [...allMonths].sort()) {
        let mrr = 0;
        let count = 0;
        for (const tl of pixUserTimelines) {
          if (tl.startMonth <= month && (!tl.endMonth || tl.endMonth > month)) {
            mrr += planPrices[tl.planKey] || 197;
            count++;
          }
        }
        if (mrr > 0) {
          pixMonthlyMRR.push({ month, mrr, activeCount: count });
        }
      }
      
      // Ensure current month reflects live data
      const currentIdx = pixMonthlyMRR.findIndex(m => m.month === currentMonthKey);
      if (currentIdx >= 0) {
        pixMonthlyMRR[currentIdx] = { month: currentMonthKey, mrr: pixMrrTotal, activeCount: pixActiveSubs };
      } else if (pixMrrTotal > 0) {
        pixMonthlyMRR.push({ month: currentMonthKey, mrr: pixMrrTotal, activeCount: pixActiveSubs });
      }
      
      setPixMRR({
        pixMrr: pixMrrTotal,
        pixActiveSubscriptions: pixActiveSubs,
        pixSalesThisMonth: (monthInvoices || []).length + pixCheckoutsThisMonth.filter(c => !(pixInvoiceUsers || []).some((p: any) => p.user_id === c.user_id)).length,
        pixSalesValueThisMonth: pixSalesValue,
        pixCancellations: pixCancellationsTotal,
        pixMonthlySales,
        pixMonthlyMRR,
      });
    } catch (error) {
      console.error('Error loading PIX MRR:', error);
    }
  }, []);

  // Fetch sales chart data from subscription_events table
  const loadSalesChartData = useCallback(async () => {
    setLoadingSalesChart(true);
    try {
      // Get all subscription events (we'll filter by period in memory)
      const { data: events, error } = await supabase
        .from('subscription_events')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setAllSalesEvents(events || []);
    } catch (error) {
      console.error('Error loading sales chart data:', error);
      setAllSalesEvents([]);
    } finally {
      setLoadingSalesChart(false);
    }
  }, []);

  // Helper to get date range from filter
  const getFilterDateRange = useCallback((): { startDate: Date; endDate: Date | null } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;
    
    switch (chartPeriodFilter) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStartDate || new Date(2024, 0, 1);
        endDate = customEndDate || now;
        break;
      case 'all':
      default:
        startDate = new Date(2024, 0, 1);
        break;
    }
    return { startDate, endDate };
  }, [chartPeriodFilter, customStartDate, customEndDate]);

  // Process sales events based on period filter
  const processedSalesChartData = useMemo(() => {
    const { startDate, endDate } = getFilterDateRange();

    const monthlyData: { [month: string]: { newSales: number; upgrades: number; cancellations: number; salesValue: number; refundValue: number; refundCount: number } } = {};

    if (stripeMRR?.monthlySales) {
      for (const sale of stripeMRR.monthlySales) {
        const saleDate = monthKeyToLocalDate(sale.month);
        if (saleDate >= startDate && (!endDate || saleDate <= endDate)) {
          if (!monthlyData[sale.month]) {
            monthlyData[sale.month] = { newSales: 0, upgrades: 0, cancellations: 0, salesValue: 0, refundValue: 0, refundCount: 0 };
          }
          monthlyData[sale.month].newSales = sale.newSales;
          monthlyData[sale.month].salesValue = sale.salesValue;
          monthlyData[sale.month].cancellations = sale.cancellations;
        }
      }
    }
    
    if (stripeMRR?.monthlyRefunds) {
      for (const refund of stripeMRR.monthlyRefunds) {
        const refundDate = monthKeyToLocalDate(refund.month);
        if (refundDate >= startDate && (!endDate || refundDate <= endDate)) {
          if (!monthlyData[refund.month]) {
            monthlyData[refund.month] = { newSales: 0, upgrades: 0, cancellations: 0, salesValue: 0, refundValue: 0, refundCount: 0 };
          }
          monthlyData[refund.month].refundValue = refund.amount;
          monthlyData[refund.month].refundCount = refund.count;
        }
      }
    }
    // Merge PIX monthly sales data
    if (pixMRR?.pixMonthlySales) {
      for (const pixSale of pixMRR.pixMonthlySales) {
        const saleDate = monthKeyToLocalDate(pixSale.month);
        if (saleDate >= startDate && (!endDate || saleDate <= endDate)) {
          if (!monthlyData[pixSale.month]) {
            monthlyData[pixSale.month] = { newSales: 0, upgrades: 0, cancellations: 0, salesValue: 0, refundValue: 0, refundCount: 0 };
          }
          monthlyData[pixSale.month].newSales += pixSale.sales;
          monthlyData[pixSale.month].salesValue += pixSale.salesValue;
          monthlyData[pixSale.month].cancellations += pixSale.cancellations;
        }
      }
    }
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [getFilterDateRange, stripeMRR?.monthlyRefunds, stripeMRR?.monthlySales, pixMRR?.pixMonthlySales]);

  // Process churn data by reason
  const churnByReasonData = useMemo(() => {
    if (!allSalesEvents.length) return [];

    const { startDate, endDate } = getFilterDateRange();

    const filteredEvents = allSalesEvents.filter(event => {
      const eventDate = new Date(event.created_at);
      return eventDate >= startDate && (!endDate || eventDate <= endDate);
    });

    const churnReasons: { [key: string]: number } = {
      canceled: 0,
      deleted: 0,
      past_due: 0,
      unpaid: 0,
      downgraded_to_free: 0,
      pix_not_renewed: 0,
    };

    for (const event of filteredEvents) {
      const eventType = event.event_type?.toLowerCase() || '';
      const newPlan = event.new_plan?.toLowerCase();
      const source = event.event_source?.toLowerCase() || '';
      
      if (eventType === 'subscription_canceled') {
        churnReasons.canceled++;
      } else if (eventType === 'subscription_deleted') {
        churnReasons.deleted++;
      } else if (eventType === 'subscription_past_due') {
        churnReasons.past_due++;
      } else if (eventType === 'subscription_unpaid') {
        churnReasons.unpaid++;
      } else if (eventType === 'subscription_updated' && newPlan === 'free') {
        if (source === 'abacate_pay' || source === 'asaas' || source === 'pix') {
          churnReasons.pix_not_renewed++;
        } else {
          churnReasons.downgraded_to_free++;
        }
      } else if (eventType === 'pix_not_renewed' || eventType === 'pix_expired') {
        churnReasons.pix_not_renewed++;
      }
    }

    const churnData = [
      { name: 'Cancelado (Stripe)', value: churnReasons.canceled, color: '#ef4444' },
      { name: 'Deletado', value: churnReasons.deleted, color: '#f97316' },
      { name: 'Downgrade p/ Free', value: churnReasons.downgraded_to_free, color: '#a855f7' },
      { name: 'PIX Não Renovado', value: churnReasons.pix_not_renewed, color: '#10b981' },
      { name: 'Pagamento Atrasado', value: churnReasons.past_due, color: '#eab308' },
      { name: 'Não Pago', value: churnReasons.unpaid, color: '#6b7280' },
    ].filter(item => item.value > 0);

    return churnData;
  }, [allSalesEvents, getFilterDateRange]);

  // Filter MRR data by period
  const filteredMRRData = useMemo(() => {
    if (!stripeMRR?.monthlyMRR?.length) return [];

    const { startDate, endDate } = getFilterDateRange();

    return stripeMRR.monthlyMRR.filter(item => {
      const itemDate = monthKeyToLocalDate(item.month);
      return itemDate >= startDate && (!endDate || itemDate <= endDate);
    });
  }, [stripeMRR?.monthlyMRR, getFilterDateRange]);

  const mrrChartData = useMemo(() => {
    if (!filteredMRRData.length) return [];

    const currentTotalMrr = (stripeMRR?.totalMRR ?? 0) + (pixMRR?.pixMrr ?? 0);
    const currentTotalActive = (stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0);
    const latestMonthKey = filteredMRRData[filteredMRRData.length - 1]?.month;

    // Build maps of PIX monthly MRR and active counts for merging
    const pixMrrMap: Record<string, number> = {};
    const pixActiveMap: Record<string, number> = {};
    for (const pm of pixMRR?.pixMonthlyMRR || []) {
      pixMrrMap[pm.month] = pm.mrr;
      pixActiveMap[pm.month] = pm.activeCount;
    }

    return filteredMRRData.map((item) => {
      const isLatest = item.month === latestMonthKey;
      const pixMrrForMonth = pixMrrMap[item.month] || 0;
      const pixActiveForMonth = pixActiveMap[item.month] || 0;
      const combinedMrr = isLatest ? currentTotalMrr : (item.mrr + pixMrrForMonth);
      const combinedActive = isLatest ? currentTotalActive : ((item.activeCount ?? 0) + pixActiveForMonth);
      return {
        date: monthKeyToLocalDate(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        mrr: combinedMrr,
        activeCount: combinedActive,
      };
    });
  }, [filteredMRRData, stripeMRR?.totalMRR, pixMRR?.pixMrr, pixMRR?.pixMonthlyMRR]);

  // Load API key status from database
  const loadApiKeyStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_key_status')
        .select('*')
        .order('key_index', { ascending: true });
      
      if (error) {
        console.error('Error loading API key status:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const keys: ApiKeyStatus[] = data.map(item => ({
          name: `Chave ${item.key_index} ${item.key_index === 1 ? '(Principal)' : '(Backup)'}`,
          status: item.status as 'ok' | 'warning' | 'error' | 'unknown',
          message: item.message || 'Status desconhecido',
        }));
        
        // Calculate overall status
        const okCount = keys.filter(k => k.status === 'ok').length;
        const errorCount = keys.filter(k => k.status === 'error' || k.status === 'exhausted').length;
        
        let overallStatus: 'ok' | 'warning' | 'error' = 'ok';
        let overallMessage = 'Funcionando normalmente';
        
        if (okCount === 0) {
          overallStatus = 'error';
          overallMessage = 'Todas as chaves indisponíveis!';
        } else if (errorCount > 0) {
          overallStatus = 'warning';
          overallMessage = `${okCount} chave(s) funcionando`;
        }
        
        const lastCheck = data[0]?.last_checked_at ? new Date(data[0].last_checked_at) : new Date();
        
        setApiStatus(prev => ({
          ...prev,
          serpApi: {
            ...prev.serpApi,
            status: overallStatus,
            message: overallMessage,
            lastCheck,
            keys,
          }
        }));
      }
    } catch (error) {
      console.error('Error loading API key status:', error);
    }
  }, []);

  // Run the check-serp-keys edge function
  const runKeyCheck = useCallback(async () => {
    setCheckingApis(true);
    
    try {
      setApiStatus(prev => ({
        ...prev,
        serpApi: {
          ...prev.serpApi,
          message: 'Verificando chaves...',
        }
      }));
      
      const { data, error } = await supabase.functions.invoke('check-serp-keys');
      
      if (error) {
        throw error;
      }
      
      if (data?.success) {
        toast({
          title: "Verificação concluída",
          description: data.overallMessage,
        });
        
        // Reload status from database
        await loadApiKeyStatus();
      } else {
        throw new Error(data?.error || 'Erro na verificação');
      }
    } catch (error) {
      console.error('Error checking keys:', error);
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar as chaves",
        variant: "destructive",
      });
    } finally {
      setCheckingApis(false);
    }
  }, [toast, loadApiKeyStatus]);

  // Monitoramento manual das APIs
  const checkApiStatus = useCallback(async () => {
    setCheckingApis(true);
    
    // Run the edge function to check SerpAPI keys
    await runKeyCheck();
    
    // Check Evolution API - verificar números conectados
    try {
      setApiStatus(prev => ({
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          message: 'Verificando...',
          lastCheck: new Date(),
        }
      }));
      
      // Verificar se há números WhatsApp conectados no banco
      const { data: connectedNumbers, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('id, is_connected')
        .eq('is_connected', true)
        .limit(10);
      
      if (!numbersError) {
        const connectedCount = connectedNumbers?.length || 0;
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: 'ok',
            message: connectedCount > 0 
              ? `${connectedCount} número(s) conectado(s)` 
              : 'Nenhum número conectado',
            lastCheck: new Date(),
            errorCount: 0,
          }
        }));
      } else {
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: 'warning',
            message: 'Erro ao verificar números',
            lastCheck: new Date(),
            errorCount: prev.evolutionApi.errorCount + 1,
          }
        }));
      }
    } catch (error) {
      console.log('Evolution API check error:', error);
      setApiStatus(prev => ({
        ...prev,
        evolutionApi: {
          status: 'warning',
          message: 'Não foi possível verificar',
          lastCheck: new Date(),
          errorCount: prev.evolutionApi.errorCount + 1,
        }
      }));
    }
    
    setCheckingApis(false);
  }, [runKeyCheck]);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (initialLoadDone) return;
    if (!user || !profile) return;
    setInitialLoadDone(true);
    checkAdminAndLoad();
  }, [user, profile, initialLoadDone]);

  // Não fazer monitoramento automático para evitar falsos positivos
  // O admin pode verificar manualmente clicando no botão de refresh

  const checkAdminAndLoad = async () => {
    if (!user || !profile) {
      navigate("/login");
      return;
    }

    // Verificar admin status via banco de dados (seguro contra manipulação)
    const isAdminUser = await checkIsAdmin();
    
    if (!isAdminUser) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadData(), loadApiKeyStatus(), loadStripeMRR(), loadPixMRR(), loadSalesChartData(), loadPeriodStats()]);
  };

  // Load period-filtered stats
  const loadPeriodStats = useCallback(async () => {
    try {
      const startISO = statsStartDate.toISOString();
      const endISO = statsEndDate.toISOString();

      const [
        usersRes, searchesRes, campaignsRes, agentsRes, checkoutRes, purchasesRes, pixPurchasesRes
      ] = await Promise.all([
        // Users created in period
        supabase.from('profiles').select('id, searches_used, plan, created_at').gte('created_at', startISO).lte('created_at', endISO),
        // Searches in period
        supabase.from('search_history' as any).select('id, user_id, results_count, created_at').gte('created_at', startISO).lte('created_at', endISO),
        // Campaigns created in period
        supabase.from('whatsapp_campaigns').select('id, user_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
        // Agents created in period
        supabase.from('ai_agents').select('id, user_id, created_at').gte('created_at', startISO).lte('created_at', endISO),
        // Checkout leads in period (includes Stripe, AbacatePay and Asaas)
        supabase.from('checkout_leads' as any).select('*').gte('checkout_started_at', startISO).lte('checkout_started_at', endISO),
        // Purchases (subscription events) in period - Stripe
        supabase.from('subscription_events').select('id, user_id, event_type, created_at')
          .in('event_type', ['subscription_created', 'subscription_renewed'])
          .gte('created_at', startISO).lte('created_at', endISO),
        // PIX purchases in period
        supabase.from('pix_invoices').select('id, user_id, amount_cents, paid_at')
          .eq('status', 'paid')
          .gte('paid_at', startISO).lte('paid_at', endISO),
      ]);

      const usersInPeriod = usersRes.data?.length || 0;
      
      // Searches: count unique users who searched
      const searchUsers = new Set((searchesRes.data || []).map((s: any) => s.user_id));
      const searchesCount = (searchesRes.data || []).reduce((sum: number, s: any) => sum + (s.results_count || 0), 0);
      
      // Active users = users who did searches or campaigns
      const campaignUsers = new Set((campaignsRes.data || []).map((c: any) => c.user_id));
      const activeUsersSet = new Set([...searchUsers, ...campaignUsers]);
      
      // Activated = users who created account in period AND did a search or campaign
      const usersCreatedInPeriod = new Set((usersRes.data || []).map((u: any) => u.id));
      const activatedCount = [...usersCreatedInPeriod].filter(uid => activeUsersSet.has(uid)).length;
      
      // Used AI = unique users who created agents in period
      const aiUsers = new Set((agentsRes.data || []).map((a: any) => a.user_id));
      
      // Created campaign = unique users
      const campaignCreators = campaignUsers.size;
      
      // Checkout
      const checkoutData = checkoutRes.data || [];
      const checkoutStarted = checkoutData.length;
      const checkoutNotCompleted = checkoutData.filter((c: any) => !c.checkout_completed).length;
      
      // Purchases: Stripe events + PIX invoices + completed PIX checkouts (deduplicated)
      const stripePurchasesCount = purchasesRes.data?.length || 0;
      const pixInvoicePurchasesCount = pixPurchasesRes.data?.length || 0;
      
      // Also count completed PIX checkouts in period not already in pix_invoices
      const { data: pixCheckoutsInPeriod } = await supabase
        .from('checkout_leads')
        .select('id, user_id, checkout_completed_at')
        .eq('checkout_completed', true)
        .or('stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_%')
        .gte('checkout_completed_at', startISO)
        .lte('checkout_completed_at', endISO);
      
      const pixInvoiceUserIds = new Set((pixPurchasesRes.data || []).map((p: any) => p.user_id));
      const pixOnlyCount = (pixCheckoutsInPeriod || []).filter((c: any) => !pixInvoiceUserIds.has(c.user_id)).length;
      
      const purchasesCount = stripePurchasesCount + pixInvoicePurchasesCount + pixOnlyCount;
      
      // Conversion rate: paying users created in period / total users in period
      const payingInPeriod = (usersRes.data || []).filter((u: any) => u.plan !== 'free').length;
      const conversionRate = usersInPeriod > 0 ? (payingInPeriod / usersInPeriod) * 100 : 0;

      setPeriodStats({
        usersInPeriod,
        searchesInPeriod: searchesCount,
        activeUsersInPeriod: activeUsersSet.size,
        conversionRateInPeriod: conversionRate,
        activatedInPeriod: activatedCount,
        purchasesInPeriod: purchasesCount,
        usedAIInPeriod: aiUsers.size,
        createdCampaignInPeriod: campaignCreators,
        checkoutStartedInPeriod: checkoutStarted,
        checkoutNotCompletedInPeriod: checkoutNotCompleted,
      });
      setCheckoutLeadsList(checkoutData.filter((c: any) => !c.checkout_completed));
    } catch (err) {
      console.error('Error loading period stats:', err);
    }
  }, [statsStartDate, statsEndDate]);

  // Reload period stats when dates change
  useEffect(() => {
    if (isAdmin) {
      loadPeriodStats();
    }
  }, [statsStartDate, statsEndDate, isAdmin, loadPeriodStats]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: usersData, error: usersError }, { data: checkoutData, error: checkoutError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('checkout_leads')
          .select('user_id, stripe_session_id, checkout_completed_at, created_at')
          .eq('checkout_completed', true)
          .not('user_id', 'is', null)
          .order('checkout_completed_at', { ascending: false }),
      ]);

      if (usersError) throw usersError;
      if (checkoutError) throw checkoutError;

      const latestProviderByUser = new Map<string, string>();
      for (const checkout of checkoutData || []) {
        if (!checkout.user_id || latestProviderByUser.has(checkout.user_id)) continue;
        const provider = getProviderFromSessionId(checkout.stripe_session_id);
        if (provider) latestProviderByUser.set(checkout.user_id, provider);
      }

      const normalizedUsers = (usersData || []).map((user) => ({
        ...user,
        payment_provider: latestProviderByUser.get(user.id) || user.payment_provider || null,
      }));

      setUsers(normalizedUsers);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filtrar admins do cálculo de MRR (usuários com role admin)
      // Para simplificar, filtrar quem tem plano free como indicador
      const payingUsersData = normalizedUsers.filter(u => u.plan !== 'free');

      // Calculate stats
      const totalUsers = normalizedUsers.length;
      const totalSearches = normalizedUsers.reduce((acc, u) => acc + u.searches_used, 0);
      const activeUsers = normalizedUsers.filter(u => u.searches_used > 0).length;
      
      // Usuários ativos nos últimos 7 dias
      const activeUsers7Days = normalizedUsers.filter(u => 
        new Date(u.updated_at) >= sevenDaysAgo && u.searches_used > 0
      ).length;
      
      // Usuários ativos nos últimos 30 dias
      const activeUsers30Days = normalizedUsers.filter(u => 
        new Date(u.updated_at) >= thirtyDaysAgo && u.searches_used > 0
      ).length;
      
      // Calcular MRR (excluindo admin)
      const mrr = payingUsersData.reduce((acc, u) => acc + (PLAN_PRICES[u.plan] || 0), 0);
      
      // Usuários pagantes (excluindo admin)
      const payingUsers = payingUsersData.filter(u => u.plan !== 'free').length;
      
      // Taxa de ativação
      const activationRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      
      // Distribuição de planos (excluindo admin)
      const planCounts: { [key: string]: { count: number; revenue: number } } = {};
      payingUsersData.forEach(u => {
        if (!planCounts[u.plan]) {
          planCounts[u.plan] = { count: 0, revenue: 0 };
        }
        planCounts[u.plan].count += 1;
        planCounts[u.plan].revenue += PLAN_PRICES[u.plan] || 0;
      });
      const planDistribution = Object.entries(planCounts).map(([plan, data]) => ({ 
        plan, 
        count: data.count,
        revenue: data.revenue 
      }));

      // Simular histórico de MRR (últimos 7 dias)
      const revenueHistoryData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        // Calcular MRR baseado em usuários criados até aquela data
        const usersUntilDate = payingUsersData.filter(u => 
          new Date(u.created_at) <= date
        );
        const mrrAtDate = usersUntilDate.reduce((acc, u) => acc + (PLAN_PRICES[u.plan] || 0), 0);
        
        revenueHistoryData.push({
          date: dateStr,
          mrr: mrrAtDate,
          users: usersUntilDate.filter(u => u.plan !== 'free').length,
        });
      }
      setRevenueHistory(revenueHistoryData);

      setStats({
        totalUsers,
        totalSearches,
        activeUsers,
        activeUsers7Days,
        activeUsers30Days,
        planDistribution,
        mrr,
        activationRate,
        payingUsers,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do painel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdating(userId);
    try {
      const limits: { [key: string]: number } = {
        free: 10,
        start: 1000,
        growth: 3000,
        scale: 10000,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan: newPlan,
          searches_limit: limits[newPlan] || 10,
          searches_used: 0,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: `Plano alterado para ${newPlan.toUpperCase()} e buscas resetadas`,
      });

      await loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o plano.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const resetUserSearches = async (userId: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ searches_used: 0 })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Buscas resetadas",
        description: "Contador de buscas zerado com sucesso.",
      });

      await loadData();
    } catch (error) {
      console.error('Error resetting searches:', error);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar as buscas.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Filtered and paginated users
  const filteredUsers = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return users.filter(u => {
      // Search filter
      const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Plan filter
      const matchesPlan = userPlanFilter === 'all' || u.plan === userPlanFilter;
      
      // Activity filter - based on updated_at (last access date)
      let matchesActivity = true;
      const updatedAt = new Date(u.updated_at);
      
      switch (userActivityFilter) {
        case 'active_7d':
          matchesActivity = updatedAt >= sevenDaysAgo;
          break;
        case 'active_30d':
          matchesActivity = updatedAt >= thirtyDaysAgo && updatedAt < sevenDaysAgo;
          break;
        case 'inactive_30d':
          matchesActivity = updatedAt < thirtyDaysAgo;
          break;
        case 'checkout_not_completed':
          matchesActivity = checkoutLeadsList.some((c: any) => c.user_id === u.id);
          break;
        default:
          matchesActivity = true;
      }
      
      return matchesSearch && matchesPlan && matchesActivity;
    });
  }, [users, searchTerm, userPlanFilter, userActivityFilter, checkoutLeadsList]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, userPlanFilter, userActivityFilter]);

  // Export users to Excel
  const exportUsersToExcel = () => {
    const dataToExport = filteredUsers.map(u => ({
      Nome: u.name || '-',
      'E-mail': u.email,
      Plano: u.plan.charAt(0).toUpperCase() + u.plan.slice(1),
      Provedor: u.payment_provider === 'abacate_pay' ? 'PIX AbacatePay' : u.payment_provider === 'asaas' ? 'PIX Asaas' : u.payment_provider === 'stripe' ? 'Stripe' : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');
    
    // Generate filename with date
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(workbook, `usuarios_${date}.xlsx`);
    
    toast({
      title: "Exportação concluída",
      description: `${filteredUsers.length} usuários exportados com sucesso.`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'scale': return 'bg-purple-500/20 text-purple-400';
      case 'growth': return 'bg-primary/20 text-primary';
      case 'start': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return 'bg-success/20 text-success border-success/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <CheckCircle2 size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error': return <XCircle size={16} />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  const pieData = stats?.planDistribution.map(item => ({
    name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
    value: item.count,
    revenue: item.revenue,
  })) || [];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Glows */}
      <BackgroundGlow />
      
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Admin
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Menu size={16} />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/pix-billing" className="flex items-center gap-2 cursor-pointer">
                      <Receipt size={14} /> Billing PIX
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/email-tests" className="flex items-center gap-2 cursor-pointer">
                      <Mail size={14} /> Emails
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/tests" className="flex items-center gap-2 cursor-pointer">
                      <FlaskConical size={14} /> Testes de Produção
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/announcements" className="flex items-center gap-2 cursor-pointer">
                      <Bell size={14} /> Avisos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/landing-pages" className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard size={14} /> Landing Pages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/trial-automation" className="flex items-center gap-2 cursor-pointer">
                      <Zap size={14} /> Trial Automação
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/user-scoring" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 size={14} /> Score de Usuários
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/email-flows" className="flex items-center gap-2 cursor-pointer">
                      <Zap size={14} /> Fluxos de Email
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/insights" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 size={14} /> Insights
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <ArrowLeft size={14} /> Voltar ao Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut size={14} /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários, planos e acompanhe métricas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* API Status Cards */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Server size={20} className="text-primary" />
                Status das APIs
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkApiStatus}
                disabled={checkingApis}
                className="gap-2"
              >
                {checkingApis ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Verificar
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {/* SerpAPI Status Card */}
              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.serpApi.status)} animate-fade-in`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Search size={18} />
                    <span className="font-semibold">SerpAPI (Buscas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.serpApi.status)}
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.serpApi.message}</p>
                <p className="text-xs mt-2 opacity-50">
                  Última verificação: {apiStatus.serpApi.lastCheck.toLocaleTimeString('pt-BR')}
                </p>
              </div>

              {/* SerpAPI Keys Monitoring */}
              <div className="rounded-xl p-4 border border-border bg-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Key size={18} className="text-primary" />
                  <span className="font-semibold">Chaves SerpAPI</span>
                  <span className="text-xs text-muted-foreground ml-auto">4 chaves configuradas</span>
                </div>
                <div className="space-y-2">
                  {apiStatus.serpApi.keys.map((key, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{key.name}</span>
                      <span className={`flex items-center gap-1 ${
                        key.status === 'ok' ? 'text-success' : 
                        key.status === 'error' || key.status === 'not_configured' ? 'text-destructive' : 
                        key.status === 'exhausted' ? 'text-warning' : 
                        key.status === 'warning' ? 'text-warning' : 
                        'text-muted-foreground'
                      }`}>
                        {key.status === 'ok' && <CheckCircle2 size={12} />}
                        {(key.status === 'error' || key.status === 'not_configured') && <XCircle size={12} />}
                        {(key.status === 'warning' || key.status === 'exhausted') && <AlertTriangle size={12} />}
                        {key.status === 'unknown' && <span className="w-2 h-2 rounded-full bg-muted-foreground" />}
                        <span className="text-xs">{key.message}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Fallback automático ativado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verificado: {apiStatus.serpApi.lastCheck.toLocaleString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              {/* Evolution API Status Card */}
              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.evolutionApi.status)} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server size={18} />
                    <span className="font-semibold">Evolution API (WhatsApp)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.evolutionApi.status)}
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.evolutionApi.message}</p>
                <p className="text-xs mt-2 opacity-50">
                  Última verificação: {apiStatus.evolutionApi.lastCheck.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Financial Stats - Combined MRR */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <DollarSign size={20} className="text-success" />
                Métricas Financeiras
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { loadStripeMRR(); loadPixMRR(); }}
                disabled={loadingMRR}
                className="gap-2"
              >
                {loadingMRR ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Atualizar MRR
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* MRR Total Combinado */}
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign size={20} className="text-success" />
                  </div>
                  {loadingMRR && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-success">
                  R$ {((stripeMRR?.totalMRR ?? 0) + (pixMRR?.pixMrr ?? 0)).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  MRR Total (Stripe + PIX)
                </p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Stripe: R$ {(stripeMRR?.totalMRR ?? 0).toLocaleString('pt-BR')}</span>
                  <span>PIX: R$ {(pixMRR?.pixMrr ?? 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {(stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Assinantes Ativos (Total)
                </p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Stripe: {stripeMRR?.activeSubscriptions ?? 0}</span>
                  <span>PIX: {pixMRR?.pixActiveSubscriptions ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <XCircle size={20} className="text-destructive" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">
                  R$ {(stripeMRR?.totalRefunded ?? 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Reembolsado ({stripeMRR?.refundCount ?? 0})
                </p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-warning" />
                  </div>
                </div>
                {(() => {
                  const totalCanceled = (stripeMRR?.canceledSubscriptions ?? 0) + (pixMRR?.pixCancellations ?? 0);
                  const totalActive = (stripeMRR?.activeSubscriptions ?? 0) + (pixMRR?.pixActiveSubscriptions ?? 0);
                  const combinedChurn = (totalActive + totalCanceled) > 0 
                    ? ((totalCanceled / (totalActive + totalCanceled)) * 100).toFixed(1) 
                    : '0';
                  return (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold text-warning">
                        {combinedChurn}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Taxa de Cancelamento (Stripe + PIX)
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Cancelados / (Ativos + Cancelados)
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <XCircle size={20} className="text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                  {(stripeMRR?.canceledSubscriptions ?? 0) + (pixMRR?.pixCancellations ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cancelamentos (Total)
                </p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground/70">
                  <span>Stripe: {stripeMRR?.canceledSubscriptions ?? 0}</span>
                  <span>PIX: {pixMRR?.pixCancellations ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Period Filter */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Período de Análise
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '1m', label: '1 Mês' },
                    { value: '3m', label: '3 Meses' },
                    { value: '6m', label: '6 Meses' },
                    { value: '12m', label: '12 Meses' },
                    { value: 'year', label: 'Este Ano' },
                    { value: 'all', label: 'Tudo' },
                    { value: 'custom', label: 'Personalizado' },
                  ].map(option => (
                    <Button
                      key={option.value}
                      variant={chartPeriodFilter === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setChartPeriodFilter(option.value as ChartPeriodFilter)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {chartPeriodFilter === 'custom' && (
                <div className="flex items-center gap-3 glass rounded-lg p-3">
                  <span className="text-xs text-muted-foreground font-medium">De:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("text-xs h-8 w-[140px] justify-start", !customStartDate && "text-muted-foreground")}>
                        <Calendar size={14} className="mr-1.5" />
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground font-medium">Até:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("text-xs h-8 w-[140px] justify-start", !customEndDate && "text-muted-foreground")}>
                        <Calendar size={14} className="mr-1.5" />
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Sales/Upgrades/Cancellations Chart - Full Width */}
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in mb-8" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Vendas, Upgrades e Cancelamentos por Mês</h2>
                  {loadingSalesChart && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadSalesChartData}
                  disabled={loadingSalesChart}
                  className="gap-2"
                >
                  {loadingSalesChart ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Atualizar
                </Button>
              </div>
              
              {/* Summary Cards */}
              {processedSalesChartData.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="bg-success/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Vendas</p>
                    <p className="text-lg font-bold text-success">
                      R$ {processedSalesChartData.reduce((sum, item) => sum + item.salesValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {processedSalesChartData.reduce((sum, item) => sum + item.newSales + item.upgrades, 0)} transações
                    </p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Reembolsos</p>
                    <p className="text-lg font-bold text-destructive">
                      R$ {processedSalesChartData.reduce((sum, item) => sum + item.refundValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {processedSalesChartData.reduce((sum, item) => sum + item.refundCount, 0)} reembolso(s)
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Novas Vendas</p>
                    <p className="text-lg font-bold">
                      {processedSalesChartData.reduce((sum, item) => sum + item.newSales, 0)}
                    </p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Cancelamentos</p>
                    <p className="text-lg font-bold text-warning">
                      {processedSalesChartData.reduce((sum, item) => sum + item.cancellations, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Inclui downgrades p/ free</p>
                  </div>
                </div>
              )}

              <div className="h-80">
                {processedSalesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedSalesChartData.map(item => ({
                      ...item,
                      month: monthKeyToLocalDate(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--background))', fillOpacity: 0 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: { [key: string]: string } = {
                            newSales: 'Novas Vendas',
                            upgrades: 'Upgrades',
                            cancellations: 'Cancelamentos',
                            salesValue: 'Valor em Vendas',
                            refundValue: 'Valor Reembolsado'
                          };
                          if (name === 'salesValue' || name === 'refundValue') {
                            return [`R$ ${value.toLocaleString('pt-BR')}`, labels[name] || name];
                          }
                          return [value, labels[name] || name];
                        }}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="newSales" 
                        name="Novas Vendas"
                        fill="#22c55e" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="upgrades" 
                        name="Upgrades"
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="cancellations" 
                        name="Cancelamentos"
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="salesValue" 
                        name="Valor em Vendas"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="refundValue" 
                        name="Valor Reembolsado"
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Nenhum dado de vendas disponível</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                  <span className="text-muted-foreground">Novas Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
                  <span className="text-muted-foreground">Upgrades</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                  <span className="text-muted-foreground">Cancelamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#10b981] opacity-60" />
                  <span className="text-muted-foreground">R$ Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#f43f5e] opacity-60" />
                  <span className="text-muted-foreground">R$ Reembolsos</span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers7Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.45s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers30Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>

            {/* Revenue Chart - Using Stripe Monthly MRR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Evolução do MRR (Total)</h2>
                  {loadingMRR && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <div className="h-64">
                  {mrrChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mrrChartData}>
                        <defs>
                          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const activeCount = props?.payload?.activeCount ?? 0;
                            return [
                              <div key="mrr-tooltip" className="flex flex-col gap-0.5">
                                <span className="font-semibold">R$ {value.toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] text-muted-foreground">{activeCount} assinantes ativos</span>
                              </div>,
                              'MRR Total'
                            ];
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="mrr" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorMrr)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      {stripeMRRError ? (
                        <p className="text-sm">Erro ao carregar dados do Stripe</p>
                      ) : (
                        <p className="text-sm">Nenhum dado de MRR disponível para o período</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Distribuição de Planos</h2>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.name.toLowerCase()] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value} usuários (R$ ${props.payload.revenue?.toLocaleString('pt-BR') || 0}/mês)`,
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Churn by Reason Pie Chart */}
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.65s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <XCircle size={20} className="text-destructive" />
                  <h2 className="font-display font-semibold">Churn por Motivo</h2>
                </div>
                <div className="h-64 flex items-center justify-center">
                  {churnByReasonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={churnByReasonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {churnByReasonData.map((entry, index) => (
                            <Cell key={`churn-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value} cancelamento(s)`,
                            props.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">Nenhum churn no período selecionado 🎉</p>
                    </div>
                  )}
                </div>
                {churnByReasonData.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
                    {churnByReasonData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Period Filter for Stats */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold flex items-center gap-2">
                  <Filter size={20} className="text-primary" />
                  Métricas por Período
                </h2>
              </div>
              <div className="flex items-center gap-3 glass rounded-lg p-3">
                <span className="text-xs text-muted-foreground font-medium">De:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-8 w-[140px] justify-start")}>
                      <Calendar size={14} className="mr-1.5" />
                      {format(statsStartDate, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={statsStartDate}
                      onSelect={(d) => d && setStatsStartDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground font-medium">Até:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-8 w-[140px] justify-start")}>
                      <Calendar size={14} className="mr-1.5" />
                      {format(statsEndDate, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={statsEndDate}
                      onSelect={(d) => d && setStatsEndDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* General Stats - Period filtered */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{periodStats.usersInPeriod}</p>
                <p className="text-sm text-muted-foreground">Usuários no Período</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-success" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-success">{periodStats.activatedInPeriod}</p>
                <p className="text-sm text-muted-foreground">Activated</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Criou conta + campanha ou prospecção</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{periodStats.activeUsersInPeriod}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos no Período</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {periodStats.conversionRateInPeriod.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Conversão no Período</p>
              </div>
            </div>

            {/* New Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{periodStats.searchesInPeriod}</p>
                <p className="text-sm text-muted-foreground">Buscas no Período</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 size={20} className="text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{periodStats.createdCampaignInPeriod}</p>
                <p className="text-sm text-muted-foreground">Criou Campanha</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Usuários únicos</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Zap size={20} className="text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-purple-400">{periodStats.usedAIInPeriod}</p>
                <p className="text-sm text-muted-foreground">Usou IA</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Usuários que criaram agentes</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign size={20} className="text-success" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-success">{periodStats.purchasesInPeriod}</p>
                <p className="text-sm text-muted-foreground">Compras</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Vendas no período</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-warning" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-warning">{periodStats.checkoutStartedInPeriod}</p>
                <p className="text-sm text-muted-foreground">Checkout Iniciados</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{periodStats.checkoutNotCompletedInPeriod} não finalizados</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '1.1s' }}>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    <h2 className="font-display font-semibold">Usuários</h2>
                    <span className="text-sm text-muted-foreground">({filteredUsers.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 sm:w-48">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-secondary"
                      />
                    </div>
                    <Select value={userPlanFilter} onValueChange={setUserPlanFilter}>
                      <SelectTrigger className="w-32 bg-secondary">
                        <Filter size={14} className="mr-1" />
                        <SelectValue placeholder="Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="start">Start</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="scale">Scale</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={userActivityFilter} onValueChange={(v) => setUserActivityFilter(v as typeof userActivityFilter)}>
                      <SelectTrigger className="w-48 bg-secondary">
                        <Activity size={14} className="mr-1" />
                        <SelectValue placeholder="Atividade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active_7d">Ativos 7 dias</SelectItem>
                        <SelectItem value="active_30d">Ativos 30 dias</SelectItem>
                        <SelectItem value="inactive_30d">Inativos +30 dias</SelectItem>
                        <SelectItem value="checkout_not_completed">Checkout não finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={loadData} title="Atualizar">
                      <RefreshCw size={16} />
                    </Button>
                    <Button variant="outline" onClick={exportUsersToExcel} className="gap-2" title="Exportar Excel">
                      <Download size={16} />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <CreateUserDialog onUserCreated={loadData} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px] px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Provedor</TableHead>
                        <TableHead>Buscas</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => (
                        <TableRow key={u.id} className={u.is_blocked ? 'opacity-60 bg-destructive/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {u.is_blocked && (
                                <div className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" title="Usuário bloqueado" />
                              )}
                              <div>
                                <p className="font-medium">{u.name || '-'}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.plan}
                              onValueChange={(value) => updateUserPlan(u.id, value)}
                              disabled={updating === u.id}
                            >
                              <SelectTrigger className={`w-28 ${getPlanBadgeColor(u.plan)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="start">Start</SelectItem>
                                <SelectItem value="growth">Growth</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {u.plan !== 'free' && u.payment_provider ? (
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-medium",
                                u.payment_provider === 'abacate_pay' || u.payment_provider === 'asaas'
                                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                                  : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                              )}>
                                {u.payment_provider === 'abacate_pay' ? 'PIX AbacatePay' : u.payment_provider === 'asaas' ? 'PIX Asaas' : 'Stripe'}
                              </Badge>
                            ) : u.plan !== 'free' ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.searches_used}</span>
                              <span className="text-muted-foreground">/ {u.searches_limit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(u.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resetUserSearches(u.id)}
                                disabled={updating === u.id}
                              >
                                {updating === u.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  'Resetar'
                                )}
                              </Button>
                              <UserActionsMenu
                                userId={u.id}
                                userEmail={u.email}
                                userName={u.name}
                                isBlocked={u.is_blocked || false}
                                onActionComplete={loadData}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {paginatedUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({filteredUsers.length} usuários)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>




            {/* Proxy Manager Panel */}
            <div className="mt-8">
              <ProxyManagerPanel />
            </div>

            {/* Campaign Debug Panel */}
            <div className="mt-8">
              <CampaignDebugPanel />
            </div>

            {/* Agents Monitor Panel */}
            <div className="mt-8">
              <AgentsMonitorPanel />
            </div>

            {/* Terms Acceptance Log */}
            <div className="mt-8">
              <TermsAcceptanceLog />
            </div>

            {/* Subscription Events Debug Log */}
            <div className="mt-8">
              <SubscriptionEventsLog />
            </div>

            {/* Phone Cleanup Tool */}
            <div className="mt-8">
              <PhoneCleanupTool />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
