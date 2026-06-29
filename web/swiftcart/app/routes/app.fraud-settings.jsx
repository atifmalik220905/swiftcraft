/**
 * SwiftCart — Fraud & RTO Settings
 * Pincode blocklist, COD OTP rules, address checks.
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
    include: { fraudSettings: true },
  });
  return { fraud: merchant?.fraudSettings || null };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
  });
  if (!merchant) return { error: "Merchant not found" };

  await prisma.fraudSettings.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      enablePincodeBlock: formData.get("enablePincodeBlock") === "true",
      blockedPincodes: formData.get("blockedPincodes") || "[]",
      enableCodOtp: formData.get("enableCodOtp") === "true",
      codOtpThreshold: parseFloat(formData.get("codOtpThreshold")) || 5000,
      hideCodAbove: formData.get("hideCodAbove") ? parseFloat(formData.get("hideCodAbove")) : null,
      enableAddressCheck: formData.get("enableAddressCheck") === "true",
    },
    update: {
      enablePincodeBlock: formData.get("enablePincodeBlock") === "true",
      blockedPincodes: formData.get("blockedPincodes") || "[]",
      enableCodOtp: formData.get("enableCodOtp") === "true",
      codOtpThreshold: parseFloat(formData.get("codOtpThreshold")) || 5000,
      hideCodAbove: formData.get("hideCodAbove") ? parseFloat(formData.get("hideCodAbove")) : null,
      enableAddressCheck: formData.get("enableAddressCheck") === "true",
    },
  });

  return { success: true };
};

export default function FraudSettings() {
  const { fraud } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const f = fraud || {};
  const [form, setForm] = useState({
    enablePincodeBlock: f.enablePincodeBlock ?? false,
    blockedPincodes: f.blockedPincodes || "[]",
    enableCodOtp: f.enableCodOtp ?? false,
    codOtpThreshold: f.codOtpThreshold || 5000,
    hideCodAbove: f.hideCodAbove || "",
    enableAddressCheck: f.enableAddressCheck ?? false,
  });

  const handleSave = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Fraud settings saved!");
  };

  // Parse pincode list for display
  let pincodeList = [];
  try {
    pincodeList = JSON.parse(form.blockedPincodes);
  } catch { pincodeList = []; }

  return (
    <s-page heading="Fraud & RTO Settings">
      <s-button slot="primary-action" onClick={handleSave}>Save Settings</s-button>

      <s-section heading="📍 Pincode Blocklist">
        <s-stack direction="block" gap="base">
          <s-checkbox
            checked={form.enablePincodeBlock}
            onChange={(e) => setForm((p) => ({ ...p, enablePincodeBlock: e.target.checked }))}
          >
            Enable high-RTO pincode blocking
          </s-checkbox>
          <s-text-field
            label="Blocked Pincodes (JSON Array)"
            value={form.blockedPincodes}
            onChange={(e) => setForm((p) => ({ ...p, blockedPincodes: e.target.value }))}
            multiline={3}
            helpText='e.g., ["110001", "400001", "560001"]. Orders from these pincodes will show a warning.'
          />
          <s-paragraph>
            <s-text tone="subdued">
              Currently blocking {pincodeList.length} pincode(s).
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="📱 COD OTP Verification">
        <s-stack direction="block" gap="base">
          <s-checkbox
            checked={form.enableCodOtp}
            onChange={(e) => setForm((p) => ({ ...p, enableCodOtp: e.target.checked }))}
          >
            Require OTP verification for COD orders
          </s-checkbox>
          <s-text-field
            label="OTP Threshold (₹)"
            type="number"
            value={String(form.codOtpThreshold)}
            onChange={(e) => setForm((p) => ({ ...p, codOtpThreshold: parseFloat(e.target.value) || 0 }))}
            helpText="Only require OTP for COD orders above this amount"
          />
        </s-stack>
      </s-section>

      <s-section heading="🚫 Hide COD">
        <s-text-field
          label="Hide COD Above (₹)"
          type="number"
          value={String(form.hideCodAbove)}
          onChange={(e) => setForm((p) => ({ ...p, hideCodAbove: e.target.value }))}
          helpText="Leave empty to always show COD. Set a value to hide COD for orders above this amount."
        />
      </s-section>

      <s-section heading="📋 Address Intelligence">
        <s-checkbox
          checked={form.enableAddressCheck}
          onChange={(e) => setForm((p) => ({ ...p, enableAddressCheck: e.target.checked }))}
        >
          Warn if shipping address appears incomplete
        </s-checkbox>
      </s-section>

      <s-section slot="aside" heading="Why Fraud Prevention Matters">
        <s-paragraph>
          Indian D2C brands face 15-30% RTO rates on COD orders. SwiftCart helps
          reduce this by flagging risky orders before they ship.
        </s-paragraph>
        <s-paragraph>
          <s-text fontWeight="bold">Phase 2:</s-text> Shiprocket RTO Intelligence
          API integration for pincode-level risk scoring.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
