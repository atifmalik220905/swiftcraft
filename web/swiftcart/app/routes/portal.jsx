import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, Link } from "react-router";
import { createClient } from "@supabase/supabase-js";

export const loader = async () => {
  return {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  };
};

function KpiCard({ label, value, icon, change, featured = false }) {
  return (
    <div className={`kpi-card ${featured ? "kpi-card--featured" : ""}`}>
      <div className="flex justify-between items-start">
        <span className={`text-label-bold font-label uppercase tracking-wider ${featured ? "text-primary" : "text-on-surface-variant"}`}>
          {label}
        </span>
        <span
          className="material-symbols-outlined text-primary"
          style={featured ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className={`font-headline text-headline-md ${featured ? "text-primary" : "text-on-background"}`}>
          {value}
        </span>
        {change && (
          <span className={change.startsWith("+") ? "badge-success" : "badge-urgency"}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function ChartBar({ heightPrimary, heightSecondary }) {
  return (
    <div className="flex-1 bg-surface-container-low rounded-t-lg relative min-h-[16rem]">
      <div
        className="absolute bottom-0 w-full bg-primary-container/40 rounded-t-lg transition-all duration-700 hover:opacity-80"
        style={{ height: `${heightSecondary}%` }}
      />
      <div
        className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-1000 hover:opacity-80"
        style={{ height: `${heightPrimary}%` }}
      />
    </div>
  );
}

export default function Portal() {
  const { supabaseUrl, supabaseAnonKey } = useLoaderData();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeDomain, setStoreDomain] = useState("yourstore.myshopify.com");
  const navigate = useNavigate();
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      setSupabase(client);

      // Check current session
      client.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          navigate("/login");
        } else {
          setSession(session);
          setStoreDomain(session.user.user_metadata.store_domain || "yourstore.myshopify.com");
        }
        setLoading(false);
      });

      // Listen for auth state changes
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          navigate("/login");
        } else {
          setSession(session);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, [supabaseUrl, supabaseAnonKey]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      {/* ─── Top App Bar ─── */}
      <header className="bg-surface-container-lowest text-primary w-full top-0 sticky border-b border-outline-variant shadow-sm z-40 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="font-headline text-headline-md font-bold text-primary">
            SwiftCart Merchant Portal
          </h1>
          <span className="badge-primary text-xs ml-2">Standalone</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-on-surface">{session.user.email}</p>
            <p className="text-xs text-on-surface-variant">{storeDomain}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* ─── Page Header ─── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-on-background animate-slide-up">
              Overview Dashboard
            </h2>
            <p className="text-on-surface-variant mt-1">
              Connected store: <span className="font-semibold text-primary">{storeDomain}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1 text-sm">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              <span>Last 30 Days</span>
            </button>
          </div>
        </div>

        {/* ─── KPI Bento Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Cart Open Rate" value="44.2%" icon="shopping_cart_checkout" change="+4.2%" />
          <KpiCard label="Upsell Conversion" value="18.9%" icon="trending_up" change="+2.1%" />
          <KpiCard label="AOV Lift" value="₹1,240" icon="bolt" change="+12%" featured />
          <KpiCard label="Total Checkouts" value="8,402" icon="payments" />
        </div>

        {/* ─── Main Content Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Revenue Performance Chart */}
            <section className="section-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline text-headline-md text-on-background">
                  Revenue Performance
                </h3>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1 text-label-sm font-semibold text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    SwiftCart
                  </span>
                  <span className="flex items-center gap-1 text-label-sm font-semibold text-outline">
                    <span className="w-2 h-2 rounded-full bg-outline" />
                    Organic
                  </span>
                </div>
              </div>
              <div className="relative h-64 w-full flex items-end gap-2 md:gap-4 px-4 overflow-hidden">
                <ChartBar heightPrimary={25} heightSecondary={40} />
                <ChartBar heightPrimary={35} heightSecondary={60} />
                <ChartBar heightPrimary={30} heightSecondary={50} />
                <ChartBar heightPrimary={50} heightSecondary={75} />
                <ChartBar heightPrimary={38} heightSecondary={55} />
                <ChartBar heightPrimary={60} heightSecondary={85} />
                <ChartBar heightPrimary={42} heightSecondary={65} />
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant mt-2 px-4">
                <span>Mon</span><span>Tue</span><span>Wed</span>
                <span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </section>
          </div>

          {/* Right Column (1/3) */}
          <div className="flex flex-col gap-8">
            {/* Quick Actions / Integration */}
            <section className="section-card">
              <h3 className="font-headline text-headline-md text-on-background mb-4">
                Integration Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-secondary-container/10 border border-secondary/20 rounded-lg">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Shopify App Connected</p>
                    <p className="text-xs text-on-surface-variant">OAuth sync active</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary-container/10 border border-secondary/20 rounded-lg">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Supabase Integration</p>
                    <p className="text-xs text-on-surface-variant">Database connected</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Support */}
            <section className="section-card">
              <h3 className="font-headline text-headline-md text-on-background mb-3">
                Need Help?
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">
                If you have questions about integrating your Shopify store or configuring custom CSS settings, our support team is online.
              </p>
              <a
                href="mailto:support@scalezix.com"
                className="block w-full py-2 bg-primary text-on-primary rounded-lg font-bold text-center hover:opacity-90 transition-all text-sm"
              >
                Contact Support
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
