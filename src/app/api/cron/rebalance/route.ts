import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { rebalanceOrgItems } from "@/db/utils";

export async function GET(req: Request) {
  // const authHeader = req.headers.get("authorization");
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response("Unauthorized", { status: 401 });
  // }

  if (!process.env.DATABASE_URL) throw new Error("Config Error");
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Get all unique org_ids
    const orgs = await sql`
      SELECT DISTINCT org_id FROM (
        SELECT org_id FROM customers
        UNION
        SELECT org_id FROM products
      ) as combined_orgs
    `;

    console.log(`Starting rebalance for ${orgs.length} organizations`);

    for (const org of orgs) {
      await rebalanceOrgItems(org.org_id);
    }

    return NextResponse.json({ success: true, processed: orgs.length });
  } catch (error) {
    console.error("Cron Rebalance Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
