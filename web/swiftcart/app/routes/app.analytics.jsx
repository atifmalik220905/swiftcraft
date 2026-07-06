/**
 * SwiftCart — Analytics Dashboard
 * Cart performance metrics, upsell tracking, AOV analysis.
 */

import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getMerchant, getCartEvents } from "../supabase-db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchant(session.shop);

  if (!merchant) return { stats: null, daily: [], topUpsells: [] };

  // Aggregate events for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const allEvents = await getCartEvents(merchant.id, thirtyDaysAgo);

  const recentEvents = allEvents.filter(
    (e) => new Date(e.occurredAt) >= sevenDaysAgo
  );

  // Key metrics
  const cartOpens30d = allEvents.filter((e) => e.eventType === "cart_open").length;
  const checkouts30d = allEvents.filter((e) => e.eventType === "checkout").length;
  const upsellClicks30d = allEvents.filter((e) => e.eventType === "upsell_click").length;
  const upsellAdds30d = allEvents.filter((e) => e.eventType === "upsell_add").length;
  const giftsUnlocked30d = allEvents.filter((e) => e.eventType === "gift_unlocked").length;
  const couponsApplied30d = allEvents.filter((e) => e.eventType === "coupon_applied").length;

  const cartOpens7d = recentEvents.filter((e) => e.eventType === "cart_open").length;
  const checkouts7d = recentEvents.filter((e) => e.eventType === "checkout").length;

  const convRate30d = cartOpens30d > 0 ? ((checkouts30d / cartOpens30d) * 100).toFixed(1) : "0.0";
  const convRate7d = cartOpens7d > 0 ? ((checkouts7d / cartOpens7d) * 100).toFixed(1) : "0.0";
  const upsellCtr = upsellClicks30d > 0 ? ((upsellAdds30d / upsellClicks30d) * 100).toFixed(1) : "0.0";

  // AOV calculations
  const beforeValues = allEvents.filter((e) => e.cartValueBefore > 0).map((e) => e.cartValueBefore);
  const afterValues = allEvents.filter((e) => e.cartValueAfter > 0).map((e) => e.cartValueAfter);
  const avgBefore = beforeValues.length > 0 ? (beforeValues.reduce((a, b) => a + b, 0) / beforeValues.length) : 0;
  const avgAfter = afterValues.length > 0 ? (afterValues.reduce((a, b) => a + b, 0) / afterValues.length) : 0;
  const aovLift = avgBefore > 0 ? (((avgAfter - avgBefore) / avgBefore) * 100).toFixed(1) : "0.0";

  // Device breakdown
  const mobileEvents = allEvents.filter((e) => e.deviceType === "mobile").length;
  const desktopEvents = allEvents.filter((e) => e.deviceType === "desktop").length;
  const tabletEvents = allEvents.filter((e) => e.deviceType === "tablet").length;
  const totalDeviceEvents = mobileEvents + desktopEvents + tabletEvents || 1;

  // Daily breakdown (last 7 days)
  const dailyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { date: key, cartOpens: 0, checkouts: 0, upsellAdds: 0 };
  }
  for (const event of recentEvents) {
    const key = new Date(event.occurredAt).toISOString().split("T")[0];
    if (dailyMap[key]) {
      if (event.eventType === "cart_open") dailyMap[key].cartOpens++;
      if (event.eventType === "checkout") dailyMap[key].checkouts++;
      if (event.eventType === "upsell_add") dailyMap[key].upsellAdds++;
    }
  }

  // Top performing upsell rules
  const ruleHits = {};
  for (const event of allEvents) {
    if (event.upsellRuleId && event.eventType === "upsell_add") {
      ruleHits[event.upsellRuleId] = (ruleHits[event.upsellRuleId] || 0) + 1;
    }
  }
  const topUpsellRuleIds = Object.entries(ruleHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ ruleId: id, addCount: count }));

  return {
    stats: {
      cartOpens30d,
      checkouts30d,
      convRate30d,
      convRate7d,
      upsellClicks30d,
      upsellAdds30d,
      upsellCtr,
      giftsUnlocked30d,
      couponsApplied30d,
      avgBefore: avgBefore.toFixed(0),
      avgAfter: avgAfter.toFixed(0),
      aovLift,
      deviceBreakdown: {
        mobile: ((mobileEvents / totalDeviceEvents) * 100).toFixed(0),
        desktop: ((desktopEvents / totalDeviceEvents) * 100).toFixed(0),
        tablet: ((tabletEvents / totalDeviceEvents) * 100).toFixed(0),
      },
    },
    daily: Object.values(dailyMap),
    topUpsells: topUpsellRuleIds,
    totalEvents: allEvents.length,
  };
};

