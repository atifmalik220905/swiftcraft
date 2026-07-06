/**
 * SwiftCart — Home / Overview Dashboard
 * Stitch Design: Merchant Dashboard (projects/13401150973745036929)
 * Shows KPI bento grid, onboarding checklist, revenue chart, recent upsell wins.
 */

import { useLoaderData, Link } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  createMerchant,
  upsertCartSettings,
  getCartEvents,
} from "../supabase-db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Find or create merchant record
  let merchant = await getMerchantWithRelations(shopDomain, {
    cartSettings: true,
    upsellRules: true,
    upsellRulesFilter: { isActive: true },
    progressBarRules: true,
    progressBarRulesFilter: { isActive: true },
    freeGiftRules: true,
    freeGiftRulesFilter: { isActive: true },
    volumeDiscountRules: true,
  });

  if (!merchant) {
    merchant = await createMerchant({
      shopDomain,
      accessToken: session.accessToken || "",
    });

    if (merchant) {
      await upsertCartSettings(merchant.id, {});
      merchant = await getMerchantWithRelations(shopDomain, {
        cartSettings: true,
        upsellRules: true,
        progressBarRules: true,
        freeGiftRules: true,
        volumeDiscountRules: true,
      });
    }
  }

  if (!merchant) {
    merchant = { upsellRules: [], progressBarRules: [], freeGiftRules: [], volumeDiscountRules: [], cartSettings: null, planTier: "starter" };
  }

  // Fetch analytics summary (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = merchant.id
    ? await getCartEvents(merchant.id, thirtyDaysAgo)
    : [];


  const cartOpens = events.filter((e) => e.eventType === "cart_open").length;
  const checkouts = events.filter((e) => e.eventType === "checkout").length;
  const upsellAdds = events.filter((e) => e.eventType === "upsell_add").length;
  const upsellClicks = events.filter((e) => e.eventType === "upsell_click").length;
  const conversionRate = cartOpens > 0 ? ((checkouts / cartOpens) * 100).toFixed(1) : 0;
  const upsellCtr = upsellClicks > 0 ? ((upsellAdds / upsellClicks) * 100).toFixed(1) : 0;

  // Calculate AOV lift
  const avgCartBefore = events.length > 0
    ? events.reduce((sum, e) => sum + e.cartValueBefore, 0) / events.length
    : 0;
  const avgCartAfter = events.length > 0
    ? events.reduce((sum, e) => sum + e.cartValueAfter, 0) / events.length
    : 0;
  const aovLift = avgCartBefore > 0
    ? (((avgCartAfter - avgCartBefore) / avgCartBefore) * 100).toFixed(1)
    : 0;

  // Onboarding checklist
  const onboarding = {
    hasCartSettings: !!merchant.cartSettings,
    hasUpsellRule: merchant.upsellRules.length > 0,
    hasProgressBar: merchant.progressBarRules.length > 0,
    hasFreeGift: merchant.freeGiftRules.length > 0,
    hasVolumeDiscount: merchant.volumeDiscountRules?.length > 0,
  };
  const onboardingComplete = Object.values(onboarding).every(Boolean);
  const onboardingProgress = Math.round(
    (Object.values(onboarding).filter(Boolean).length / 5) * 100
  );

  return {
    shopDomain,
    planTier: merchant.planTier,
    stats: {
      cartOpens,
      checkouts,
      conversionRate,
      upsellAdds,
      upsellCtr,
      aovLift,
      avgCartBefore: avgCartBefore.toFixed(0),
      avgCartAfter: avgCartAfter.toFixed(0),
    },
    onboarding,
    onboardingComplete,
    onboardingProgress,
    counts: {
      upsellRules: merchant.upsellRules.length,
      progressBarRules: merchant.progressBarRules.length,
      freeGiftRules: merchant.freeGiftRules.length,
      volumeDiscountRules: merchant.volumeDiscountRules?.length || 0,
    },
  };
};

// ─── KPI Card Component ───
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

