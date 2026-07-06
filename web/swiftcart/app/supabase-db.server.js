/**
 * SwiftCart — Supabase Database Helpers
 *
 * Centralized data-access layer that replaces all Prisma ORM calls.
 * Each function maps to the Prisma queries previously scattered across route files.
 * Generates UUIDs and timestamps on insert to replicate Prisma client-side defaults.
 */

import crypto from "crypto";
import { supabase } from "./supabase.server";

// ─── Merchant ───────────────────────────────────────────────────────────────

export async function getMerchant(shopDomain) {
  const { data, error } = await supabase
    .from("Merchant")
    .select("*")
    .eq("shopDomain", shopDomain)
    .maybeSingle();

  if (error) {
    console.error("[supabase-db] getMerchant error:", error);
    return null;
  }
  return data;
}

export async function getMerchantWithRelations(shopDomain, includes = {}) {
  // Build a select string based on requested relations
  const relations = [];
  if (includes.cartSettings) relations.push("CartSettings(*)");
  if (includes.upsellRules) relations.push("UpsellRule(*)");
  if (includes.progressBarRules) relations.push("ProgressBarRule(*)");
  if (includes.freeGiftRules) relations.push("FreeGiftRule(*)");
  if (includes.countdownSettings) relations.push("CountdownSettings(*)");
  if (includes.fraudSettings) relations.push("FraudSettings(*)");
  if (includes.discounts) relations.push("Discount(*)");
  if (includes.volumeDiscountRules) relations.push("VolumeDiscountRule(*)");

  const selectStr = ["*", ...relations].join(", ");

  const { data, error } = await supabase
    .from("Merchant")
    .select(selectStr)
    .eq("shopDomain", shopDomain)
    .maybeSingle();

  if (error) {
    console.error("[supabase-db] getMerchantWithRelations error:", error);
    return null;
  }

  if (!data) return null;

  // Normalize relation names to camelCase (Supabase returns PascalCase table names)
  const result = { ...data };
  if (includes.cartSettings && data.CartSettings) {
    // CartSettings is 1:1, so take the first element if array
    result.cartSettings = Array.isArray(data.CartSettings)
      ? data.CartSettings[0] || null
      : data.CartSettings;
    delete result.CartSettings;
  }
  if (includes.upsellRules && data.UpsellRule) {
    let rules = data.UpsellRule || [];
    if (includes.upsellRulesFilter?.isActive !== undefined) {
      rules = rules.filter((r) => r.isActive === includes.upsellRulesFilter.isActive);
    }
    if (includes.upsellRulesOrderBy) {
      const key = Object.keys(includes.upsellRulesOrderBy)[0];
      const dir = includes.upsellRulesOrderBy[key];
      rules.sort((a, b) =>
        dir === "asc" ? (a[key] > b[key] ? 1 : -1) : a[key] < b[key] ? 1 : -1,
      );
    }
    result.upsellRules = rules;
    delete result.UpsellRule;
  }
  if (includes.progressBarRules && data.ProgressBarRule) {
    let rules = data.ProgressBarRule || [];
    if (includes.progressBarRulesFilter?.isActive !== undefined) {
      rules = rules.filter((r) => r.isActive === includes.progressBarRulesFilter.isActive);
    }
    if (includes.progressBarRulesOrderBy) {
      const key = Object.keys(includes.progressBarRulesOrderBy)[0];
      const dir = includes.progressBarRulesOrderBy[key];
      rules.sort((a, b) =>
        dir === "asc" ? (a[key] > b[key] ? 1 : -1) : a[key] < b[key] ? 1 : -1,
      );
    }
    result.progressBarRules = rules;
    delete result.ProgressBarRule;
  }
  if (includes.freeGiftRules && data.FreeGiftRule) {
    let rules = data.FreeGiftRule || [];
    if (includes.freeGiftRulesFilter?.isActive !== undefined) {
      rules = rules.filter((r) => r.isActive === includes.freeGiftRulesFilter.isActive);
    }
    result.freeGiftRules = rules;
    delete result.FreeGiftRule;
  }
  if (includes.countdownSettings && data.CountdownSettings) {
    result.countdownSettings = Array.isArray(data.CountdownSettings)
      ? data.CountdownSettings[0] || null
      : data.CountdownSettings;
    delete result.CountdownSettings;
  }
  if (includes.fraudSettings && data.FraudSettings) {
    result.fraudSettings = Array.isArray(data.FraudSettings)
      ? data.FraudSettings[0] || null
      : data.FraudSettings;
    delete result.FraudSettings;
  }
  if (includes.discounts && data.Discount) {
    let list = data.Discount || [];
    if (includes.discountsFilter?.isActive !== undefined) {
      list = list.filter((r) => r.isActive === includes.discountsFilter.isActive);
    }
    result.discounts = list;
    delete result.Discount;
  }
  if (includes.volumeDiscountRules && data.VolumeDiscountRule) {
    let list = data.VolumeDiscountRule || [];
    if (includes.volumeDiscountRulesFilter?.isActive !== undefined) {
      list = list.filter((r) => r.isActive === includes.volumeDiscountRulesFilter.isActive);
    }
    result.volumeDiscountRules = list;
    delete result.VolumeDiscountRule;
  }

  return result;
}

