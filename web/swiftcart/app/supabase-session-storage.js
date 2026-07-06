/**
 * SwiftCart — Custom Shopify Session Storage (Supabase)
 *
 * Implements the SessionStorage interface from @shopify/shopify-app-session-storage
 * using Supabase as the backing store instead of Prisma.
 *
 * Required table: "Session" (already exists from Prisma migrations)
 */

import { Session } from "@shopify/shopify-api";
import { supabase } from "./supabase.server";

export class SupabaseSessionStorage {
  constructor() {
    // Supabase client is imported from supabase.server.js
  }

  /**
   * Store (upsert) a session.
   * @param {Session} session
   * @returns {Promise<boolean>}
   */
  async storeSession(session) {
    const sessionParams = session.toObject();

    const row = {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope || null,
      expires: session.expires ? session.expires.toISOString() : null,
      accessToken: session.accessToken || "",
      userId: sessionParams.onlineAccessInfo?.associated_user?.id
        ? String(sessionParams.onlineAccessInfo.associated_user.id)
        : null,
      firstName:
        sessionParams.onlineAccessInfo?.associated_user?.first_name || null,
      lastName:
        sessionParams.onlineAccessInfo?.associated_user?.last_name || null,
      email: sessionParams.onlineAccessInfo?.associated_user?.email || null,
      accountOwner:
        sessionParams.onlineAccessInfo?.associated_user?.account_owner || false,
      locale: sessionParams.onlineAccessInfo?.associated_user?.locale || null,
      collaborator:
        sessionParams.onlineAccessInfo?.associated_user?.collaborator || false,
      emailVerified:
        sessionParams.onlineAccessInfo?.associated_user?.email_verified || false,
      refreshToken: sessionParams.refreshToken || null,
      refreshTokenExpires: sessionParams.refreshTokenExpires || null,
    };

    const { error } = await supabase.from("Session").upsert(row, {
      onConflict: "id",
    });

    if (error) {
      console.error("[SupabaseSessionStorage] storeSession error:", error);
      return false;
    }
    return true;
  }

  /**
   * Load a session by ID.
   * @param {string} id
   * @returns {Promise<Session|undefined>}
   */
  async loadSession(id) {
    const { data, error } = await supabase
      .from("Session")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseSessionStorage] loadSession error:", error);
      return undefined;
    }

    if (!data) return undefined;
    return this.rowToSession(data);
  }

  /**
   * Delete a session by ID.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteSession(id) {
    const { error } = await supabase.from("Session").delete().eq("id", id);

    if (error) {
      console.error("[SupabaseSessionStorage] deleteSession error:", error);
      return false;
    }
    return true;
  }

  /**
   * Delete multiple sessions by IDs.
   * @param {string[]} ids
   * @returns {Promise<boolean>}
   */
  async deleteSessions(ids) {
    if (!ids.length) return true;

    const { error } = await supabase.from("Session").delete().in("id", ids);

    if (error) {
      console.error("[SupabaseSessionStorage] deleteSessions error:", error);
      return false;
    }
    return true;
  }

  /**
   * Find all sessions for a given shop domain.
   * @param {string} shop
   * @returns {Promise<Session[]>}
   */
  async findSessionsByShop(shop) {
    const { data, error } = await supabase
      .from("Session")
      .select("*")
      .eq("shop", shop);

    if (error) {
      console.error(
        "[SupabaseSessionStorage] findSessionsByShop error:",
        error,
      );
      return [];
    }

    return (data || []).map((row) => this.rowToSession(row));
  }

  /**
   * Convert a DB row to a Shopify Session object.
   * Mirrors the conversion logic from @shopify/shopify-app-session-storage-prisma.
   */
  rowToSession(row) {
    const sessionParams = {
      id: row.id,
      shop: row.shop,
      state: row.state,
      isOnline: row.isOnline,
    };

    if (row.userId != null) sessionParams.userId = String(row.userId);
    if (row.firstName != null) sessionParams.firstName = String(row.firstName);
    if (row.lastName != null) sessionParams.lastName = String(row.lastName);
    if (row.email != null) sessionParams.email = String(row.email);
    if (row.locale != null) sessionParams.locale = String(row.locale);
    if (row.accountOwner != null) sessionParams.accountOwner = row.accountOwner;
    if (row.collaborator != null) sessionParams.collaborator = row.collaborator;
    if (row.emailVerified != null)
      sessionParams.emailVerified = row.emailVerified;

    if (row.expires) {
      sessionParams.expires = new Date(row.expires).getTime();
    }
    if (row.scope) sessionParams.scope = row.scope;
    if (row.accessToken) sessionParams.accessToken = row.accessToken;
    if (row.refreshToken) sessionParams.refreshToken = row.refreshToken;
    if (row.refreshTokenExpires) {
      sessionParams.refreshTokenExpires = new Date(
        row.refreshTokenExpires,
      ).getTime();
    }

    return Session.fromPropertyArray(Object.entries(sessionParams), true);
  }
}
