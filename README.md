# Failed Checkout Alert (Shopify demo app)

A small Shopify app that listens to webhooks and sends a Telegram alert when a
customer starts checkout but does not complete the order.

## What it does
- Receives `checkouts/update` and `orders/create` webhooks
- Stores each checkout in a database (email, amount, recovery link, status)
- If a checkout is inactive for N minutes, sends a Telegram alert with the recovery link
- If the order is completed after an alert, marks it as "recovered"

## Tech
Node.js, Shopify CLI, React Router app template, Prisma (SQLite), Telegram Bot API

## Setup
1. Install dependencies: `npm install`
2. Create the database: `npx prisma migrate dev`
3. Copy `.env.alerts.example` to `.env.alerts` and fill in your Telegram bot token and chat id
4. Start the app: `npm run dev`
5. In a second terminal start the watcher: `node --env-file=.env.alerts scripts/check-abandoned.mjs`

## Screenshots

**Telegram alert with recovery link**



![Telegram alert](docs/telegram-alert.png)



**Checkout status in the database (open -> alerted -> recovered)**



![Database status](docs/database-2-status.png)



## Note
Demo project built on a Shopify development store.
## Case study: fixing a webhook race that hid recovered orders

**Problem.** In my first end-to-end test, an abandoned checkout triggered the Telegram alert correctly. The customer then used the recovery link and paid. The dashboard data still showed the checkout as `completed` instead of `recovered`, so the app could not prove it had saved the sale (`alertedAt` was set, `recoveredAt` was empty).

**Root cause.** When an order is paid, Shopify sends two webhooks: `checkouts/update` (with `completed_at`) and `orders/create`. The first handler correctly moved the checkout from `alerted` to `recovered`. The second handler then ran, saw a status that was no longer `alerted`, and overwrote `recovered` with `completed`.

**Fix.** The `orders/create` handler now only changes a checkout that is still `open` or `alerted`. Final statuses are never overwritten:

```ts
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
```

**Result.** After the fix, a new test checkout went `open -> alerted -> recovered` with both `alertedAt` and `recoveredAt` filled in (see the database screenshot above).

**Takeaway.** Shopify can deliver related webhooks in any order and more than once, so handlers must be idempotent and must not overwrite a final state.