"use server";

import { uploadLogoDal } from "@/dal/brandings";

export async function uploadLogoAction(formData: FormData) {
  return await uploadLogoDal(formData);
}
