import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  sendInvoiceAction,
  updateInvoiceStatusAction,
  updateInvoiceAction,
} from "@/actions/invoices";

import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/dal/types";

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
        router.push(`/invoices/${data.id}` as Route);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteInvoice = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
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
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      if (options?.onError) {
        options.onError(error);
      } else {
        toast.error(error.message);
      }
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

export const useSendInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await sendInvoiceAction(invoiceId);

      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Invoice sent! Status updated to Sent.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateInvoice = () => {
  return useMutation({
    mutationFn: async (input: UpdateInvoiceInput) => {
      const response = await updateInvoiceAction(input);

      if ("message" in response) {
        throw new Error(response.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("Invoice has been updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
