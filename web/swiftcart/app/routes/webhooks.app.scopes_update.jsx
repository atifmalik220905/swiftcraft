import { authenticate } from "../shopify.server";
import { updateSessionScope } from "../supabase-db.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session) {
    await updateSessionScope(session.id, current.toString());
  }

  return new Response();
};
