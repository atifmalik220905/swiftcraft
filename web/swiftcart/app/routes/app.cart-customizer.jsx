/**
 * SwiftCart — Cart Customizer Dashboard
 * Merchant configures drawer design: colors, layout, fonts, custom CSS/HTML.
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
    include: { cartSettings: true },
  });

  if (!merchant) {
    return { settings: null };
  }

  return { settings: merchant.cartSettings };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
  });

  if (!merchant) {
    return { error: "Merchant not found" };
  }

  const data = {
    drawerPosition: formData.get("drawerPosition") || "right",
    drawerWidthPx: parseInt(formData.get("drawerWidthPx")) || 420,
    primaryColor: formData.get("primaryColor") || "#6C5CE7",
    buttonColor: formData.get("buttonColor") || "#00B894",
    buttonTextColor: formData.get("buttonTextColor") || "#FFFFFF",
    backgroundColor: formData.get("backgroundColor") || "#FFFFFF",
    overlayOpacity: parseFloat(formData.get("overlayOpacity")) || 0.5,
    borderRadius: parseInt(formData.get("borderRadius")) || 12,
    fontFamily: formData.get("fontFamily") || "Inter",
    cartTitle: formData.get("cartTitle") || "Your Cart",
    announcementText: formData.get("announcementText") || "",
    showProgressBar: formData.get("showProgressBar") === "true",
    showCountdown: formData.get("showCountdown") === "true",
    showStickyAtc: formData.get("showStickyAtc") === "true",
    showCouponField: formData.get("showCouponField") === "true",
    showUpsells: formData.get("showUpsells") === "true",
    showFreeGifts: formData.get("showFreeGifts") === "true",
    showSocialProof: formData.get("showSocialProof") === "true",
    showLowStock: formData.get("showLowStock") === "true",
    customCss: formData.get("customCss") || "",
    customHtmlTop: formData.get("customHtmlTop") || "",
    customHtmlBottom: formData.get("customHtmlBottom") || "",
  };

  await prisma.cartSettings.upsert({
    where: { merchantId: merchant.id },
    create: { merchantId: merchant.id, ...data },
    update: data,
  });

  return { success: true };
};

export default function CartCustomizer() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const s = settings || {};
  const [form, setForm] = useState({
    drawerPosition: s.drawerPosition || "right",
    drawerWidthPx: s.drawerWidthPx || 420,
    primaryColor: s.primaryColor || "#6C5CE7",
    buttonColor: s.buttonColor || "#00B894",
    buttonTextColor: s.buttonTextColor || "#FFFFFF",
    backgroundColor: s.backgroundColor || "#FFFFFF",
    overlayOpacity: s.overlayOpacity || 0.5,
    borderRadius: s.borderRadius || 12,
    fontFamily: s.fontFamily || "Inter",
    cartTitle: s.cartTitle || "Your Cart",
    announcementText: s.announcementText || "",
    showProgressBar: s.showProgressBar ?? true,
    showCountdown: s.showCountdown ?? false,
    showStickyAtc: s.showStickyAtc ?? true,
    showCouponField: s.showCouponField ?? true,
    showUpsells: s.showUpsells ?? true,
    showFreeGifts: s.showFreeGifts ?? true,
    showSocialProof: s.showSocialProof ?? false,
    showLowStock: s.showLowStock ?? true,
    customCss: s.customCss || "",
    customHtmlTop: s.customHtmlTop || "",
    customHtmlBottom: s.customHtmlBottom || "",
  });

  const isSaving = fetcher.state !== "idle";

  const handleSave = () => {
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    fetcher.submit(formData, { method: "POST" });
    shopify.toast.show("Cart settings saved!");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <s-page heading="Cart Customizer">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(isSaving ? { loading: true } : {})}
      >
        Save Settings
      </s-button>

      {/* Layout & Position */}
      <s-section heading="Layout">
        <s-stack direction="block" gap="base">
          <s-select
            label="Drawer Position"
            value={form.drawerPosition}
            onChange={(e) => updateField("drawerPosition", e.target.value)}
          >
            <option value="right">Right Side</option>
            <option value="left">Left Side</option>
          </s-select>

          <s-range-slider
            label="Drawer Width"
            value={form.drawerWidthPx}
            min={360}
            max={520}
            step={10}
            suffix="px"
            onChange={(e) => updateField("drawerWidthPx", parseInt(e.target.value))}
          />

          <s-range-slider
            label="Border Radius"
            value={form.borderRadius}
            min={0}
            max={24}
            step={2}
            suffix="px"
            onChange={(e) => updateField("borderRadius", parseInt(e.target.value))}
          />

          <s-range-slider
            label="Overlay Opacity"
            value={Math.round(form.overlayOpacity * 100)}
            min={0}
            max={100}
            step={5}
            suffix="%"
            onChange={(e) => updateField("overlayOpacity", parseInt(e.target.value) / 100)}
          />

          <s-select
            label="Font Family"
            value={form.fontFamily}
            onChange={(e) => updateField("fontFamily", e.target.value)}
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Poppins">Poppins</option>
            <option value="Outfit">Outfit</option>
            <option value="system-ui">System Default</option>
          </s-select>
        </s-stack>
      </s-section>

      {/* Colors */}
      <s-section heading="Colors">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" wrap>
            <ColorField
              label="Primary Accent"
              value={form.primaryColor}
              onChange={(v) => updateField("primaryColor", v)}
            />
            <ColorField
              label="Checkout Button"
              value={form.buttonColor}
              onChange={(v) => updateField("buttonColor", v)}
            />
            <ColorField
              label="Button Text"
              value={form.buttonTextColor}
              onChange={(v) => updateField("buttonTextColor", v)}
            />
            <ColorField
              label="Background"
              value={form.backgroundColor}
              onChange={(v) => updateField("backgroundColor", v)}
            />
          </s-stack>
        </s-stack>
      </s-section>

      {/* Cart Header */}
      <s-section heading="Cart Header">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Cart Title"
            value={form.cartTitle}
            onChange={(e) => updateField("cartTitle", e.target.value)}
          />
          <s-text-field
            label="Announcement Banner Text"
            value={form.announcementText}
            onChange={(e) => updateField("announcementText", e.target.value)}
            helpText="Leave empty to hide. Example: Free shipping on orders over ₹999!"
          />
        </s-stack>
      </s-section>

      {/* Feature Toggles */}
      <s-section heading="Feature Toggles">
        <s-stack direction="block" gap="base">
          <ToggleField
            label="Progress Bar"
            checked={form.showProgressBar}
            onChange={(v) => updateField("showProgressBar", v)}
          />
          <ToggleField
            label="Upsell Recommendations"
            checked={form.showUpsells}
            onChange={(v) => updateField("showUpsells", v)}
          />
          <ToggleField
            label="Coupon Code Field"
            checked={form.showCouponField}
            onChange={(v) => updateField("showCouponField", v)}
          />
          <ToggleField
            label="Free Gifts"
            checked={form.showFreeGifts}
            onChange={(v) => updateField("showFreeGifts", v)}
          />
          <ToggleField
            label="Countdown Timer"
            checked={form.showCountdown}
            onChange={(v) => updateField("showCountdown", v)}
          />
          <ToggleField
            label="Low Stock Warnings"
            checked={form.showLowStock}
            onChange={(v) => updateField("showLowStock", v)}
          />
          <ToggleField
            label="Sticky Add-to-Cart (Mobile)"
            checked={form.showStickyAtc}
            onChange={(v) => updateField("showStickyAtc", v)}
          />
          <ToggleField
            label="Social Proof"
            checked={form.showSocialProof}
            onChange={(v) => updateField("showSocialProof", v)}
          />
        </s-stack>
      </s-section>

      {/* Advanced - Custom Code */}
      <s-section heading="Advanced">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Custom CSS"
            value={form.customCss}
            onChange={(e) => updateField("customCss", e.target.value)}
            multiline={4}
            helpText="CSS injected into the cart drawer. Use .sc- prefixed classes."
          />
          <s-text-field
            label="Custom HTML (Above Cart Items)"
            value={form.customHtmlTop}
            onChange={(e) => updateField("customHtmlTop", e.target.value)}
            multiline={3}
          />
          <s-text-field
            label="Custom HTML (Below Cart Items)"
            value={form.customHtmlBottom}
            onChange={(e) => updateField("customHtmlBottom", e.target.value)}
            multiline={3}
          />
        </s-stack>
      </s-section>

      {/* Preview Panel */}
      <s-section slot="aside" heading="Preview">
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="large"
          background="subdued"
        >
          <s-paragraph>
            <s-text fontWeight="bold">Live Preview</s-text>
          </s-paragraph>
          <s-paragraph>
            Install the SwiftCart theme extension on your store, then visit your
            storefront to see changes in real-time.
          </s-paragraph>
          <div
            style={{
              marginTop: "12px",
              padding: "16px",
              borderRadius: form.borderRadius + "px",
              border: "2px solid " + form.primaryColor,
              background: form.backgroundColor,
              fontFamily: form.fontFamily + ", sans-serif",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              {form.cartTitle || "Your Cart"}
            </div>
            {form.announcementText && (
              <div
                style={{
                  background: form.primaryColor,
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                {form.announcementText}
              </div>
            )}
            <div
              style={{
                height: "6px",
                background: "#e0e0e0",
                borderRadius: "100px",
                marginBottom: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "65%",
                  height: "100%",
                  background: form.buttonColor,
                  borderRadius: "100px",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              Add ₹350 more for free shipping!
            </div>
            <button
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                background: form.buttonColor,
                color: form.buttonTextColor,
                border: "none",
                borderRadius: form.borderRadius + "px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "default",
              }}
            >
              CHECKOUT
            </button>
          </div>
        </s-box>
      </s-section>
    </s-page>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <s-stack direction="block" gap="tight">
      <s-text>{label}</s-text>
      <s-stack direction="inline" gap="tight" blockAlignment="center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "36px",
            height: "36px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
            padding: "2px",
          }}
        />
        <s-text variant="bodyMd" fontWeight="medium">{value}</s-text>
      </s-stack>
    </s-stack>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <s-checkbox
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    >
      {label}
    </s-checkbox>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
