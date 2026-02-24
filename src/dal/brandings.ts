import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { del, get, put } from "@vercel/blob";
import { CreateBrandingSchema } from "./schema";
import type { Branding, CreateBrandingInput, Result } from "./types";

export async function getBranding(): Promise<Result<Branding>> {
  const { orgId } = await auth.protect();
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    const data =
      (await sql`SELECT * FROM brandings WHERE org_id = ${orgId} LIMIT 1`) as Branding[];

    if (!data || data.length === 0 || !data[0].logo_url)
      return {
        data: null,
        error: "Branding not found or missing logo.",
      };
    const blogData = await get(data[0].logo_url, {
      access: "private",
    });

    let logo_url = data[0].logo_url;
    if (blogData?.stream) {
      const response = new Response(blogData.stream);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      logo_url = `data:${blogData.blob.contentType};base64,${base64}`;
    }

    const brandingDataToSend = {
      id: data[0].id,
      org_id: data[0].org_id,
      logo_url: logo_url,
    };
    return { data: brandingDataToSend, error: null };
  } catch (e: unknown) {
    console.error("Database Fetch Error:", e);
    return {
      data: null,
      error: "Database error occurred while fetching branding.",
    };
  }
}

export async function upsertBranding(
  input: CreateBrandingInput,
): Promise<Result<Branding>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const validation = CreateBrandingSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.issues[0].message };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const [updatedBranding] = (await sql`
      INSERT INTO brandings (org_id, logo_url)
      VALUES (${input.org_id}, ${input.logo_url})
      ON CONFLICT (org_id) DO UPDATE 
      SET logo_url = EXCLUDED.logo_url
      RETURNING *
    `) as Branding[];

    return { data: updatedBranding, error: null };
  } catch (e: unknown) {
    console.error("Database Insert/Update Error:", e);
    return {
      data: null,
      error: "Failed to update branding. Please try again.",
    };
  }
}

export async function uploadLogoDal(
  formData: FormData,
): Promise<Result<Branding>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  const file = formData.get("logo") as File;
  if (!file || file.size === 0) {
    return { data: null, error: "No file selected." };
  }

  try {
    const blob = await put(file.name, file, { access: "private" });
    const org_id = "org001a";

    const input = {
      org_id,
      logo_url: blob.url,
    };

    const validation = CreateBrandingSchema.safeParse(input);
    if (!validation.success) {
      return { data: null, error: validation.error.issues[0].message };
    }

    const sql = neon(process.env.DATABASE_URL);

    const [updatedBranding] = (await sql`
      INSERT INTO brandings (org_id, logo_url)
      VALUES (${input.org_id}, ${input.logo_url})
      ON CONFLICT (org_id) DO UPDATE 
      SET logo_url = EXCLUDED.logo_url
      RETURNING *
    `) as Branding[];

    return { data: updatedBranding, error: null };
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return { data: null, error: "Failed to upload logo and update branding." };
  }
}

export async function deleteLogoDal(
  org_id: string = "org001a",
): Promise<Result<null>> {
  if (!process.env.DATABASE_URL) {
    return { data: null, error: "Configuration error" };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const data =
      (await sql`SELECT * FROM brandings WHERE org_id = ${org_id} LIMIT 1`) as Branding[];

    if (data[0].logo_url) {
      await del(data[0].logo_url);
    }

    await sql`
      UPDATE brandings 
      SET logo_url = NULL 
      WHERE org_id = ${org_id}
    `;

    return { data: null, error: null };
  } catch (e: unknown) {
    console.error("Delete logo error:", e);
    return { data: null, error: "Failed to delete logo." };
  }
}
