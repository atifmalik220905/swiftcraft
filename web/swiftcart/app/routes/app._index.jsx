/**
 * SwiftCart — Home / Overview Dashboard
 * Shows live KPIs, quick alerts, and onboarding status.
 */

import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Find or create merchant record
  let merchant = await prisma.merchant.findUnique({
    where: { shopDomain },
    include: {
      cartSettings: true,
      upsellRules: { where: { isActive: true } },
      progressBarRules: { where: { isActive: true } },
      freeGiftRules: { where: { isActive: true } },
    },
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        shopDomain,
        accessToken: session.accessToken || "",
        cartSettings: { create: {} },
      },
      include: {
        cartSettings: true,
        upsellRules: true,
        progressBarRules: true,
        freeGiftRules: true,
      },
    });
  }

  // Fetch analytics summary (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.cartEvent.findMany({
    where: {
      merchantId: merchant.id,
      occurredAt: { gte: thirtyDaysAgo },
    },
    select: {
      eventType: true,
      cartValueBefore: true,
      cartValueAfter: true,
      deviceType: true,
    },
  });

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
  };
  const onboardingComplete = Object.values(onboarding).every(Boolean);

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
    counts: {
      upsellRules: merchant.upsellRules.length,
      progressBarRules: merchant.progressBarRules.length,
      freeGiftRules: merchant.freeGiftRules.length,
    },
  };
};

export default function AppIndex() {
  const {
    shopDomain,
    planTier,
    stats,
    onboarding,
    onboardingComplete,
    counts,
  } = useLoaderData();

  return (
    <s-page heading="SwiftCart Dashboard">
      {/* Onboarding Banner */}
      {!onboardingComplete && (
        <s-section heading="🚀 Get Started with SwiftCart">
          <s-paragraph>
            Complete these steps to start boosting your AOV:
          </s-paragraph>
          <s-stack direction="block" gap="base">
            <OnboardingItem
              done={onboarding.hasCartSettings}
              label="Customize your cart drawer"
              href="/app/cart-customizer"
            />
            <OnboardingItem
              done={onboarding.hasUpsellRule}
              label="Create your first upsell rule"
              href="/app/upsell-rules"
            />
            <OnboardingItem
              done={onboarding.hasProgressBar}
              label="Set up a progress bar milestone"
              href="/app/progress-bar"
            />
            <OnboardingItem
              done={onboarding.hasFreeGift}
              label="Configure a free gift reward"
              href="/app/free-gifts"
            />
          </s-stack>
        </s-section>
      )}

      {/* KPI Cards */}
      <s-section heading="Last 30 Days Performance">
        <s-stack direction="inline" gap="base" wrap>
          <KpiCard title="Cart Opens" value={stats.cartOpens} icon="🛒" />
          <KpiCard title="Checkouts" value={stats.checkouts} icon="✅" />
          <KpiCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon="📈"
          />
          <KpiCard
            title="Upsell Adds"
            value={stats.upsellAdds}
            icon="🎯"
          />
          <KpiCard
            title="AOV Lift"
            value={`${stats.aovLift}%`}
            icon="💰"
          />
          <KpiCard
            title="Upsell CTR"
            value={`${stats.upsellCtr}%`}
            icon="👆"
          />
        </s-stack>
      </s-section>

      {/* Quick Info */}
      <s-section slot="aside" heading="Account Info">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text fontWeight="bold">Store: </s-text>
            <s-text>{shopDomain}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="bold">Plan: </s-text>
            <s-text>
              {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="bold">Active Upsell Rules: </s-text>
            <s-text>{counts.upsellRules}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="bold">Progress Milestones: </s-text>
            <s-text>{counts.progressBarRules}</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="bold">Free Gift Rules: </s-text>
            <s-text>{counts.freeGiftRules}</s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Quick Actions">
        <s-stack direction="block" gap="base">
          <s-button href="/app/cart-customizer" variant="secondary">
            🎨 Customize Cart
          </s-button>
          <s-button href="/app/upsell-rules" variant="secondary">
            ➕ Add Upsell Rule
          </s-button>
          <s-button href="/app/analytics" variant="secondary">
            📊 View Analytics
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function KpiCard({ title, value, icon }) {
  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="large"
      background="subdued"
      minInlineSize="150px"
    >
      <s-stack direction="block" gap="tight">
        <s-text>{icon} {title}</s-text>
        <s-text fontWeight="bold" fontSize="heading-lg">
          {value}
        </s-text>
      </s-stack>
    </s-box>
  );
}

function OnboardingItem({ done, label, href }) {
  return (
    <s-stack direction="inline" gap="tight" blockAlignment="center">
      <s-text>{done ? "✅" : "⬜"}</s-text>
      {done ? (
        <s-text>{label}</s-text>
      ) : (
        <s-link href={href}>{label}</s-link>
      )}
    </s-stack>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
