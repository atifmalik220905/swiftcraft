/**
 * SwiftCart — Upsell Rules Management
 * Create, edit, prioritize, and toggle upsell rules.
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
      upsellRules: { orderBy: { priority: "asc" } },
    },
  });

  const planLimits = {
    starter: 3,
    growth: 10,
    scale: 999,
    enterprise: 999,
  };

  return {
    rules: merchant?.upsellRules || [],
    planTier: merchant?.planTier || "starter",
    maxRules: planLimits[merchant?.planTier || "starter"] || 3,
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
    case "create": {
      const count = await prisma.upsellRule.count({
        where: { merchantId: merchant.id },
      });

      const planLimits = { starter: 3, growth: 10, scale: 999, enterprise: 999 };
      if (count >= (planLimits[merchant.planTier] || 3)) {
        return { error: "Plan limit reached. Upgrade to add more rules." };
      }

      await prisma.upsellRule.create({
        data: {
          merchantId: merchant.id,
          ruleName: formData.get("ruleName") || "Untitled Rule",
          triggerType: formData.get("triggerType") || "cart_value",
          triggerValue: formData.get("triggerValue") || "{}",
          upsellProductIds: formData.get("upsellProductIds") || "[]",
          displayType: formData.get("displayType") || "carousel",
          priority: parseInt(formData.get("priority")) || count,
          isActive: true,
        },
      });
      return { success: true, message: "Rule created!" };
    }

    case "update": {
      const ruleId = formData.get("ruleId");
      await prisma.upsellRule.update({
        where: { id: ruleId },
        data: {
          ruleName: formData.get("ruleName"),
          triggerType: formData.get("triggerType"),
          triggerValue: formData.get("triggerValue"),
          upsellProductIds: formData.get("upsellProductIds"),
          displayType: formData.get("displayType"),
          priority: parseInt(formData.get("priority")) || 0,
        },
      });
      return { success: true, message: "Rule updated!" };
    }

    case "toggle": {
      const ruleId = formData.get("ruleId");
      const rule = await prisma.upsellRule.findUnique({ where: { id: ruleId } });
      if (rule) {
        await prisma.upsellRule.update({
          where: { id: ruleId },
          data: { isActive: !rule.isActive },
        });
      }
      return { success: true };
    }

    case "delete": {
      const ruleId = formData.get("ruleId");
      await prisma.upsellRule.delete({ where: { id: ruleId } });
      return { success: true, message: "Rule deleted" };
    }

    default:
      return { error: "Unknown action" };
  }
};

export default function UpsellRules() {
  const { rules, planTier, maxRules } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const canAddMore = rules.length < maxRules;

  const handleToggle = (ruleId) => {
    const formData = new FormData();
    formData.append("intent", "toggle");
    formData.append("ruleId", ruleId);
    fetcher.submit(formData, { method: "POST" });
  };

  const handleDelete = (ruleId) => {
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("ruleId", ruleId);
    fetcher.submit(formData, { method: "POST" });
    shopify.toast.show("Rule deleted");
  };

  return (
    <s-page heading="Upsell Rules">
      <s-button
        slot="primary-action"
        onClick={() => {
          setEditingRule(null);
          setShowForm(true);
        }}
        disabled={!canAddMore}
      >
        + New Upsell Rule
      </s-button>

      {!canAddMore && (
        <s-section>
          <s-box padding="base" background="warning">
            <s-paragraph>
              You've reached the maximum of {maxRules} upsell rules on your{" "}
              <s-text fontWeight="bold">{planTier}</s-text> plan.{" "}
              <s-link href="/app/billing">Upgrade</s-link> for more.
            </s-paragraph>
          </s-box>
        </s-section>
      )}

      {/* Rule List */}
      <s-section heading={`Active Rules (${rules.length}/${maxRules})`}>
        {rules.length === 0 ? (
          <s-box padding="large" borderWidth="base" borderRadius="large">
            <s-stack
              direction="block"
              gap="base"
              inlineAlignment="center"
            >
              <s-text fontSize="heading-lg">🎯</s-text>
              <s-text fontWeight="bold">No upsell rules yet</s-text>
              <s-paragraph>
                Create your first rule to start recommending products in the
                cart.
              </s-paragraph>
              <s-button onClick={() => setShowForm(true)}>
                Create First Rule
              </s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {rules.map((rule, index) => (
              <s-box
                key={rule.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack
                  direction="inline"
                  gap="base"
                  blockAlignment="center"
                  inlineAlignment="space-between"
                >
                  <s-stack direction="block" gap="tight">
                    <s-stack direction="inline" gap="tight" blockAlignment="center">
                      <s-text fontWeight="bold">{rule.ruleName}</s-text>
                      <s-badge
                        tone={rule.isActive ? "success" : "default"}
                      >
                        {rule.isActive ? "Active" : "Paused"}
                      </s-badge>
                    </s-stack>
                    <s-text variant="bodySm" tone="subdued">
                      Trigger: {rule.triggerType} · Display:{" "}
                      {rule.displayType} · Priority: {rule.priority}
                    </s-text>
                  </s-stack>
                  <s-stack direction="inline" gap="tight">
                    <s-button
                      variant="tertiary"
                      onClick={() => handleToggle(rule.id)}
                    >
                      {rule.isActive ? "Pause" : "Activate"}
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => {
                        setEditingRule(rule);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </s-button>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => handleDelete(rule.id)}
                    >
                      Delete
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      {/* Create/Edit Form */}
      {showForm && (
        <RuleForm
          rule={editingRule}
          onClose={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
          fetcher={fetcher}
          shopify={shopify}
          nextPriority={rules.length}
        />
      )}

      {/* Info Sidebar */}
      <s-section slot="aside" heading="How Upsell Rules Work">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Rules are evaluated in priority order when a customer's cart opens.
            The first matching rule's products are displayed.
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="bold">Trigger Types:</s-text>
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              <s-text fontWeight="bold">Product:</s-text> Show upsells when
              specific products are in the cart
            </s-list-item>
            <s-list-item>
              <s-text fontWeight="bold">Cart Value:</s-text> Trigger based on
              total cart amount range
            </s-list-item>
            <s-list-item>
              <s-text fontWeight="bold">Tag:</s-text> Match products by tags
            </s-list-item>
            <s-list-item>
              <s-text fontWeight="bold">City:</s-text> Location-based upsells
            </s-list-item>
          </s-unordered-list>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function RuleForm({ rule, onClose, fetcher, shopify, nextPriority }) {
  const isEdit = !!rule;
  const [form, setForm] = useState({
    ruleName: rule?.ruleName || "",
    triggerType: rule?.triggerType || "cart_value",
    triggerValue: rule?.triggerValue || '{"minValue": 0, "maxValue": 5000}',
    upsellProductIds: rule?.upsellProductIds || "[]",
    displayType: rule?.displayType || "carousel",
    priority: rule?.priority ?? nextPriority,
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("intent", isEdit ? "update" : "create");
    if (isEdit) formData.append("ruleId", rule.id);
    Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
    fetcher.submit(formData, { method: "POST" });
    shopify.toast.show(isEdit ? "Rule updated!" : "Rule created!");
    onClose();
  };

  return (
    <s-section heading={isEdit ? "Edit Rule" : "New Upsell Rule"}>
      <s-stack direction="block" gap="base">
        <s-text-field
          label="Rule Name"
          value={form.ruleName}
          onChange={(e) => updateField("ruleName", e.target.value)}
          placeholder="e.g., Sunscreen upsell for moisturizer buyers"
        />

        <s-select
          label="Trigger Type"
          value={form.triggerType}
          onChange={(e) => updateField("triggerType", e.target.value)}
        >
          <option value="product">Product in Cart</option>
          <option value="cart_value">Cart Value Range</option>
          <option value="tag">Product Tag</option>
          <option value="collection">Collection</option>
          <option value="city">Customer City</option>
        </s-select>

        <s-text-field
          label="Trigger Value (JSON)"
          value={form.triggerValue}
          onChange={(e) => updateField("triggerValue", e.target.value)}
          multiline={3}
          helpText='Example: {"minValue": 500, "maxValue": 2000} or {"productIds": ["123", "456"]}'
        />

        <s-text-field
          label="Upsell Product IDs (JSON Array)"
          value={form.upsellProductIds}
          onChange={(e) => updateField("upsellProductIds", e.target.value)}
          multiline={2}
          helpText='Shopify product GIDs, e.g. ["gid://shopify/Product/123"]'
        />

        <s-select
          label="Display Type"
          value={form.displayType}
          onChange={(e) => updateField("displayType", e.target.value)}
        >
          <option value="carousel">Carousel</option>
          <option value="grid">Grid</option>
          <option value="single">Single Featured</option>
        </s-select>

        <s-text-field
          label="Priority"
          value={String(form.priority)}
          onChange={(e) => updateField("priority", parseInt(e.target.value) || 0)}
          type="number"
          helpText="Lower number = higher priority"
        />

        <s-stack direction="inline" gap="base">
          <s-button onClick={handleSubmit}>
            {isEdit ? "Update Rule" : "Create Rule"}
          </s-button>
          <s-button variant="tertiary" onClick={onClose}>
            Cancel
          </s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
