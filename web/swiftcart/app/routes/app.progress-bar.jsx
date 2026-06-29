/**
 * SwiftCart — Progress Bar Configuration
 * Manage milestones: free shipping, free gifts, discount thresholds.
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
    include: {
      progressBarRules: { orderBy: { milestoneOrder: "asc" } },
    },
  });

  const maxMilestones = merchant?.planTier === "starter" ? 1 : 3;
  return {
    milestones: merchant?.progressBarRules || [],
    planTier: merchant?.planTier || "starter",
    maxMilestones,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const merchant = await prisma.merchant.findUnique({
    where: { shopDomain: session.shop },
  });
  if (!merchant) return { error: "Merchant not found" };

  switch (intent) {
    case "upsert": {
      const milestoneOrder = parseInt(formData.get("milestoneOrder")) || 1;
      await prisma.progressBarRule.upsert({
        where: {
          merchantId_milestoneOrder: {
            merchantId: merchant.id,
            milestoneOrder,
          },
        },
        create: {
          merchantId: merchant.id,
          milestoneOrder,
          rewardType: formData.get("rewardType") || "free_shipping",
          thresholdAmount: parseFloat(formData.get("thresholdAmount")) || 999,
          messageBefore: formData.get("messageBefore") || "Add ₹{remaining} more to unlock {reward}!",
          messageAfter: formData.get("messageAfter") || "You unlocked {reward}! 🎉",
          rewardValue: formData.get("rewardValue") || "",
          barFillColor: formData.get("barFillColor") || "#00B894",
          barBgColor: formData.get("barBgColor") || "#E0E0E0",
          showShimmer: formData.get("showShimmer") === "true",
          isActive: true,
        },
        update: {
          rewardType: formData.get("rewardType") || "free_shipping",
          thresholdAmount: parseFloat(formData.get("thresholdAmount")) || 999,
          messageBefore: formData.get("messageBefore"),
          messageAfter: formData.get("messageAfter"),
          rewardValue: formData.get("rewardValue") || "",
          barFillColor: formData.get("barFillColor") || "#00B894",
          barBgColor: formData.get("barBgColor") || "#E0E0E0",
          showShimmer: formData.get("showShimmer") === "true",
        },
      });
      return { success: true };
    }

    case "delete": {
      const id = formData.get("milestoneId");
      await prisma.progressBarRule.delete({ where: { id } });
      return { success: true };
    }

    case "toggle": {
      const id = formData.get("milestoneId");
      const rule = await prisma.progressBarRule.findUnique({ where: { id } });
      if (rule) {
        await prisma.progressBarRule.update({
          where: { id },
          data: { isActive: !rule.isActive },
        });
      }
      return { success: true };
    }

    default:
      return { error: "Unknown action" };
  }
};

export default function ProgressBar() {
  const { milestones, planTier, maxMilestones } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [editingOrder, setEditingOrder] = useState(null);

  const canAddMore = milestones.length < maxMilestones;
  const nextOrder = milestones.length + 1;

  return (
    <s-page heading="Progress Bar & Milestones">
      <s-button
        slot="primary-action"
        disabled={!canAddMore}
        onClick={() => setEditingOrder(nextOrder)}
      >
        + Add Milestone
      </s-button>

      {!canAddMore && planTier === "starter" && (
        <s-section>
          <s-box padding="base" background="warning">
            <s-paragraph>
              Starter plan supports 1 milestone. <s-link href="/app/billing">Upgrade to Growth</s-link>{" "}
              for up to 3 chained milestones.
            </s-paragraph>
          </s-box>
        </s-section>
      )}

      <s-section heading="Milestones">
        {milestones.length === 0 ? (
          <s-box padding="large" borderWidth="base" borderRadius="large">
            <s-stack direction="block" gap="base" inlineAlignment="center">
              <s-text fontSize="heading-lg">🎯</s-text>
              <s-text fontWeight="bold">No milestones configured</s-text>
              <s-paragraph>
                Add a milestone to show customers how close they are to unlocking
                free shipping, a free gift, or a discount.
              </s-paragraph>
              <s-button onClick={() => setEditingOrder(1)}>Add First Milestone</s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {milestones.map((m) => (
              <s-box key={m.id} padding="base" borderWidth="base" borderRadius="base">
                <s-stack direction="inline" gap="base" blockAlignment="center" inlineAlignment="space-between">
                  <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="tight" blockAlignment="center">
                      <s-text fontWeight="bold">Milestone {m.milestoneOrder}</s-text>
                      <s-badge tone={m.isActive ? "success" : "default"}>
                        {m.isActive ? "Active" : "Paused"}
                      </s-badge>
                    </s-stack>
                    <s-text variant="bodySm" tone="subdued">
                      {m.rewardType === "free_shipping" ? "🚚 Free Shipping" :
                       m.rewardType === "free_gift" ? "🎁 Free Gift" : "💰 Discount"}{" "}
                      at ₹{m.thresholdAmount}
                    </s-text>
                  </s-stack>
                  <s-stack direction="inline" gap="tight">
                    <s-button variant="tertiary" onClick={() => {
                      const fd = new FormData();
                      fd.append("intent", "toggle");
                      fd.append("milestoneId", m.id);
                      fetcher.submit(fd, { method: "POST" });
                    }}>
                      {m.isActive ? "Pause" : "Activate"}
                    </s-button>
                    <s-button variant="tertiary" onClick={() => setEditingOrder(m.milestoneOrder)}>
                      Edit
                    </s-button>
                    <s-button variant="tertiary" tone="critical" onClick={() => {
                      const fd = new FormData();
                      fd.append("intent", "delete");
                      fd.append("milestoneId", m.id);
                      fetcher.submit(fd, { method: "POST" });
                      shopify.toast.show("Milestone deleted");
                    }}>
                      Delete
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {editingOrder && (
        <MilestoneForm
          order={editingOrder}
          existing={milestones.find((m) => m.milestoneOrder === editingOrder)}
          onClose={() => setEditingOrder(null)}
          fetcher={fetcher}
          shopify={shopify}
        />
      )}

      <s-section slot="aside" heading="How Progress Bars Work">
        <s-paragraph>
          Progress bars create a psychological nudge for customers to add more
          items. Milestones are shown in sequence (1 → 2 → 3).
        </s-paragraph>
        <s-paragraph>
          <s-text fontWeight="bold">Template variables:</s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>{"{remaining}"} — Amount left to unlock</s-list-item>
          <s-list-item>{"{reward}"} — Auto-generated reward label</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

function MilestoneForm({ order, existing, onClose, fetcher, shopify }) {
  const e = existing || {};
  const [form, setForm] = useState({
    rewardType: e.rewardType || "free_shipping",
    thresholdAmount: e.thresholdAmount || 999,
    messageBefore: e.messageBefore || "Add ₹{remaining} more to unlock {reward}!",
    messageAfter: e.messageAfter || "You unlocked {reward}! 🎉",
    rewardValue: e.rewardValue || "",
    barFillColor: e.barFillColor || "#00B894",
    barBgColor: e.barBgColor || "#E0E0E0",
    showShimmer: e.showShimmer ?? true,
  });

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append("intent", "upsert");
    fd.append("milestoneOrder", String(order));
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    fetcher.submit(fd, { method: "POST" });
    shopify.toast.show("Milestone saved!");
    onClose();
  };

  return (
    <s-section heading={`Milestone ${order}`}>
      <s-stack direction="block" gap="base">
        <s-select
          label="Reward Type"
          value={form.rewardType}
          onChange={(e) => setForm((p) => ({ ...p, rewardType: e.target.value }))}
        >
          <option value="free_shipping">🚚 Free Shipping</option>
          <option value="free_gift">🎁 Free Gift</option>
          <option value="discount">💰 Discount</option>
        </s-select>

        <s-text-field
          label="Threshold Amount (₹)"
          type="number"
          value={String(form.thresholdAmount)}
          onChange={(e) => setForm((p) => ({ ...p, thresholdAmount: parseFloat(e.target.value) || 0 }))}
        />

        {form.rewardType === "discount" && (
          <s-text-field
            label="Discount Code or Percentage"
            value={form.rewardValue}
            onChange={(e) => setForm((p) => ({ ...p, rewardValue: e.target.value }))}
            helpText="e.g., SAVE15 or 15%"
          />
        )}

        <s-text-field
          label="Message Before Unlock"
          value={form.messageBefore}
          onChange={(e) => setForm((p) => ({ ...p, messageBefore: e.target.value }))}
        />

        <s-text-field
          label="Message After Unlock"
          value={form.messageAfter}
          onChange={(e) => setForm((p) => ({ ...p, messageAfter: e.target.value }))}
        />

        <s-checkbox
          checked={form.showShimmer}
          onChange={(e) => setForm((p) => ({ ...p, showShimmer: e.target.checked }))}
        >
          Animated shimmer effect
        </s-checkbox>

        <s-stack direction="inline" gap="base">
          <s-button onClick={handleSubmit}>Save Milestone</s-button>
          <s-button variant="tertiary" onClick={onClose}>Cancel</s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
