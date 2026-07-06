/**
 * SwiftCart — Free Gifts Configuration
 * Manage gift products and unlock thresholds.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  getMerchant,
  createFreeGiftRule,
  deleteFreeGiftRule,
  toggleFreeGiftRule,
} from "../supabase-db.server";
import { invalidateShopCache } from "../utils/cache";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchantWithRelations(session.shop, {
    freeGiftRules: true,
  });

  const planLimits = { starter: 1, growth: 3, scale: 999, enterprise: 999 };
  return {
    gifts: merchant?.freeGiftRules || [],
    planTier: merchant?.planTier || "starter",
    maxGifts: planLimits[merchant?.planTier || "starter"] || 1,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const merchant = await getMerchant(session.shop);
  if (!merchant) return { error: "Merchant not found" };

  let result = { error: "Unknown action" };
  switch (intent) {
    case "create": {
      await createFreeGiftRule({
        merchantId: merchant.id,
        giftProductId: formData.get("giftProductId") || "",
        giftProductTitle: formData.get("giftProductTitle") || "",
        thresholdAmount: parseFloat(formData.get("thresholdAmount")) || 1499,
        allowChoice: formData.get("allowChoice") === "true",
        choiceCollectionId: formData.get("choiceCollectionId") || null,
        isActive: true,
      });
      result = { success: true };
      break;
    }
    case "delete": {
      await deleteFreeGiftRule(formData.get("giftId"));
      result = { success: true };
      break;
    }
    case "toggle": {
      await toggleFreeGiftRule(formData.get("giftId"));
      result = { success: true };
      break;
    }
  }

  if (result.success) {
    await invalidateShopCache(session.shop);
  }

  return result;
};

export default function FreeGifts() {
  const { gifts, planTier, maxGifts } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [showForm, setShowForm] = useState(false);

  const canAddMore = gifts.length < maxGifts;

  return (
    <s-page heading="Free Gifts">
      <s-button slot="primary-action" disabled={!canAddMore} onClick={() => setShowForm(true)}>
        + Add Gift Rule
      </s-button>

      <s-section heading={`Gift Rules (${gifts.length}/${maxGifts})`}>
        {gifts.length === 0 ? (
          <s-box padding="large" borderWidth="base" borderRadius="large">
            <s-stack direction="block" gap="base" inlineAlignment="center">
              <s-text fontSize="heading-lg">🎁</s-text>
              <s-text fontWeight="bold">No free gifts configured</s-text>
              <s-paragraph>
                Set up auto-added gifts when customers reach a cart threshold.
              </s-paragraph>
              <s-button onClick={() => setShowForm(true)}>Create First Gift</s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {gifts.map((g) => (
              <s-box key={g.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="inline" gap="base" blockAlignment="center" inlineAlignment="space-between">
                  <s-stack direction="block" gap="tight">
                    <s-text fontWeight="bold">🎁 {g.giftProductTitle || "Gift Product"}</s-text>
                    <s-text variant="bodySm" tone="subdued">
                      Unlock at ₹{g.thresholdAmount} · {g.isActive ? "Active" : "Paused"}
                    </s-text>
                  </s-stack>
                  <s-stack direction="inline" gap="tight">
                    <s-button variant="tertiary" onClick={() => {
                      const fd = new FormData();
                      fd.append("intent", "toggle"); fd.append("giftId", g.id);
                      fetcher.submit(fd, { method: "POST" });
                    }}>{g.isActive ? "Pause" : "Activate"}</s-button>
                    <s-button variant="tertiary" tone="critical" onClick={() => {
                      const fd = new FormData();
                      fd.append("intent", "delete"); fd.append("giftId", g.id);
                      fetcher.submit(fd, { method: "POST" });
                      shopify.toast.show("Gift removed");
                    }}>Delete</s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {showForm && (
        <GiftForm
          onClose={() => setShowForm(false)}
          fetcher={fetcher}
          shopify={shopify}
        />
      )}

      <s-section slot="aside" heading="How Free Gifts Work">
        <s-unordered-list>
          <s-list-item>Gift is auto-added to cart when threshold is crossed</s-list-item>
          <s-list-item>Gift is auto-removed if cart drops below threshold</s-list-item>
          <s-list-item>Displayed with a "FREE" badge in the cart</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

function GiftForm({ onClose, fetcher, shopify }) {
  const [form, setForm] = useState({
    giftProductId: "",
    giftProductTitle: "",
    thresholdAmount: 1499,
    allowChoice: false,
  });

  return (
    <s-section heading="New Gift Rule">
      <s-stack direction="block" gap="base">
        <s-text-field
          label="Gift Product ID (Shopify GID)"
          value={form.giftProductId}
          onChange={(e) => setForm((p) => ({ ...p, giftProductId: e.target.value }))}
          helpText='e.g., gid://shopify/Product/123456'
        />
        <s-text-field
          label="Gift Product Name"
          value={form.giftProductTitle}
          onChange={(e) => setForm((p) => ({ ...p, giftProductTitle: e.target.value }))}
        />
        <s-text-field
          label="Threshold Amount (₹)"
          type="number"
          value={String(form.thresholdAmount)}
          onChange={(e) => setForm((p) => ({ ...p, thresholdAmount: parseFloat(e.target.value) || 0 }))}
        />
        <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
          <input
            type="checkbox"
            checked={form.allowChoice}
            onChange={(e) => setForm((p) => ({ ...p, allowChoice: e.target.checked }))}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
          />
          <span className="text-body-md text-on-surface font-medium">Allow customer to choose gift from a collection</span>
        </label>
        <s-stack direction="inline" gap="base">
          <s-button onClick={() => {
            const fd = new FormData();
            fd.append("intent", "create");
            Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
            fetcher.submit(fd, { method: "POST" });
            shopify.toast.show("Gift rule created!");
            onClose();
          }}>Create</s-button>
          <s-button variant="tertiary" onClick={onClose}>Cancel</s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
