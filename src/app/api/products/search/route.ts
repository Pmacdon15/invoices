import { type NextRequest, NextResponse } from "next/server";
import { searchProductsDal } from "@/dal/products";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  const result = await searchProductsDal(query);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
