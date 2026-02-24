"use client";

import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadLogo } from "@/mutations/brandings";

export function UploadLogoForm() {
  const { mutate, isPending } = useUploadLogo();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutate(formData);
  };

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
