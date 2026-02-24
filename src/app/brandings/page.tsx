import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBranding } from "@/dal/brandings";
import { UploadLogoForm } from "../../components/forms/upload-logo-form";

export default async function BrandingsPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <h1 className="text-4xl font-black mb-6 tracking-tight">BRANDING</h1>
      <Suspense fallback={<div>Loading branding details...</div>}>
        <BrandingForm />
      </Suspense>
    </div>
  );
}

async function BrandingForm() {
  const { data: branding } = await getBranding("org001a");
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
        {logoUrl && (
          <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-center border border-muted/50">
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
