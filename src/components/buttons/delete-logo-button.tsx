"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteLogo } from "@/mutations/brandings";

export function DeleteLogoButton() {
  const { mutate, isPending } = useDeleteLogo();

  return (
    <Button
      variant="destructive"
      size="icon"
      className="absolute top-2 right-2 h-8 w-8 shadow-md"
      onClick={() => {
        if (confirm("Are you sure you want to delete the logo?")) {
          mutate();
        }
      }}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
