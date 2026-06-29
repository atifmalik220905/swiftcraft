/**
 * SwiftCart — Discount & Coupon Settings
 */

import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
    include: { cartSettings: true },
  });
  return {
    showCouponField: merchant?.cartSettings?.showCouponField ?? true,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
  });
  if (!merchant) return { error: "Merchant not found" };

  await prisma.cartSettings.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      showCouponField: formData.get("showCouponField") === "true",
    },
    update: {
      showCouponField: formData.get("showCouponField") === "true",
    },
  });

  return { success: true };
};

export default function Discounts() {
  const { showCouponField } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [enabled, setEnabled] = useState(showCouponField);

  const handleSave = () => {
    const fd = new FormData();
    fd.append("showCouponField", String(enabled));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Settings saved!");
  };

  return (
    <s-page heading="Discount & Coupon Settings">
      <s-button slot="primary-action" onClick={handleSave}>
        Save
      </s-button>

      <s-section heading="Coupon Field">
        <s-stack direction="block" gap="base">
          <s-checkbox
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          >
            Show inline coupon code field in cart drawer
          </s-checkbox>
          <s-paragraph>
            When enabled, customers can enter and validate discount codes
            directly inside the cart without navigating away.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="How Discounts Work">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            SwiftCart validates discount codes using Shopify's native discount
            system. All discount codes created in your Shopify admin will work
            automatically.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>Live AJAX validation — no page reload</s-list-item>
            <s-list-item>Shows applied discount with savings amount</s-list-item>
            <s-list-item>Auto-apply codes via URL parameters</s-list-item>
            <s-list-item>Stacking rules follow Shopify's settings</s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="💡 Tip">
        <s-paragraph>
          Create discount codes in your Shopify admin under{" "}
          <s-text fontWeight="bold">Discounts</s-text>. SwiftCart will
          automatically validate and apply them when entered in the cart.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
