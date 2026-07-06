import { authenticate } from "../shopify.server";
import { deleteSessionsByShop, updateMerchant } from "../supabase-db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await deleteSessionsByShop(shop);
  }

  // Deactivate merchant in database
  try {
    await updateMerchant(shop, { isActive: false });
  } catch (err) {
    console.warn(`[SwiftCart] Failed to mark shop ${shop} as inactive:`, err.message);
  }

  return new Response();
};