export async function createMerchant(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: merchant, error } = await supabase
    .from("Merchant")
    .insert({ id, createdAt: now, updatedAt: now, ...data })
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] createMerchant error:", error);
    return null;
  }
  return merchant;
}

export async function updateMerchant(shopDomain, data) {
  const { data: merchant, error } = await supabase
    .from("Merchant")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("shopDomain", shopDomain)
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] updateMerchant error:", error);
    return null;
  }
  return merchant;
}

// ─── Cart Settings ──────────────────────────────────────────────────────────

export async function upsertCartSettings(merchantId, data) {
  // Try update first, then insert
  const { data: existing } = await supabase
    .from("CartSettings")
    .select("id")
    .eq("merchantId", merchantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("CartSettings")
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq("merchantId", merchantId);

    if (error) {
      console.error("[supabase-db] upsertCartSettings update error:", error);
      return false;
    }
  } else {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("CartSettings")
      .insert({ id, merchantId, createdAt: now, updatedAt: now, ...data });

    if (error) {
      console.error("[supabase-db] upsertCartSettings insert error:", error);
      return false;
    }
  }
  return true;
}

// ─── Upsell Rules ───────────────────────────────────────────────────────────

export async function getUpsellRules(merchantId, orderBy = { priority: "asc" }) {
  const key = Object.keys(orderBy)[0];
  const ascending = orderBy[key] === "asc";

  const { data, error } = await supabase
    .from("UpsellRule")
    .select("*")
    .eq("merchantId", merchantId)
    .order(key, { ascending });

  if (error) {
    console.error("[supabase-db] getUpsellRules error:", error);
    return [];
  }
  return data || [];
}

export async function countUpsellRules(merchantId) {
  const { count, error } = await supabase
    .from("UpsellRule")
    .select("*", { count: "exact", head: true })
    .eq("merchantId", merchantId);

  if (error) {
    console.error("[supabase-db] countUpsellRules error:", error);
    return 0;
  }
  return count || 0;
}

export async function createUpsellRule(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: rule, error } = await supabase
    .from("UpsellRule")
    .insert({ id, createdAt: now, updatedAt: now, ...data })
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] createUpsellRule error:", error);
    return null;
  }
  return rule;
}

export async function updateUpsellRule(id, data) {
  const { error } = await supabase
    .from("UpsellRule")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] updateUpsellRule error:", error);
    return false;
  }
  return true;
}

export async function deleteUpsellRule(id) {
  const { error } = await supabase.from("UpsellRule").delete().eq("id", id);

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found, treat as already deleted
    console.error("[supabase-db] deleteUpsellRule error:", error);
    return false;
  }
  return true;
}

export async function toggleUpsellRule(id) {
  const { data: rule } = await supabase
    .from("UpsellRule")
    .select("isActive")
    .eq("id", id)
    .maybeSingle();

  if (!rule) return false;

  const { error } = await supabase
    .from("UpsellRule")
    .update({ isActive: !rule.isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] toggleUpsellRule error:", error);
    return false;
  }
  return true;
}

// ─── Progress Bar Rules ─────────────────────────────────────────────────────

