/**
 * SwiftCart — Volume & Quantity Discounts
 * Manages buy-more-save-more discount rules, identical to aov.ai.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  getMerchant,
  getVolumeDiscountRules,
  createVolumeDiscountRule,
  deleteVolumeDiscountRule,
  toggleVolumeDiscountRule,
} from "../supabase-db.server";
import { invalidateShopCache } from "../utils/cache";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchantWithRelations(session.shop, {
    volumeDiscountRules: true,
  });

  const rules = merchant ? await getVolumeDiscountRules(merchant.id) : [];

  return {
    rules,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const merchant = await getMerchant(session.shop);
  if (!merchant) return { error: "Merchant not found" };

  let result = { error: "Invalid intent" };
  if (intent === "createRule") {
    const ruleName = formData.get("ruleName").trim() || "Volume Discount";
    const applyTo = formData.get("applyTo");
    const productId = applyTo === "all" ? "all" : formData.get("productId").trim();
    const quantity = parseInt(formData.get("quantity")) || 2;
    const discountType = formData.get("discountType");
    const discountValue = parseFloat(formData.get("discountValue")) || 0;

    if (applyTo === "specific" && !productId) {
      return { error: "Product GID is required for specific product rules" };
    }

    const newRule = await createVolumeDiscountRule({
      merchantId: merchant.id,
      ruleName,
      productId,
      quantity,
      discountType,
      discountValue,
      isActive: true,
    });

    result = { success: !!newRule };
  }

  if (intent === "toggleRule") {
    const id = formData.get("id");
    const ok = await toggleVolumeDiscountRule(id);
    result = { success: ok };
  }

  if (intent === "deleteRule") {
    const id = formData.get("id");
    const ok = await deleteVolumeDiscountRule(id);
    result = { success: ok };
  }

  if (result.success) {
    await invalidateShopCache(session.shop);
  }

  return result;
};

export default function VolumeDiscounts() {
  const { rules } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  // Form state
  const [ruleName, setRuleName] = useState("");
  const [applyTo, setApplyTo] = useState("all");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("2");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const handleCreateRule = (e) => {
    e.preventDefault();
    if (applyTo === "specific" && !productId.trim()) {
      shopify.toast.show("Please enter a Shopify Product GID");
      return;
    }

    const fd = new FormData();
    fd.append("intent", "createRule");
    fd.append("ruleName", ruleName.trim() || `Buy ${quantity} Get Discount`);
    fd.append("applyTo", applyTo);
    fd.append("productId", productId.trim());
    fd.append("quantity", quantity);
    fd.append("discountType", discountType);
    fd.append("discountValue", String(parseFloat(discountValue) || 0));

    fetcher.submit(fd, { method: "POST" });

    // Reset fields
    setRuleName("");
    setProductId("");
    setQuantity("2");
    setDiscountValue("");
    shopify.toast.show("Volume discount tier created!");
  };

  const handleToggleRule = (id) => {
    const fd = new FormData();
    fd.append("intent", "toggleRule");
    fd.append("id", id);
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Rule status updated");
  };

  const handleDeleteRule = (id, name) => {
    const fd = new FormData();
    fd.append("intent", "deleteRule");
    fd.append("id", id);
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show(`Rule "${name}" deleted`);
  };

  return (
    <s-page heading="Volume & Quantity Discounts">
      {/* Creation form */}
      <s-section heading="Create Volume Tier">
        <form onSubmit={handleCreateRule}>
          <s-stack direction="block" gap="base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <s-text-field
                label="Rule Display Name"
                value={ruleName}
                placeholder="e.g. Buy 2+ get 10% Off"
                onChange={(e) => setRuleName(e.target.value)}
              />

              <SelectField
                label="Applies To"
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value)}
              >
                <option value="all">All Products (Storewide)</option>
                <option value="specific">Specific Product (via GID)</option>
              </SelectField>
            </div>

            {applyTo === "specific" && (
              <s-text-field
                label="Shopify Product GID"
                value={productId}
                placeholder="e.g. gid://shopify/Product/123456789"
                onChange={(e) => setProductId(e.target.value)}
                helpText="Enter the full GID from your Shopify admin"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <s-text-field
                label="Minimum Quantity Required"
                type="number"
                value={quantity}
                placeholder="e.g. 2"
                onChange={(e) => setQuantity(e.target.value)}
              />

              <SelectField
                label="Discount Type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (₹)</option>
              </SelectField>

              <s-text-field
                label={discountType === "percentage" ? "Discount Value (%)" : "Discount Value (₹)"}
                type="number"
                value={discountValue}
                placeholder="e.g. 10 or 150"
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>

            <s-button type="submit" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
              Add Volume Tier
            </s-button>
          </s-stack>
        </form>
      </s-section>

      {/* Rules list */}
      <s-section heading="Active Volume Tiers">
        <s-stack direction="block" gap="base">
          {rules.length === 0 ? (
            <s-text tone="subdued">No volume tiers configured. Create one above to incentivize larger cart sizes!</s-text>
          ) : (
            <div className="flex flex-col gap-3">
              {rules.map((item) => (
                <s-box
                  key={item.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  className="bg-surface-container-low border border-outline-variant"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <s-stack direction="block" gap="tight">
                      <div className="flex items-center gap-3">
                        <s-text variant="headingMd" fontWeight="bold">
                          {item.ruleName}
                        </s-text>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          item.isActive
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-highest text-on-surface-variant"
                        }`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <s-text tone="subdued">
                        Applies to: <span className="font-semibold">{item.productId === "all" ? "Storewide" : "Specific Product"}</span>
                        {item.productId !== "all" && ` (${item.productId})`}
                        {` • Buy ${item.quantity}+ get `}
                        <span className="font-semibold">
                          {item.discountType === "percentage" ? `${item.discountValue}% Off` : `₹${item.discountValue} Off`}
                        </span>
                      </s-text>
                    </s-stack>

                    <div className="flex items-center gap-3">
                      <s-button
                        variant="tertiary"
                        onClick={() => handleToggleRule(item.id)}
                      >
                        {item.isActive ? "Deactivate" : "Activate"}
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDeleteRule(item.id, item.ruleName)}
                      >
                        Delete
                      </s-button>
                    </div>
                  </div>
                </s-box>
              ))}
            </div>
          )}
        </s-stack>
      </s-section>

      {/* Save Settings visible at bottom */}
      <s-box padding="base" className="flex justify-end gap-base border-t border-outline-variant mt-lg pt-base">
        <s-button onClick={() => shopify.toast.show("Volume discount settings updated!")} style={{ minWidth: "150px" }}>
          Save Settings
        </s-button>
      </s-box>

      <s-section slot="aside" heading="📈 Why Volume Discounts Work">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Volume discounts (or quantity-break pricing) encourage customers to buy
            multiple units of the same item or buy in bulk, driving higher Average Order Values (AOV).
          </s-paragraph>
          <s-paragraph>
            This is AOV.ai's most popular strategy because it aligns customer savings with store shipping efficiencies.
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

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

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
