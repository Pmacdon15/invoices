import { clerkClient } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { revalidateTag } from "next/cache";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function rebalanceOrgItems(orgId: string) {
  if (!process.env.DATABASE_URL) throw new Error("Config Error");
  const sql = neon(process.env.DATABASE_URL);

  const client = await clerkClient();

    // Extract features from subscription items
    const features: string[] = [];
    const MAX_RETRIES = 2;
    const INITIAL_DELAY = 1000; // 1 second

    let subscription: any = null; // Initialize subscription to null
    let lastError: any = null; // To store the last error

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        subscription = await client.billing.getOrganizationBillingSubscription(orgId);
        if (subscription) {
          break; // Success, exit loop
        }
      } catch (e) {
        lastError = e;
        console.warn(
          `Attempt ${i + 1}/${MAX_RETRIES} failed to get organization billing subscription for ${orgId}: ${e}`
        );
        if (i < MAX_RETRIES - 1) {
          const delayTime = INITIAL_DELAY * Math.pow(2, i);
          await delay(delayTime);
        }
      }
    }

    if (subscription?.subscriptionItems) {
      for (const item of subscription.subscriptionItems) {
        if (item.plan?.features) {
          features.push(...item.plan.features.map((f:any) => f.id));
        }
      }
    } else if (lastError) {
      // Only log this if an error occurred and no subscription was retrieved
      console.error(
        `Organization ${orgId} or its billing not found in Clerk after ${MAX_RETRIES} retries, defaulting to starter limits: ${lastError}`,
      );
    }

  console.log(`Organization ${orgId} features:`, features); // Debug log

  // Determine limits
  let customerLimit = 4;
  if (features.includes("create_unlimited_customers")) customerLimit = Infinity;
  else if (features.includes("create_up_to_8_customers")) customerLimit = 8;

  let productLimit = 5;
  if (features.includes("create_unlimited_products")) productLimit = Infinity;
  else if (features.includes("create_up_to_10_products")) productLimit = 10;

  let hasChanged = false;

  // Rebalance Customers
  const customers = await sql`
    SELECT id, status FROM customers 
    WHERE org_id = ${orgId} AND status != 'deleted'
    ORDER BY id ASC
  `;

  for (let i = 0; i < customers.length; i++) {
    const newStatus = i < customerLimit ? "active" : "disabled";
    if (customers[i].status !== newStatus) {
      await sql`UPDATE customers SET status = ${newStatus} WHERE id = ${customers[i].id}`;
      hasChanged = true;
    }
  }

  // Rebalance Products
  const products = await sql`
    SELECT id, status FROM products 
    WHERE org_id = ${orgId} AND status != 'deleted'
    ORDER BY id ASC
  `;

  for (let i = 0; i < products.length; i++) {
    const newStatus = i < productLimit ? "active" : "disabled";
    if (products[i].status !== newStatus) {
      await sql`UPDATE products SET status = ${newStatus} WHERE id = ${products[i].id}`;
      hasChanged = true;
    }
  }

  if (hasChanged) {
    revalidateTag(`customers-${orgId}`, { expire: 0 });
    revalidateTag(`products-${orgId}`, { expire: 0 });
  }
}
