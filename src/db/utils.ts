import { clerkClient } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { revalidateTag } from "next/cache";

export async function rebalanceOrgItems(orgId: string) {
  console.log(`\n--- Starting rebalance for Org: ${orgId} ---`);

  if (!process.env.DATABASE_URL) throw new Error("Config Error");
  const sql = neon(process.env.DATABASE_URL);
  const client = await clerkClient();

  let features: string[] = [];

  try {
    const subscription = await client.billing.getOrganizationBillingSubscription(orgId);
    if (subscription?.subscriptionItems) {
      features = subscription.subscriptionItems.flatMap(
        (item: any) => item.plan?.features?.map((f: any) => f.id) || [],
      );
      console.log(`✅ Subscription found. IDs: [${features.join(", ")}]`);
    }
  } catch (e: any) {
    if (e.status !== 404) console.error(`❌ Clerk Error:`, e);
    else console.log(`ℹ️ No subscription, using defaults.`);
  }

  // UPDATE THESE IDs based on what you see in your Clerk Dashboard
  // Example mapping based on your log: feat_3CYBDWdxcBcdOua46D6TsN4zqjc
  const customerLimit = (features.includes("feat_3CYBDWdxcBcdOua46D6TsN4zqjc") || features.includes("create_unlimited_customers"))
    ? Infinity 
    : (features.includes("feat_3CYAsb2OAHlSqpXBsTEMBdWE1Ul") || features.includes("create_up_to_8_customers"))
    ? 8 
    : 4;

  const productLimit = (features.includes("feat_3CYAykGnVuDFInhfFwtyhumgYhO") || features.includes("create_unlimited_products"))
    ? Infinity 
    : 5;

  console.log(`📊 Limits -> Cust: ${customerLimit}, Prod: ${productLimit}`);

  let hasChanged = false;

  // CUSTOMERS
  const customers = await sql`SELECT id, status FROM customers WHERE org_id = ${orgId} AND status != 'deleted' ORDER BY id ASC`;
  for (let i = 0; i < customers.length; i++) {
    const newStatus = i < customerLimit ? "active" : "disabled";
    if (customers[i].status !== newStatus) {
      console.log(`   [!] CUSTOMER ${customers[i].id}: ${customers[i].status} -> ${newStatus}`);
      await sql`UPDATE customers SET status = ${newStatus} WHERE id = ${customers[i].id}`;
      hasChanged = true;
    }
  }

  // PRODUCTS
  const products = await sql`SELECT id, status FROM products WHERE org_id = ${orgId} AND status != 'deleted' ORDER BY id ASC`;
  for (let i = 0; i < products.length; i++) {
    const newStatus = i < productLimit ? "active" : "disabled";
    if (products[i].status !== newStatus) {
      console.log(`   [!] PRODUCT ${products[i].id}: ${products[i].status} -> ${newStatus}`);
      await sql`UPDATE products SET status = ${newStatus} WHERE id = ${products[i].id}`;
      hasChanged = true;
    }
  }

  if (hasChanged) {
    revalidateTag(`customers-${orgId}`, { expire: 0 });
    revalidateTag(`products-${orgId}`, { expire: 0 });
    console.log(`🚀 Database updated and cache cleared.`);
  } else {
    console.log(`✨ Sync complete. No changes required.`);
  }
}