import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // The order payload carries checkout_token, which links it to the checkout
  const token = payload.checkout_token as string | undefined;
  if (token) {
    const existing = await db.checkout.findUnique({ where: { token } });
    // Don't overwrite a final status that checkouts/update already set
    if (existing && (existing.status === "open" || existing.status === "alerted")) {
      const wasAlerted = existing.status === "alerted";
      await db.checkout.update({
        where: { token },
        data: {
          status: wasAlerted ? "recovered" : "completed",
          recoveredAt: wasAlerted ? new Date() : null,
        },
      });
    }
  }

  return new Response();
};