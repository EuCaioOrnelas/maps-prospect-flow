import { CheckCircle2, Shield, MessageSquare, Zap, ArrowRight, Globe, Key, Webhook, Users, FileText } from "lucide-react";

const MetaAppDocumentation = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <MessageSquare size={18} className="text-emerald-400" />
            </div>
            <span className="font-semibold text-lg">Wiize Platform — Meta Integration Documentation</span>
          </div>
          <span className="text-xs text-white/40">Confidential — For Meta Review Team Only</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Intro */}
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">Meta API Integration Overview</h1>
          <p className="text-white/60 text-lg max-w-3xl">
            Wiize is a B2B SaaS platform that enables businesses to manage WhatsApp marketing campaigns 
            using the official WhatsApp Cloud API through Meta's Embedded Signup flow.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Tag text="WhatsApp Cloud API" />
            <Tag text="Embedded Signup (OAuth)" />
            <Tag text="Facebook Login JS SDK" />
            <Tag text="Graph API v21.0" />
          </div>
        </section>

        {/* Architecture */}
        <section className="space-y-6">
          <SectionTitle icon={<Globe size={20} />} title="Architecture Overview" />
          <div className="grid md:grid-cols-3 gap-4">
            <ArchCard
              step="1"
              title="User Authentication"
              desc="Users sign up on Wiize with email/password. No Facebook Login is used for user authentication — only for WhatsApp Business connection."
            />
            <ArchCard
              step="2"
              title="WhatsApp Connection"
              desc="Via Facebook Login JS SDK, users authorize access to their WhatsApp Business Account through Meta's Embedded Signup flow."
            />
            <ArchCard
              step="3"
              title="Campaign Sending"
              desc="Using the permanent System User token obtained via OAuth, Wiize sends approved message templates through WhatsApp Cloud API."
            />
          </div>
        </section>

        {/* Permissions */}
        <section className="space-y-6">
          <SectionTitle icon={<Key size={20} />} title="Permissions & Their Usage" />
          <div className="space-y-3">
            <PermissionRow
              permission="whatsapp_business_messaging"
              usage="Send message templates via WhatsApp Cloud API endpoint /{phone_number_id}/messages"
              endpoint="POST /v21.0/{phone_number_id}/messages"
            />
            <PermissionRow
              permission="whatsapp_business_management"
              usage="Embedded Signup OAuth flow, list phone numbers, register webhooks via /{WABA_ID}/subscribed_apps"
              endpoint="GET /v21.0/{WABA_ID}/phone_numbers, POST /v21.0/{WABA_ID}/subscribed_apps"
            />
            <PermissionRow
              permission="business_management"
              usage="Required by the Embedded Signup OAuth flow for linking business assets during authorization"
              endpoint="Used internally by Meta's Embedded Signup"
            />
            <PermissionRow
              permission="public_profile"
              usage="Default permission — required by Facebook Login. NOT used to display any user data."
              endpoint="N/A — no direct API calls made"
            />
          </div>
        </section>

        {/* Login Flow */}
        <section className="space-y-6">
          <SectionTitle icon={<Users size={20} />} title="Facebook Login Flow (Embedded Signup)" />
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <p className="text-white/70 text-sm">
              Facebook Login is used <strong className="text-white">exclusively</strong> for the WhatsApp Business 
              Embedded Signup flow — NOT for user authentication on the platform.
            </p>
            <div className="space-y-3">
              <FlowStep n={1} text="User navigates to 'Meta Campaigns' section in the dashboard" />
              <FlowStep n={2} text="Clicks 'Connect with Meta Business' button" />
              <FlowStep n={3} text="Facebook Login popup opens via JS SDK (FB.login)" />
              <FlowStep n={4} text="User authorizes whatsapp_business_management and whatsapp_business_messaging scopes" />
              <FlowStep n={5} text="Authorization code is returned to the app" />
              <FlowStep n={6} text="Code is exchanged server-side for a permanent System User Access Token via /oauth/access_token" />
              <FlowStep n={7} text="Token is validated via /debug_token endpoint" />
              <FlowStep n={8} text="Phone numbers are listed via /{WABA_ID}/phone_numbers" />
              <FlowStep n={9} text="Webhook is registered via /{WABA_ID}/subscribed_apps" />
              <FlowStep n={10} text="Connection is stored and user can start sending campaigns" />
            </div>
          </div>
        </section>

        {/* API Endpoints */}
        <section className="space-y-6">
          <SectionTitle icon={<Zap size={20} />} title="API Endpoints Used" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 px-4 text-white/50 font-medium">Endpoint</th>
                  <th className="py-3 px-4 text-white/50 font-medium">Method</th>
                  <th className="py-3 px-4 text-white/50 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <ApiRow endpoint="/oauth/access_token" method="GET" purpose="Exchange auth code for permanent token" />
                <ApiRow endpoint="/debug_token" method="GET" purpose="Validate and inspect token permissions" />
                <ApiRow endpoint="/{WABA_ID}/phone_numbers" method="GET" purpose="List connected phone numbers" />
                <ApiRow endpoint="/{WABA_ID}/subscribed_apps" method="POST" purpose="Register webhook for delivery status" />
                <ApiRow endpoint="/{WABA_ID}/message_templates" method="GET" purpose="Fetch approved message templates" />
                <ApiRow endpoint="/{phone_number_id}/messages" method="POST" purpose="Send message templates to recipients" />
              </tbody>
            </table>
          </div>
        </section>

        {/* Webhook */}
        <section className="space-y-6">
          <SectionTitle icon={<Webhook size={20} />} title="Webhook Integration" />
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
            <p className="text-white/70 text-sm">
              Wiize receives webhook events for message status updates (sent, delivered, read, failed) 
              to provide real-time campaign tracking.
            </p>
            <div className="flex flex-wrap gap-2">
              <Tag text="messages.status: sent" />
              <Tag text="messages.status: delivered" />
              <Tag text="messages.status: read" />
              <Tag text="messages.status: failed" />
            </div>
          </div>
        </section>

        {/* Data Handling */}
        <section className="space-y-6">
          <SectionTitle icon={<Shield size={20} />} title="Data Handling & Privacy" />
          <div className="grid md:grid-cols-2 gap-4">
            <DataCard
              title="Data Collected via Meta APIs"
              items={[
                "WhatsApp Business Account ID (WABA ID)",
                "Phone Number ID and display number",
                "Business name from WABA",
                "System User Access Token (encrypted at rest)",
                "Message delivery status (sent/delivered/read)",
              ]}
            />
            <DataCard
              title="Data NOT Collected"
              items={[
                "Facebook profile information",
                "User's personal Facebook data",
                "Friends list or social graph",
                "Message content from recipients",
                "Personal photos or media",
              ]}
            />
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 space-y-2">
            <p className="text-sm font-medium text-emerald-400">Data Retention & Security</p>
            <ul className="text-sm text-white/60 space-y-1">
              <li>• Access tokens are encrypted and stored in a secure database with Row-Level Security (RLS)</li>
              <li>• Users can revoke access at any time via Meta Business Suite or within the Wiize platform</li>
              <li>• No platform data is shared with third parties or subprocessors</li>
              <li>• All API calls are made server-side via Edge Functions (no tokens exposed to the client)</li>
            </ul>
          </div>
        </section>

        {/* Test Instructions */}
        <section className="space-y-6">
          <SectionTitle icon={<FileText size={20} />} title="Test Instructions for Reviewers" />
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="space-y-3">
              <FlowStep n={1} text="Go to https://maps-prospect-flow.lovable.app" />
              <FlowStep n={2} text="Login with: reviewer@wiize.com.br / MetaReview2025!" />
              <FlowStep n={3} text="In the sidebar, click 'Campanhas Meta' (Meta Campaigns)" />
              <FlowStep n={4} text="Click 'Conectar com Meta Business' (Connect with Meta Business)" />
              <FlowStep n={5} text="The Facebook Login popup will open for Embedded Signup authorization" />
              <FlowStep n={6} text="After connecting, you can select templates and send campaigns" />
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-white/40">
                Note: The reviewer account has a Growth plan with full access to all features for 1 year.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-8 pb-12">
          <p className="text-xs text-white/30 text-center">
            This documentation is provided exclusively for Meta's App Review process. 
            App ID: 988774494328539 — Wiize Platform © {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
};

