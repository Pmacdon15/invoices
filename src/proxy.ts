import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Pages that need a signed-in user. Plan limits for these are enforced in the
// DAL (free/basic/pro), so any signed-in user can open them.
const authedPages = ["/invoices", "/customers", "/products"];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const isStats = pathname.startsWith("/stats");
  if (!isStats && !authedPages.some((page) => pathname.startsWith(page))) {
    return;
  }

  const { userId, has } = await auth();
  if (!userId || (isStats && !has({ feature: "stats" }))) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc|invoices|customers|products|stats)(.*)",
  ],
};
