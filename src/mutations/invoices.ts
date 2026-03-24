import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceStatusAction,
} from "@/actions/invoices";
// import { updateTagAction } from "@/actions/revalidate";
import type { CreateInvoiceInput } from "@/dal/types";

export const useCreateInvoice = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const response = await createInvoiceAction(input);
      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Invoice has been created");

      if (data?.id) {
        router.push(`/invoices/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteInvoice = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteInvoiceAction(id);

      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Invoice has been deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "draft" | "sent" | "paid";
    }) => {
      const response = await updateInvoiceStatusAction(id, status);

      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Invoice status has been updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
