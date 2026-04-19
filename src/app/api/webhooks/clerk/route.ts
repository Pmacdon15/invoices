import { verifyWebhook } from "@clerk/backend/webhooks";
import { type NextRequest, NextResponse } from "next/server";
import { rebalanceOrgItems, deleteOrgData } from "@/db/utils";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    });

    console.log(`Clerk Webhook received: ${evt.type}`);

    if (evt.type === "subscriptionItem.active") {
      const orgId = evt.data.payer?.organization_id;

      if (orgId) {
        await rebalanceOrgItems(orgId);
      }
    } else if (evt.type === "organization.deleted") {
      const orgId = evt.data.id;
      if (orgId) {
        await deleteOrgData(orgId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
