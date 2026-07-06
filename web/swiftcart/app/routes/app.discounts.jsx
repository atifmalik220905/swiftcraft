/**
 * SwiftCart — Discount & Coupon Settings
 * Manages custom coupon codes and cart-drawer coupon field configurations.
 */

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getMerchantWithRelations,
  getMerchant,
  upsertCartSettings,
  getDiscounts,
  getDiscount,
  createDiscount,
  deleteDiscount,
  toggleDiscount,
} from "../supabase-db.server";

// ─── GraphQL Helpers to sync with Shopify ───

async function createShopifyDiscount(admin, code, discountType, discountValue, minCartAmount) {
  if (discountType === "free_shipping") {
    const query = `
      mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
        discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }
    `;
    const response = await admin.graphql(query, {
      variables: {
        freeShippingCodeDiscount: {
          title: code,
          code: code,
          startsAt: new Date().toISOString(),
          customerSelection: { all: true },
          destinationSelection: { all: true },
          minimumRequirement: minCartAmount > 0 ? { subtotal: { greaterThanOrEqualTo: minCartAmount } } : null
        }
      }
    });
    const resJson = await response.json();
    return resJson.data?.discountCodeFreeShippingCreate;
  } else {
    const query = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }
    `;
    const isPercent = discountType === "percentage";
    const response = await admin.graphql(query, {
      variables: {
        basicCodeDiscount: {
          title: code,
          code: code,
          startsAt: new Date().toISOString(),
          customerSelection: { all: true },
          customerGets: {
            value: isPercent 
              ? { percentage: discountValue / 100 }
              : { discountAmount: { amount: discountValue, appliesOnEachItem: false } },
            items: { all: true }
          },
          minimumRequirement: minCartAmount > 0 ? { subtotal: { greaterThanOrEqualTo: minCartAmount } } : null
        }
      }
    });
    const resJson = await response.json();
    return resJson.data?.discountCodeBasicCreate;
  }
}

async function deleteShopifyDiscount(admin, code) {
  const findQuery = `
    query findDiscount($query: String!) {
      codeDiscountNodes(first: 1, query: $query) {
        nodes {
          id
        }
      }
    }
  `;
  const findRes = await admin.graphql(findQuery, {
    variables: { query: `code:${code}` }
  });
  const findJson = await findRes.json();
  const nodes = findJson.data?.codeDiscountNodes?.nodes || [];
  if (nodes.length === 0) return;

  const id = nodes[0].id;

  const deleteMutation = `
    mutation discountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors { field message }
      }
    }
  `;
  await admin.graphql(deleteMutation, { variables: { id } });
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await getMerchantWithRelations(session.shop, {
    cartSettings: true,
  });

  const discounts = merchant ? await getDiscounts(merchant.id) : [];

  return {
    showCouponField: merchant?.cartSettings?.showCouponField ?? true,
    discounts,
  };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const merchant = await getMerchant(session.shop);
  if (!merchant) return { error: "Merchant not found" };

  if (intent === "saveSettings") {
    await upsertCartSettings(merchant.id, {
      showCouponField: formData.get("showCouponField") === "true",
    });
    return { success: true };
  }

  if (intent === "createDiscount") {
    const code = formData.get("code").trim().toUpperCase();
    const discountType = formData.get("discountType");
    const discountValue = parseFloat(formData.get("discountValue")) || 0;
    const minCartAmount = parseFloat(formData.get("minCartAmount")) || 0;

    if (!code) return { error: "Coupon code is required" };

    try {
      // Create natively in Shopify using GraphQL
      await createShopifyDiscount(admin, code, discountType, discountValue, minCartAmount);
    } catch (e) {
      console.warn("Failed to create Shopify discount:", e);
    }

    // Save in local database
    const newDisc = await createDiscount({
      merchantId: merchant.id,
      code,
      discountType,
      discountValue,
      minCartAmount,
      isActive: true,
    });

    return { success: !!newDisc };
  }

  if (intent === "toggleDiscount") {
    const id = formData.get("id");
    const disc = await getDiscount(id);
    if (disc) {
      try {
        if (disc.isActive) {
          // Deactivating: delete from Shopify
          await deleteShopifyDiscount(admin, disc.code);
        } else {
          // Activating: create in Shopify
          await createShopifyDiscount(admin, disc.code, disc.discountType, disc.discountValue, disc.minCartAmount);
        }
      } catch (e) {
        console.warn("Failed to toggle Shopify discount:", e);
      }
    }
    const ok = await toggleDiscount(id);
    return { success: ok };
  }

  if (intent === "deleteDiscount") {
    const id = formData.get("id");
    const disc = await getDiscount(id);
    if (disc) {
      try {
        await deleteShopifyDiscount(admin, disc.code);
      } catch (e) {
        console.warn("Failed to delete Shopify discount:", e);
      }
    }
    const ok = await deleteDiscount(id);
    return { success: ok };
  }

  return { error: "Invalid intent" };
};

export default function Discounts() {
  const { showCouponField, discounts } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [enabled, setEnabled] = useState(showCouponField);

  // New discount form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minCartAmount, setMinCartAmount] = useState("");

  const handleSaveSettings = () => {
    const fd = new FormData();
    fd.append("intent", "saveSettings");
    fd.append("showCouponField", String(enabled));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Coupon field settings saved!");
  };

  const handleCreateDiscount = (e) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      shopify.toast.show("Please enter a coupon code");
      return;
    }

    const fd = new FormData();
    fd.append("intent", "createDiscount");
    fd.append("code", trimmedCode);
    fd.append("discountType", discountType);
    fd.append("discountValue", String(parseFloat(discountValue) || 0));
    fd.append("minCartAmount", String(parseFloat(minCartAmount) || 0));

    fetcher.submit(fd, { method: "POST" });

    // Reset fields
    setCode("");
    setDiscountValue("");
    setMinCartAmount("");
    shopify.toast.show(`Discount ${trimmedCode} created!`);
  };

  const handleToggleActive = (id) => {
    const fd = new FormData();
    fd.append("intent", "toggleDiscount");
    fd.append("id", id);
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Coupon status updated");
  };

  const handleDelete = (id, codeName) => {
    const fd = new FormData();
    fd.append("intent", "deleteDiscount");
    fd.append("id", id);
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show(`Coupon ${codeName} deleted`);
  };

  return (
    <s-page heading="Discount & Coupon Settings">
      <s-button slot="primary-action" onClick={handleSaveSettings}>
        Save settings
      </s-button>

      {/* Coupon Field Switch */}
      <s-section heading="Coupon Field Settings">
        <s-stack direction="block" gap="base">
          <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant bg-surface-container-low"
            />
            <span className="text-body-md text-on-surface font-medium">Show inline coupon code field in cart drawer</span>
          </label>
          <s-paragraph>
            When enabled, customers can enter and validate discount codes
            directly inside the cart drawer.
          </s-paragraph>
          <s-button onClick={handleSaveSettings} style={{ alignSelf: "flex-start", marginTop: "12px" }}>
            Save Coupon Field
          </s-button>
        </s-stack>
      </s-section>

      {/* Discount Coupon Manager */}
      <s-section heading="Create Custom Coupons">
        <form onSubmit={handleCreateDiscount}>
          <s-stack direction="block" gap="base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <s-text-field
                label="Coupon Code"
                value={code}
                placeholder="e.g. WELCOME10, FREESHIP"
                onChange={(e) => setCode(e.target.value)}
              />

              <SelectField
                label="Discount Type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (₹)</option>
                <option value="free_shipping">Free Shipping</option>
              </SelectField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discountType !== "free_shipping" && (
                <s-text-field
                  label={discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                  type="number"
                  value={discountValue}
                  placeholder="e.g. 10 or 150"
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              )}

              <s-text-field
                label="Minimum Cart Subtotal (₹)"
                type="number"
                value={minCartAmount}
                placeholder="e.g. 999 (0 for no limit)"
                onChange={(e) => setMinCartAmount(e.target.value)}
              />
            </div>

            <s-button type="submit" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
              Add Coupon
            </s-button>
          </s-stack>
        </form>
      </s-section>

      {/* Active Coupons List */}
      <s-section heading="Manage Coupons">
        <s-stack direction="block" gap="base">
          {discounts.length === 0 ? (
            <s-text tone="subdued">No custom coupons created yet. Create one above!</s-text>
          ) : (
            <div className="flex flex-col gap-3">
              {discounts.map((item) => (
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
                          {item.code}
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
                        Type:{" "}
                        <span className="font-semibold">
                          {item.discountType === "percentage"
                            ? `${item.discountValue}% Off`
                            : item.discountType === "fixed_amount"
                            ? `₹${item.discountValue} Off`
                            : "Free Shipping"}
                        </span>
                        {item.minCartAmount > 0 ? ` • Min. Cart: ₹${item.minCartAmount}` : " • No min. cart subtotal"}
                      </s-text>
                    </s-stack>

                    <div className="flex items-center gap-3">
                      <s-button
                        variant="tertiary"
                        onClick={() => handleToggleActive(item.id)}
                      >
                        {item.isActive ? "Deactivate" : "Activate"}
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDelete(item.id, item.code)}
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

      <s-section slot="aside" heading="💡 How Custom Coupons Work">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            SwiftCart lets you define Custom Coupons directly in your dashboard.
          </s-paragraph>
          <s-paragraph>
            When you create a coupon here, SwiftCart will automatically create a matching Discount Code inside your Shopify Admin.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>Validate that the code is active and meets the minimum cart amount in the drawer.</s-list-item>
            <s-list-item>Deduct the value (percentage or amount) from the cart subtotal locally.</s-list-item>
            <s-list-item>Shopify Checkout will automatically include the discounted price since the code is synced to Shopify.</s-list-item>
          </s-unordered-list>
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
