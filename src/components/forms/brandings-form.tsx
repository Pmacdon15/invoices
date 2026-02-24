import { ImageIcon } from "lucide-react";
import Image from "next/image";
import type { Branding, Result } from "@/dal/types";
import { DeleteLogoButton } from "../buttons/delete-logo-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { UploadLogoForm } from "./upload-logo-form";

export default async function BrandingsForm({
  brandingPromise,
}: {
  brandingPromise: Promise<Result<Branding>>;
}) {
  const result = await brandingPromise;
  const { data: branding, error } = result;
  const logoUrl = branding?.logo_url;

  return (
    <Card className="shadow-sm border-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" /> Logo settings
        </CardTitle>
        <CardDescription>
          Upload your organization's logo. This logo will appear on all your
          invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* {error && <div className="text-destructive">{error}</div>} */}
        {logoUrl && (
          <div className="relative bg-muted/30 p-4 rounded-lg flex items-center justify-center border border-muted/50">
            <DeleteLogoButton />
            <Image
              width={600}
              height={600}
              src={logoUrl}
              alt="Organization Logo"
              className="object-contain max-h-25"
            />
          </div>
        )}

        <UploadLogoForm />
      </CardContent>
    </Card>
  );
}
