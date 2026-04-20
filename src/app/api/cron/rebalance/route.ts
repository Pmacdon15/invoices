import { NextResponse } from "next/server";
import { getAllOrgIds, rebalanceOrgItems } from "@/db/utils";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get all unique org_ids
    const orgs = await getAllOrgIds();

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
