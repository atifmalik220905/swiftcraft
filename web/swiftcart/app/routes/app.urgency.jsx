/**
 * SwiftCart — Urgency & Timer Settings
 * Countdown timer, low stock warnings, social proof.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    include: { countdownSettings: true, cartSettings: true },
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

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
  });
  if (!merchant) return { error: "Merchant not found" };

  // Save countdown settings
  await prisma.countdownSettings.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      enabled: formData.get("enabled") === "true",
      durationMinutes: parseInt(formData.get("durationMinutes")) || 15,
      resetType: formData.get("resetType") || "session",
      message: formData.get("message") || "Checkout within {time} to get free shipping today!",
      textColor: formData.get("textColor") || "#E74C3C",
      backgroundColor: formData.get("backgroundColor") || "#FFF3F3",
    },
    update: {
      enabled: formData.get("enabled") === "true",
      durationMinutes: parseInt(formData.get("durationMinutes")) || 15,
      resetType: formData.get("resetType") || "session",
      message: formData.get("message"),
      textColor: formData.get("textColor") || "#E74C3C",
      backgroundColor: formData.get("backgroundColor") || "#FFF3F3",
    },
  });

  // Save cart settings for low stock & social proof
  await prisma.cartSettings.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      showLowStock: formData.get("showLowStock") === "true",
      showSocialProof: formData.get("showSocialProof") === "true",
      showCountdown: formData.get("enabled") === "true",
    },
    update: {
      showLowStock: formData.get("showLowStock") === "true",
      showSocialProof: formData.get("showSocialProof") === "true",
      showCountdown: formData.get("enabled") === "true",
    },
  });

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
          <s-checkbox
            checked={form.enabled}
            onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
          >
            Enable countdown timer in cart
          </s-checkbox>

          <s-text-field
            label="Timer Duration (minutes)"
            type="number"
            value={String(form.durationMinutes)}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: parseInt(e.target.value) || 15 }))}
          />

          <s-select
            label="Reset Type"
            value={form.resetType}
            onChange={(e) => setForm((p) => ({ ...p, resetType: e.target.value }))}
          >
            <option value="session">Session-based (resets on new visit)</option>
            <option value="daily">Daily reset (same time every day)</option>
          </s-select>

          <s-text-field
            label="Timer Message"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            helpText="Use {time} for the countdown display"
          />
        </s-stack>
      </s-section>

      <s-section heading="🔥 Low Stock Signals">
        <s-checkbox
          checked={form.showLowStock}
          onChange={(e) => setForm((p) => ({ ...p, showLowStock: e.target.checked }))}
        >
          Show "Only X left in stock" for low-inventory items
        </s-checkbox>
      </s-section>

      <s-section heading="👥 Social Proof">
        <s-checkbox
          checked={form.showSocialProof}
          onChange={(e) => setForm((p) => ({ ...p, showSocialProof: e.target.checked }))}
        >
          Show "X people have this in their cart right now"
        </s-checkbox>
      </s-section>

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
