/**
 * SwiftCart — Fraud & RTO Settings
 * Pincode blocklist, COD OTP rules, address checks.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  getMerchant,
  upsertFraudSettings,
} from "../supabase-db.server";
import { invalidateShopCache } from "../utils/cache";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchantWithRelations(session.shop, {
    fraudSettings: true,
  });
  return { fraud: merchant?.fraudSettings || null };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const merchant = await getMerchant(session.shop);
  if (!merchant) return { error: "Merchant not found" };

  await upsertFraudSettings(merchant.id, {
    enablePincodeBlock: formData.get("enablePincodeBlock") === "true",
    blockedPincodes: formData.get("blockedPincodes") || "[]",
    enableCodOtp: formData.get("enableCodOtp") === "true",
    codOtpThreshold: parseFloat(formData.get("codOtpThreshold")) || 5000,
    hideCodAbove: formData.get("hideCodAbove") ? parseFloat(formData.get("hideCodAbove")) : null,
    enableAddressCheck: formData.get("enableAddressCheck") === "true",
  });

  await invalidateShopCache(session.shop);

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

  const [newPincode, setNewPincode] = useState("");

  const handleSave = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Fraud settings saved!");
  };

  const handleAddPincode = () => {
    const trimmed = newPincode.trim();
    if (!trimmed) return;

    let list = [];
    try {
      list = JSON.parse(form.blockedPincodes);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    if (list.includes(trimmed)) {
      shopify.toast.show("Pincode is already blocked!");
      return;
    }

    const newList = [...list, trimmed];
    setForm((prev) => ({ ...prev, blockedPincodes: JSON.stringify(newList) }));
    setNewPincode("");
    shopify.toast.show(`Pincode ${trimmed} added to blocklist`);
  };

  const handleDeletePincode = (code) => {
    let list = [];
    try {
      list = JSON.parse(form.blockedPincodes);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    const newList = list.filter((item) => item !== code);
    setForm((prev) => ({ ...prev, blockedPincodes: JSON.stringify(newList) }));
    shopify.toast.show(`Pincode ${code} removed`);
  };

  // Parse pincode list for display
  let pincodeList = [];
  try {
    pincodeList = JSON.parse(form.blockedPincodes);
  } catch {
    pincodeList = [];
  }

  return (
    <s-page heading="Fraud & RTO Settings">
      <s-button slot="primary-action" onClick={handleSave}>Save Settings</s-button>

      <s-section heading="📍 Pincode Blocklist">
        <s-stack direction="block" gap="base">
          <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
            <input
              type="checkbox"
              checked={form.enablePincodeBlock}
              onChange={(e) => setForm((p) => ({ ...p, enablePincodeBlock: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
            />
            <span className="text-body-md text-on-surface font-medium">Enable high-RTO pincode blocking</span>
          </label>

          {form.enablePincodeBlock && (
            <s-stack direction="block" gap="sm">
              <s-stack direction="inline" gap="sm" blockAlignment="end">
                <div style={{ flex: 1 }}>
                  <s-text-field
                    label="Pincode to Block"
                    value={newPincode}
                    placeholder="e.g., 110001"
                    onChange={(e) => setNewPincode(e.target.value)}
                  />
                </div>
                <s-button onClick={handleAddPincode}>
                  Block Pincode
                </s-button>
              </s-stack>

              <s-text fontWeight="bold">Blocked Pincodes ({pincodeList.length})</s-text>
              {pincodeList.length === 0 ? (
                <s-text tone="subdued">No pincodes blocked yet.</s-text>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {pincodeList.map((code) => (
                    <div
                      key={code}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 12px",
                        background: "var(--color-surface-container-low, #f0f3ff)",
                        border: "1px solid var(--color-outline-variant, #c5c5d4)",
                        borderRadius: "8px",
                      }}
                    >
                      <s-text fontWeight="medium">{code}</s-text>
                      <button
                        onClick={() => handleDeletePincode(code)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ba1a1a",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                          padding: "0 4px",
                        }}
                        title="Remove Pincode"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-section heading="📱 COD OTP Verification">
        <s-stack direction="block" gap="base">
          <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
            <input
              type="checkbox"
              checked={form.enableCodOtp}
              onChange={(e) => setForm((p) => ({ ...p, enableCodOtp: e.target.checked }))}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
            />
            <span className="text-body-md text-on-surface font-medium">Require OTP verification for COD orders</span>
          </label>
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
        <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
          <input
            type="checkbox"
            checked={form.enableAddressCheck}
            onChange={(e) => setForm((p) => ({ ...p, enableAddressCheck: e.target.checked }))}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
          />
          <span className="text-body-md text-on-surface font-medium">Warn if shipping address appears incomplete</span>
        </label>
      </s-section>

      {/* Save Settings visible at bottom */}
      <s-box padding="base" className="flex justify-end gap-base border-t border-outline-variant mt-lg pt-base">
        <s-button onClick={handleSave} style={{ minWidth: "150px" }}>
          Save Settings
        </s-button>
      </s-box>

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
