import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadLogoAction } from "@/actions/brandings";
import { revalidatePathAction } from "@/actions/revalidate";

export const useUploadLogo = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data, error } = await uploadLogoAction(formData);

      if (error) {
        throw new Error(error || "Failed to upload logo");
      }

      return data?.logo_url;
    },
    onSuccess: () => {
      toast.success("Logo has been uploaded successfully");
      revalidatePathAction("/brandings" as any);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