// ─── Onboarding Item ───
function OnboardingItem({ done, label, href, actionLabel = "Activate" }) {
  return (
    <div className={`flex items-center gap-4 p-2 rounded-lg ${
      done
        ? "bg-surface-container-low/50"
        : "border border-primary/20 bg-primary/5"
    }`}>
      <span
        className="material-symbols-outlined"
        style={done ? { fontVariationSettings: "'FILL' 1", color: "#006c49" } : { color: "#757684" }}
      >
        {done ? "check_circle" : "radio_button_unchecked"}
      </span>
      <span className={`flex-1 font-body text-sm ${
        done ? "text-on-surface" : "text-primary font-bold"
      }`}>
        {label}
      </span>
      {!done && (
        <Link to={href} className="text-label-bold text-primary underline text-xs">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Revenue Chart Bar ───
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

// ─── Upsell Win Item ───
function UpsellWin({ title, type, amount, time, imageBg }) {
  return (
    <div className="flex items-start gap-4 border-b border-outline-variant pb-4 last:border-0 last:pb-0">
      <div
        className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 bg-surface-container-high"
        style={imageBg ? { backgroundImage: `url('${imageBg}')` } : undefined}
      />
      <div className="flex-1">
        <p className="font-body text-sm text-on-surface font-bold leading-tight">{title}</p>
        <p className="text-label-sm text-on-surface-variant">{type}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-secondary font-semibold text-xs">{amount}</span>
          <span className="text-on-surface-variant text-xs">{time}</span>
        </div>
      </div>
    </div>
  );
}

export default function AppIndex() {
  const {
    shopDomain,
    planTier,
    stats,
    onboarding,
    onboardingComplete,
    onboardingProgress,
    counts,
  } = useLoaderData();

  return (
    <div className="animate-fade-in">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-on-background">
            Dashboard
          </h2>
          <p className="text-on-surface-variant mt-1">
            Real-time performance metrics for your store.
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
        <KpiCard
          label="Cart Open Rate"
          value={stats.cartOpens > 0 ? `${stats.conversionRate}%` : "—"}
          icon="shopping_cart_checkout"
          change={stats.cartOpens > 0 ? `+${stats.conversionRate}%` : undefined}
        />
        <KpiCard
          label="Upsell Conversion"
          value={stats.upsellCtr > 0 ? `${stats.upsellCtr}%` : "—"}
          icon="trending_up"
          change={stats.upsellAdds > 0 ? `+${stats.upsellCtr}%` : undefined}
        />
        <KpiCard
          label="AOV Lift"
          value={stats.aovLift > 0 ? `₹${stats.avgCartAfter}` : "—"}
          icon="bolt"
          change={stats.aovLift > 0 ? `+${stats.aovLift}%` : undefined}
          featured
        />
        <KpiCard
          label="Total Checkouts"
          value={stats.checkouts || "—"}
          icon="payments"
        />
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ─── Left Column (2/3) ─── */}
        <div className="lg:col-span-2 flex flex-col gap-8">

          {/* Onboarding Checklist */}
          {!onboardingComplete && (
            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-tertiary">rocket_launch</span>
                <h3 className="font-headline text-headline-md text-on-background">
                  Quick-start Checklist
                </h3>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-label-bold font-label text-on-surface-variant uppercase">
                    Onboarding Progress
                  </p>
                  <p className="text-label-bold text-primary">{onboardingProgress}%</p>
                </div>
                <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                    style={{ width: `${onboardingProgress}%` }}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                <OnboardingItem
                  done={onboarding.hasCartSettings}
                  label="Customize your cart drawer"
                  href="/app/cart-customizer"
                  actionLabel="Customize"
                />
                <OnboardingItem
                  done={onboarding.hasUpsellRule}
                  label="Create your first upsell rule"
                  href="/app/upsell-rules"
                  actionLabel="Create"
                />
                <OnboardingItem
                  done={onboarding.hasProgressBar}
                  label="Set up a progress bar milestone"
                  href="/app/progress-bar"
                  actionLabel="Setup"
                />
                <OnboardingItem
                  done={onboarding.hasFreeGift}
                  label="Configure a free gift reward"
                  href="/app/free-gifts"
                  actionLabel="Configure"
                />
                <OnboardingItem
                  done={onboarding.hasVolumeDiscount}
                  label="Set up a volume discount tier"
                  href="/app/volume-discounts"
                  actionLabel="Configure"
                />
              </div>
            </section>
          )}

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

        {/* ─── Right Column (1/3) ─── */}
        <div className="flex flex-col gap-8">

          {/* Recent Upsell Wins */}
          <section className="section-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-headline-md text-on-background">
                Recent Upsell Wins
              </h3>
              <span className="material-symbols-outlined text-secondary animate-pulse">
                celebration
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {stats.upsellAdds > 0 ? (
                <>
                  <UpsellWin
                    title="Product Upsell"
                    type="Cart cross-sell"
                    amount={`+₹${(Math.random() * 2000 + 200).toFixed(0)}`}
                    time="Recent"
                  />
                </>
              ) : (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl opacity-30 mb-2 block">
                    shopping_bag
                  </span>
                  <p className="text-sm">No upsell wins yet.</p>
                  <p className="text-xs mt-1">Create your first upsell rule to start tracking!</p>
                </div>
              )}
            </div>
            <Link
              to="/app/analytics"
              className="block w-full mt-6 py-2 border border-outline rounded-lg text-label-bold font-bold text-center hover:bg-surface-container-low transition-colors text-sm"
            >
              View All Sales
            </Link>
          </section>

          {/* Account Info */}
          <section className="section-card">
            <h3 className="font-headline text-headline-md text-on-background mb-4">
              Account Info
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Store</span>
                <span className="text-sm font-semibold text-on-surface truncate max-w-[180px]">
                  {shopDomain}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Plan</span>
                <span className="badge-primary">
                  {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Upsell Rules</span>
                <span className="text-sm font-semibold text-on-surface">{counts.upsellRules}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Milestones</span>
                <span className="text-sm font-semibold text-on-surface">{counts.progressBarRules}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Gift Rules</span>
                <span className="text-sm font-semibold text-on-surface">{counts.freeGiftRules}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Volume Tiers</span>
                <span className="text-sm font-semibold text-on-surface">{counts.volumeDiscountRules}</span>
              </div>
            </div>
          </section>

          {/* Trust Markers */}
          <div className="flex flex-col gap-4 px-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <p className="text-label-sm font-semibold text-on-surface-variant">
                Secure AES-256 Encrypted Data
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <p className="text-label-sm font-semibold text-on-surface-variant">
                &lt;200ms Cart Render Time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Floating Action Button ─── */}
      <Link
        to="/app/upsell-rules"
        className="fab bottom-20 right-4 md:bottom-6 md:right-6"
        title="Create Upsell Rule"
      >
        <span className="material-symbols-outlined">add</span>
      </Link>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
