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

  const SLUG_PRO_CUSTOMERS = process.env.NEXT_PUBLIC_CLERK_PRO_CUSTOMERS_SLUG || "create_up_to_100_customers";
  const SLUG_BASIC_CUSTOMERS = process.env.NEXT_PUBLIC_CLERK_BASIC_CUSTOMERS_SLUG || "create_up_to_8_customers";
  const SLUG_FREE_CUSTOMERS = process.env.NEXT_PUBLIC_CLERK_FREE_CUSTOMERS_SLUG || "create_up_to_4_customers";

  const SLUG_PRO_PRODUCTS = process.env.NEXT_PUBLIC_CLERK_PRO_PRODUCTS_SLUG || "create_up_to_100_products";
  const SLUG_BASIC_PRODUCTS = process.env.NEXT_PUBLIC_CLERK_BASIC_PRODUCTS_SLUG || "create_up_to_10_products";
  const SLUG_FREE_PRODUCTS = process.env.NEXT_PUBLIC_CLERK_FREE_PRODUCTS_SLUG || "create_up_to_5_products";

  const PRO_LIMIT = parseInt(process.env.NEXT_PUBLIC_PRO_LIMIT || "100", 10);
  const BASIC_CUSTOMER_LIMIT = parseInt(process.env.NEXT_PUBLIC_BASIC_CUSTOMER_LIMIT || "8", 10);
  const FREE_CUSTOMER_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_CUSTOMER_LIMIT || "4", 10);
  const BASIC_PRODUCT_LIMIT = parseInt(process.env.NEXT_PUBLIC_BASIC_PRODUCT_LIMIT || "10", 10);
  const FREE_PRODUCT_LIMIT = parseInt(process.env.NEXT_PUBLIC_FREE_PRODUCT_LIMIT || "5", 10);

  let customerLimit = FREE_CUSTOMER_LIMIT;
  let productLimit = FREE_PRODUCT_LIMIT;
  const limitReasons: string[] = [];

  if (foundFeatures.length > 0) {
    // Check for customer limits using feature names (slugs)
    if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_PRO_CUSTOMERS)) {
      customerLimit = PRO_LIMIT;
      limitReasons.push(`up to ${PRO_LIMIT} customers`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_BASIC_CUSTOMERS)) {
      customerLimit = BASIC_CUSTOMER_LIMIT;
      limitReasons.push(`up to ${BASIC_CUSTOMER_LIMIT} customers`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_FREE_CUSTOMERS)) {
      customerLimit = FREE_CUSTOMER_LIMIT;
      limitReasons.push(`up to ${FREE_CUSTOMER_LIMIT} customers`);
    }

    // Check for product limits using feature names (slugs)
    if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_PRO_PRODUCTS)) {
      productLimit = PRO_LIMIT;
      limitReasons.push(`up to ${PRO_LIMIT} products`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_BASIC_PRODUCTS)) {
      productLimit = BASIC_PRODUCT_LIMIT;
      limitReasons.push(`up to ${BASIC_PRODUCT_LIMIT} products`);
    } else if (foundFeatures.some(f => normalizeNameToSlug(f.name) === SLUG_FREE_PRODUCTS)) {
      productLimit = FREE_PRODUCT_LIMIT;
      limitReasons.push(`up to ${FREE_PRODUCT_LIMIT} products`);
    }
  }

  const finalLimitReason = limitReasons.length > 0 ? limitReasons.join(", ") : "default limits";

  console.log(`📊 Limits set to -> Customers: ${customerLimit}, Products: ${productLimit} (Reason: ${finalLimitReason})`);

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
export async function deleteOrgData(orgId: string) {
  console.log(`\n--- Deleting data for Org: ${orgId} ---`);

  if (!process.env.DATABASE_URL) throw new Error("Config Error");
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Delete invoices first, which cascades to invoice_items
    await sql`DELETE FROM invoices WHERE org_id = ${orgId}`;
    
    // Delete products and customers
    await sql`DELETE FROM products WHERE org_id = ${orgId}`;
    await sql`DELETE FROM customers WHERE org_id = ${orgId}`;

    console.log(`✅ Successfully deleted all data for Org: ${orgId}`);
  } catch (error) {
    console.error(`❌ Error deleting data for Org ${orgId}:`, error);
    throw error;
  }
}
