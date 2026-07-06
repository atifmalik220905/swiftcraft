/**
 * SwiftCart — Urgency & Timer Settings
 * Countdown timer, low stock warnings, social proof.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  getMerchant,
  upsertCountdownSettings,
  upsertCartSettings,
} from "../supabase-db.server";
import { invalidateShopCache } from "../utils/cache";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchantWithRelations(session.shop, {
    countdownSettings: true,
    cartSettings: true,
  });

  return {
    countdown: merchant?.countdownSettings || null,
    showLowStock: merchant?.cartSettings?.showLowStock ?? true,
    showSocialProof: merchant?.cartSettings?.showSocialProof ?? false,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const merchant = await getMerchant(session.shop);
  if (!merchant) return { error: "Merchant not found" };

  // Save countdown settings
  await upsertCountdownSettings(merchant.id, {
    enabled: formData.get("enabled") === "true",
    durationMinutes: parseInt(formData.get("durationMinutes")) || 15,
    resetType: formData.get("resetType") || "session",
    message: formData.get("message") || "Checkout within {time} to get free shipping today!",
    textColor: formData.get("textColor") || "#E74C3C",
    backgroundColor: formData.get("backgroundColor") || "#FFF3F3",
  });

  // Save cart settings for low stock & social proof
  await upsertCartSettings(merchant.id, {
    showLowStock: formData.get("showLowStock") === "true",
    showSocialProof: formData.get("showSocialProof") === "true",
    showCountdown: formData.get("enabled") === "true",
  });

  await invalidateShopCache(session.shop);

  return { success: true };
};

export default function Urgency() {
  const { countdown, showLowStock, showSocialProof } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const c = countdown || {};
  const [form, setForm] = useState({
    enabled: c.enabled ?? false,
    durationMinutes: c.durationMinutes || 15,
    resetType: c.resetType || "session",
    message: c.message || "Checkout within {time} to get free shipping today!",
    textColor: c.textColor || "#E74C3C",
    backgroundColor: c.backgroundColor || "#FFF3F3",
    showLowStock: showLowStock,
    showSocialProof: showSocialProof,
  });

  const handleSave = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Urgency settings saved!");
  };

  return (
    <s-page heading="Urgency & Timers">
      <s-button slot="primary-action" onClick={handleSave}>
        Save Settings
      </s-button>

      <s-section heading="⏰ Countdown Timer">
        <s-stack direction="block" gap="base">
          <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
            />
            <span className="text-body-md text-on-surface font-medium">Enable countdown timer in cart</span>
          </label>

          <s-text-field
            label="Timer Duration (minutes)"
            type="number"
            value={String(form.durationMinutes)}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: parseInt(e.target.value) || 15 }))}
          />

          <SelectField
            label="Reset Type"
            value={form.resetType}
            onChange={(e) => setForm((p) => ({ ...p, resetType: e.target.value }))}
          >
            <option value="session">Session-based (resets on new visit)</option>
            <option value="daily">Daily reset (same time every day)</option>
          </SelectField>

          <s-text-field
            label="Timer Message"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            helpText="Use {time} for the countdown display"
          />
        </s-stack>
      </s-section>

      <s-section heading="🔥 Low Stock Signals">
        <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
          <input
            type="checkbox"
            checked={form.showLowStock}
            onChange={(e) => setForm((p) => ({ ...p, showLowStock: e.target.checked }))}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
          />
          <span className="text-body-md text-on-surface font-medium">Show "Only X left in stock" for low-inventory items</span>
        </label>
      </s-section>

      <s-section heading="👥 Social Proof">
        <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
          <input
            type="checkbox"
            checked={form.showSocialProof}
            onChange={(e) => setForm((p) => ({ ...p, showSocialProof: e.target.checked }))}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
          />
          <span className="text-body-md text-on-surface font-medium">Show "X people have this in their cart right now"</span>
        </label>
      </s-section>

      {/* Save Settings visible at bottom */}
      <s-box padding="base" className="flex justify-end gap-base border-t border-outline-variant mt-lg pt-base">
        <s-button onClick={handleSave} style={{ minWidth: "150px" }}>
          Save Settings
        </s-button>
      </s-box>

      <s-section slot="aside" heading="Why Urgency Works">
        <s-paragraph>
          Urgency signals like countdown timers and low stock warnings create
          FOMO (Fear Of Missing Out), which has been shown to increase
          conversion rates by 10-30%.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

function SelectField({ label, value, onChange, children }) {
  return (
    <s-stack direction="block" gap="tight">
      {label && <s-text>{label}</s-text>}
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-2 px-3 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
      >
        {children}
      </select>
    </s-stack>
  );
}