export async function getProgressBarRules(merchantId) {
  const { data, error } = await supabase
    .from("ProgressBarRule")
    .select("*")
    .eq("merchantId", merchantId)
    .order("milestoneOrder", { ascending: true });

  if (error) {
    console.error("[supabase-db] getProgressBarRules error:", error);
    return [];
  }
  return data || [];
}

export async function upsertProgressBarRule(merchantId, milestoneOrder, data) {
  // Check if rule exists for this merchant + milestoneOrder
  const { data: existing } = await supabase
    .from("ProgressBarRule")
    .select("id")
    .eq("merchantId", merchantId)
    .eq("milestoneOrder", milestoneOrder)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ProgressBarRule")
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      console.error("[supabase-db] upsertProgressBarRule update error:", error);
      return false;
    }
  } else {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("ProgressBarRule")
      .insert({ id, merchantId, milestoneOrder, createdAt: now, updatedAt: now, ...data });

    if (error) {
      console.error("[supabase-db] upsertProgressBarRule insert error:", error);
      return false;
    }
  }
  return true;
}

export async function deleteProgressBarRule(id) {
  const { error } = await supabase
    .from("ProgressBarRule")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] deleteProgressBarRule error:", error);
    return false;
  }
  return true;
}

export async function toggleProgressBarRule(id) {
  const { data: rule } = await supabase
    .from("ProgressBarRule")
    .select("isActive")
    .eq("id", id)
    .maybeSingle();

  if (!rule) return false;

  const { error } = await supabase
    .from("ProgressBarRule")
    .update({ isActive: !rule.isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] toggleProgressBarRule error:", error);
    return false;
  }
  return true;
}

// ─── Free Gift Rules ────────────────────────────────────────────────────────

export async function getFreeGiftRules(merchantId) {
  const { data, error } = await supabase
    .from("FreeGiftRule")
    .select("*")
    .eq("merchantId", merchantId);

  if (error) {
    console.error("[supabase-db] getFreeGiftRules error:", error);
    return [];
  }
  return data || [];
}

export async function createFreeGiftRule(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: rule, error } = await supabase
    .from("FreeGiftRule")
    .insert({ id, createdAt: now, updatedAt: now, ...data })
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] createFreeGiftRule error:", error);
    return null;
  }
  return rule;
}

export async function deleteFreeGiftRule(id) {
  const { error } = await supabase.from("FreeGiftRule").delete().eq("id", id);

  if (error) {
    console.error("[supabase-db] deleteFreeGiftRule error:", error);
    return false;
  }
  return true;
}

export async function toggleFreeGiftRule(id) {
  const { data: gift } = await supabase
    .from("FreeGiftRule")
    .select("isActive")
    .eq("id", id)
    .maybeSingle();

  if (!gift) return false;

  const { error } = await supabase
    .from("FreeGiftRule")
    .update({ isActive: !gift.isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] toggleFreeGiftRule error:", error);
    return false;
  }
  return true;
}

// ─── Countdown Settings ─────────────────────────────────────────────────────

export async function upsertCountdownSettings(merchantId, data) {
  const { data: existing } = await supabase
    .from("CountdownSettings")
    .select("id")
    .eq("merchantId", merchantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("CountdownSettings")
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq("merchantId", merchantId);

    if (error) {
      console.error("[supabase-db] upsertCountdownSettings update error:", error);
      return false;
    }
  } else {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("CountdownSettings")
      .insert({ id, merchantId, createdAt: now, updatedAt: now, ...data });

    if (error) {
      console.error("[supabase-db] upsertCountdownSettings insert error:", error);
      return false;
    }
  }
  return true;
}

// ─── Fraud Settings ─────────────────────────────────────────────────────────

export async function upsertFraudSettings(merchantId, data) {
  const { data: existing } = await supabase
    .from("FraudSettings")
    .select("id")
    .eq("merchantId", merchantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("FraudSettings")
      .update({ ...data, updatedAt: new Date().toISOString() })
      .eq("merchantId", merchantId);

    if (error) {
      console.error("[supabase-db] upsertFraudSettings update error:", error);
      return false;
    }
  } else {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("FraudSettings")
      .insert({ id, merchantId, createdAt: now, updatedAt: now, ...data });

    if (error) {
      console.error("[supabase-db] upsertFraudSettings insert error:", error);
      return false;
    }
  }
  return true;
}

