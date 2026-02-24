"use client";

import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadLogo } from "@/mutations/brandings";
import imageCompression from "browser-image-compression";

export function UploadLogoForm() {
  const { mutate, isPending } = useUploadLogo();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imageFile = formData.get("logo") as File;

    if (!imageFile || imageFile.size === 0) return;

    // Compression Options
    const options = {
      maxSizeMB: 1,           // Your 1MB limit
      maxWidthOrHeight: 1920, // Optional: resize large photos
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      
      // Replace the original file with the compressed one in a new FormData object
      const compressedData = new FormData();
      compressedData.append("logo", compressedFile, imageFile.name);

      // Call your mutation with the new data
      mutate(compressedData);
    } catch (error) {
      console.error("Compression error:", error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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