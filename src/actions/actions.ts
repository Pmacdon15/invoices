"use server";
import { auth } from "@clerk/nextjs/server";
import type { Route } from "next";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function redirectAction(page: Route) {
  await auth.protect();
  await redirect(page);
}

export async function revalidatePathAction(path: Route) {
  await auth.protect();
  await revalidatePath(path);
}
export async function updateTagAction(tag: string) {
  await auth.protect();
  await updateTag(tag);
}
