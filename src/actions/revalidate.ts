'use server'
import type { Route } from "next";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function redirectAction(page: Route) {
  await redirect(page);
}

export async function revalidatePathAction(path: Route) {
  await revalidatePath(path);
}
export async function updateTagAction(tag: string) {
  await updateTag(tag);
}
