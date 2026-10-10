// scripts/check-abandoned.mjs
// Checks open checkouts every minute and sends a Telegram alert
// for any checkout that has been inactive for N minutes.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const MINUTES = Number(process.env.ABANDON_AFTER_MINUTES ?? 60);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.alerts");
  process.exit(1);
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  });
  if (!res.ok) {
    console.error("Telegram error:", await res.text());
  }
  return res.ok;
}

async function check() {
  const cutoff = new Date(Date.now() - MINUTES * 60 * 1000);

  const abandoned = await db.checkout.findMany({
    where: {
      status: "open",
      email: { not: null },
      updatedAt: { lt: cutoff },
    },
  });

  for (const c of abandoned) {
    const text =
      `Abandoned checkout\n` +
      `Amount: ${c.currency} ${c.totalPrice}\n` +
      `Customer: ${c.email}\n` +
      `Recovery link: ${c.checkoutUrl ?? "-"}`;

    const ok = await sendTelegram(text);
    if (ok) {
      await db.checkout.update({
        where: { id: c.id },
        data: { status: "alerted", alertedAt: new Date() },
      });
      console.log("Alert sent for", c.email);
    }
  }
}

console.log(`Watching checkouts. Alert after ${MINUTES} minute(s) of inactivity.`);
await check();
setInterval(check, 60 * 1000);