// Sub-components

const Tag = ({ text }: { text: string }) => (
  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
    {text}
  </span>
);

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="text-emerald-400">{icon}</div>
    <h2 className="text-xl font-bold">{title}</h2>
  </div>
);

const ArchCard = ({ step, title, desc }: { step: string; title: string; desc: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-[7px] bg-emerald-500/20 flex items-center justify-center">
        <span className="text-xs font-bold text-emerald-400">{step}</span>
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
  </div>
);

const PermissionRow = ({ permission, usage, endpoint }: { permission: string; usage: string; endpoint: string }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5">
    <div className="flex items-center gap-2">
      <CheckCircle2 size={14} className="text-emerald-400" />
      <code className="text-sm font-mono text-emerald-300">{permission}</code>
    </div>
    <p className="text-xs text-white/60 pl-[22px]">{usage}</p>
    <p className="text-xs text-white/40 pl-[22px] font-mono">{endpoint}</p>
  </div>
);

const FlowStep = ({ n, text }: { n: number; text: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-5 h-5 rounded-[6px] bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[10px] font-bold text-emerald-400">{n}</span>
    </div>
    <p className="text-sm text-white/70">{text}</p>
  </div>
);

const ApiRow = ({ endpoint, method, purpose }: { endpoint: string; method: string; purpose: string }) => (
  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
    <td className="py-3 px-4 font-mono text-emerald-300/80">{endpoint}</td>
    <td className="py-3 px-4">
      <span className={`px-2 py-0.5 rounded text-xs font-mono ${method === "POST" ? "bg-orange-500/10 text-orange-300" : "bg-blue-500/10 text-blue-300"}`}>
        {method}
      </span>
    </td>
    <td className="py-3 px-4">{purpose}</td>
  </tr>
);

const DataCard = ({ title, items }: { title: string; items: string[] }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-white/60">
          <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default MetaAppDocumentation;
