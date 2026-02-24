"use server";

import { deleteLogoDal, uploadLogoDal } from "@/dal/brandings";

export async function uploadLogoAction(formData: FormData) {
  return await uploadLogoDal(formData);
}

export async function deleteLogoAction() {
  return await deleteLogoDal();
}
