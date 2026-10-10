import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Every checkout has a unique token
  const token = payload.token as string | undefined;
  if (!token) return new Response();

  const completed = Boolean(payload.completed_at);
  const existing = await db.checkout.findUnique({ where: { token } });

  // Status flow: open -> alerted -> recovered   (or open -> completed)
  let status = existing?.status ?? "open";
  if (completed) {
    status = status === "alerted" ? "recovered" : "completed";
  }

  await db.checkout.upsert({
    where: { token },
    create: {
      shop,
      token,
      email: payload.email ?? null,
      totalPrice: String(payload.total_price ?? "0"),
      currency: payload.currency ?? "INR",
      checkoutUrl: payload.abandoned_checkout_url ?? null,
      status,
    },
    update: {
      email: payload.email ?? undefined,
      totalPrice: String(payload.total_price ?? "0"),
      checkoutUrl: payload.abandoned_checkout_url ?? undefined,
      status,
      recoveredAt: status === "recovered" ? new Date() : undefined,
    },
  });

  return new Response();
};