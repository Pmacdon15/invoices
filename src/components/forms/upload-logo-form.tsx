"use client";

import imageCompression from "browser-image-compression";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadLogo } from "@/mutations/brandings";

export function UploadLogoForm() {
  const { mutate, isPending } = useUploadLogo();

  async function handleSubmit(formData:FormData) {
 
    const imageFile = formData.get("logo") as File;

    if (!imageFile || imageFile.size === 0) return;

    // Compression Options
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920, 
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);

      const compressedData = new FormData();
      compressedData.append("logo", compressedFile, imageFile.name);

      mutate(compressedData);
    } catch (error) {
      console.error("Compression error:", error);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="logo">Select new logo image</Label>
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          required
          className="cursor-pointer file:cursor-pointer"
          disabled={isPending}
        />
      </div>
      <Button type="submit" className="w-full font-bold" disabled={isPending}>
        <UploadCloud className="h-4 w-4 mr-2" />
        {isPending ? "Uploading..." : "Upload Logo"}
      </Button>
    </form>
  );
}
