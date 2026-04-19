import { clerkClient } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { revalidateTag } from "next/cache";

export async function rebalanceOrgItems(orgId: string) {
  console.log(`\n--- Starting rebalance for Org: ${orgId} ---`);

  if (!process.env.DATABASE_URL) throw new Error("Config Error");
  const sql = neon(process.env.DATABASE_URL);
  const client = await clerkClient();

  // Array to store found features with their IDs and names
  let foundFeatures: { id: string; name?: string }[] = [];

  try {
    const cleanOrgId = orgId.trim();
    console.log(`[DEBUG] Attempting to fetch subscription for clean orgId: ${JSON.stringify(cleanOrgId)}`);
    const subscription = await client.billing.getOrganizationBillingSubscription(cleanOrgId);
    if (subscription?.subscriptionItems) {
      foundFeatures = subscription.subscriptionItems.flatMap(
        (item: any) => item.plan?.features?.map((f: any) => ({ id: f.id, name: f.name })) || [],
      );
      
      if (foundFeatures.length > 0) {
        const featureIds = foundFeatures.map(f => f.id).join(", ");
        const featureNames = foundFeatures.map(f => f.name || 'N/A').join(", "); // Use 'N/A' if name is missing
        console.log(`✅ Subscription found for ${cleanOrgId}.`);
        console.log(`   Feature IDs: [${featureIds}]`);
        console.log(`   Feature Names: [${featureNames}]`);
      } else {
        console.log(`✅ Subscription found for ${cleanOrgId}, but no features listed.`);
      }
    } else {
      console.log(`ℹ️ No subscription items found for ${cleanOrgId}. Using defaults.`);
    }
  } catch (e: any) {
    console.error(`[DEBUG] Clerk API Full Error Object for ${orgId}:`, JSON.stringify(e, null, 2));
    if (e.status !== 404) {
      console.error(`❌ Clerk API Error for ${orgId}:`, e);
    } else {
      console.log(`ℹ️ No subscription found for ${orgId}, using defaults. Error status: ${e.status}, Error message: ${e.message}`);
    }
  }

  // Helper function to normalize feature names to a slug-like format for comparison
  const normalizeNameToSlug = (name: string | undefined): string => {
    if (!name) return "";
    // Normalize to lowercase, replace multiple spaces with single space, then replace with underscores for slug matching
    return name.toLowerCase().trim().replace(/\s+/g, '_');
  };

  // --- Limit Determination ---

  let customerLimit = 4;
  let productLimit = 5;
  let limitReasons: string[] = [];

 
  const SLUG_UNLIMITED_CUSTOMERS = "create_unlimited_customers";
  const SLUG_8_CUSTOMERS = "create_up_to_8_customers";
  const SLUG_4_CUSTOMERS = "create_up_to_4_customers"; // Explicitly define default if needed as a feature

  const SLUG_UNLIMITED_PRODUCTS = "create_unlimited_products";
  const SLUG_10_PRODUCTS = "create_up_to_10_products";


  if (foundFeatures.length > 0) {
    // Check for customer limits using feature names (slugs)
    if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_UNLIMITED_CUSTOMERS)) {
      customerLimit = Infinity;
      limitReasons.push(`unlimited customers`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_8_CUSTOMERS)) {
      customerLimit = 8;
      limitReasons.push(`up to 8 customers`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_4_CUSTOMERS)) {
      customerLimit = 4;
      limitReasons.push(`up to 4 customers`);
    }

    // Check for product limits using feature names (slugs)
    if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_UNLIMITED_PRODUCTS)) {
      productLimit = Infinity;
      limitReasons.push(`unlimited products`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_10_PRODUCTS)) {
      productLimit = 10;
      limitReasons.push(`up to 10 products`);
    }
  }

  const finalLimitReason = limitReasons.length > 0 ? limitReasons.join(", ") : "default limits";

  console.log(`📊 Limits set to -> Customers: ${customerLimit === Infinity ? "Unlimited" : customerLimit}, Products: ${productLimit === Infinity ? "Unlimited" : productLimit} (Reason: ${finalLimitReason})`);

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