// ─── Cart Events (Analytics) ────────────────────────────────────────────────

export async function getCartEvents(merchantId, since) {
  let query = supabase.from("CartEvent").select("*").eq("merchantId", merchantId);

  if (since) {
    query = query.gte("occurredAt", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("[supabase-db] getCartEvents error:", error);
    return [];
  }
  return data || [];
}

export async function createCartEvent(data) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("CartEvent").insert({ id, ...data });

  if (error) {
    console.error("[supabase-db] createCartEvent error:", error);
    return false;
  }
  return true;
}

// ─── Session helpers (for webhooks) ─────────────────────────────────────────

export async function deleteSessionsByShop(shop) {
  const { error } = await supabase.from("Session").delete().eq("shop", shop);

  if (error) {
    console.error("[supabase-db] deleteSessionsByShop error:", error);
    return false;
  }
  return true;
}

export async function updateSessionScope(sessionId, scope) {
  const { error } = await supabase
    .from("Session")
    .update({ scope })
    .eq("id", sessionId);

  if (error) {
    console.error("[supabase-db] updateSessionScope error:", error);
    return false;
  }
  return true;
}

// ─── Custom Discounts ───────────────────────────────────────────────────────

export async function getDiscounts(merchantId) {
  const { data, error } = await supabase
    .from("Discount")
    .select("*")
    .eq("merchantId", merchantId)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[supabase-db] getDiscounts error:", error);
    return [];
  }
  return data || [];
}

export async function getDiscount(id) {
  const { data, error } = await supabase
    .from("Discount")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[supabase-db] getDiscount error:", error);
    return null;
  }
  return data;
}

export async function createDiscount(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: discount, error } = await supabase
    .from("Discount")
    .insert({ id, createdAt: now, updatedAt: now, ...data })
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] createDiscount error:", error);
    return null;
  }
  return discount;
}

export async function deleteDiscount(id) {
  const { error } = await supabase.from("Discount").delete().eq("id", id);

  if (error) {
    console.error("[supabase-db] deleteDiscount error:", error);
    return false;
  }
  return true;
}

export async function toggleDiscount(id) {
  const { data: discount } = await supabase
    .from("Discount")
    .select("isActive")
    .eq("id", id)
    .maybeSingle();

  if (!discount) return false;

  const { error } = await supabase
    .from("Discount")
    .update({ isActive: !discount.isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] toggleDiscount error:", error);
    return false;
  }
  return true;
}

export async function getDiscountByCode(merchantId, code) {
  const { data, error } = await supabase
    .from("Discount")
    .select("*")
    .eq("merchantId", merchantId)
    .eq("code", code)
    .eq("isActive", true)
    .maybeSingle();

  if (error) {
    console.error("[supabase-db] getDiscountByCode error:", error);
    return null;
  }
  return data;
}

// ─── Volume Discounts ───

export async function getVolumeDiscountRules(merchantId) {
  const { data, error } = await supabase
    .from("VolumeDiscountRule")
    .select("*")
    .eq("merchantId", merchantId)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[supabase-db] getVolumeDiscountRules error:", error);
    return [];
  }
  return data || [];
}

export async function createVolumeDiscountRule(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data: rule, error } = await supabase
    .from("VolumeDiscountRule")
    .insert({ id, createdAt: now, updatedAt: now, ...data })
    .select()
    .single();

  if (error) {
    console.error("[supabase-db] createVolumeDiscountRule error:", error);
    return null;
  }
  return rule;
}

export async function deleteVolumeDiscountRule(id) {
  const { error } = await supabase.from("VolumeDiscountRule").delete().eq("id", id);

  if (error) {
    console.error("[supabase-db] deleteVolumeDiscountRule error:", error);
    return false;
  }
  return true;
}

export async function toggleVolumeDiscountRule(id) {
  const { data: rule } = await supabase
    .from("VolumeDiscountRule")
    .select("isActive")
    .eq("id", id)
    .maybeSingle();

  if (!rule) return false;

  const { error } = await supabase
    .from("VolumeDiscountRule")
    .update({ isActive: !rule.isActive, updatedAt: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[supabase-db] toggleVolumeDiscountRule error:", error);
    return false;
  }
  return true;
}