export default function Analytics() {
  const { stats, daily, topUpsells, totalEvents } = useLoaderData();

  if (!stats) {
    return (
      <s-page heading="Analytics">
        <s-section>
          <s-box padding="large" borderWidth="base" borderRadius="large">
            <s-stack direction="block" gap="base" inlineAlignment="center">
              <s-text fontSize="heading-lg">📊</s-text>
              <s-text fontWeight="bold">No data yet</s-text>
              <s-paragraph>
                Analytics will appear once customers start interacting with your cart.
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Analytics Dashboard">
      {/* Summary Cards */}
      <s-section heading="30-Day Summary">
        <s-stack direction="inline" gap="base" wrap>
          <MetricCard icon="🛒" title="Cart Opens" value={stats.cartOpens30d} />
          <MetricCard icon="✅" title="Checkouts" value={stats.checkouts30d} />
          <MetricCard icon="📈" title="Conversion (30d)" value={stats.convRate30d + "%"} />
          <MetricCard icon="📈" title="Conversion (7d)" value={stats.convRate7d + "%"} />
          <MetricCard icon="🎯" title="Upsell Clicks" value={stats.upsellClicks30d} />
          <MetricCard icon="➕" title="Upsell Adds" value={stats.upsellAdds30d} />
          <MetricCard icon="👆" title="Upsell CTR" value={stats.upsellCtr + "%"} />
          <MetricCard icon="🎁" title="Gifts Unlocked" value={stats.giftsUnlocked30d} />
          <MetricCard icon="🏷️" title="Coupons Used" value={stats.couponsApplied30d} />
        </s-stack>
      </s-section>

      {/* AOV Analysis */}
      <s-section heading="💰 AOV Analysis">
        <s-stack direction="inline" gap="large" wrap>
          <s-box padding="base" borderWidth="base" borderRadius="large" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text tone="subdued">Avg Cart Before SwiftCart</s-text>
              <s-text fontWeight="bold" fontSize="heading-lg">₹{stats.avgBefore}</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="large" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text tone="subdued">Avg Cart After SwiftCart</s-text>
              <s-text fontWeight="bold" fontSize="heading-lg">₹{stats.avgAfter}</s-text>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="large" background="success">
            <s-stack direction="block" gap="tight">
              <s-text>AOV Lift</s-text>
              <s-text fontWeight="bold" fontSize="heading-lg">+{stats.aovLift}%</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Daily Breakdown Table */}
      <s-section heading="📅 Last 7 Days">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Date</th>
                <th style={{ padding: "8px" }}>Cart Opens</th>
                <th style={{ padding: "8px" }}>Checkouts</th>
                <th style={{ padding: "8px" }}>Upsell Adds</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px" }}>{d.date}</td>
                  <td style={{ padding: "8px" }}>{d.cartOpens}</td>
                  <td style={{ padding: "8px" }}>{d.checkouts}</td>
                  <td style={{ padding: "8px" }}>{d.upsellAdds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </s-box>
      </s-section>

      {/* Device Breakdown */}
      <s-section slot="aside" heading="📱 Device Breakdown">
        <s-stack direction="block" gap="base">
          <DeviceBar label="Mobile" pct={stats.deviceBreakdown.mobile} color="#6C5CE7" />
          <DeviceBar label="Desktop" pct={stats.deviceBreakdown.desktop} color="#00B894" />
          <DeviceBar label="Tablet" pct={stats.deviceBreakdown.tablet} color="#FDCB6E" />
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="📊 Total Events">
        <s-text fontWeight="bold" fontSize="heading-lg">{totalEvents}</s-text>
        <s-text tone="subdued"> events tracked (30 days)</s-text>
      </s-section>
    </s-page>
  );
}

function MetricCard({ icon, title, value }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="large" background="subdued" minInlineSize="130px">
      <s-stack direction="block" gap="tight">
        <s-text variant="bodySm">{icon} {title}</s-text>
        <s-text fontWeight="bold" fontSize="heading-md">{value}</s-text>
      </s-stack>
    </s-box>
  );
}

function DeviceBar({ label, pct, color }) {
  return (
    <s-stack direction="block" gap="tight">
      <s-stack direction="inline" gap="base" inlineAlignment="space-between">
        <s-text>{label}</s-text>
        <s-text fontWeight="bold">{pct}%</s-text>
      </s-stack>
      <div style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: "4px" }} />
      </div>
    </s-stack>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
