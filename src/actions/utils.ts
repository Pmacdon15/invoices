import { redirect } from "next/navigation";

export type ActionErrorReason =
  | "Not authorized"
  | "Validation failed"
  | "Unknown Db error"
  | "Db failed to create product"
  | "Db failed to delete product"
  | "Db failed to create customer"
  | "Db failed to delete customer"
  | "Db failed to create invoice"
  | "Db failed to update invoice"
  | "Db failed to delete invoice"
  | "Test"; // Add this if you want to keep that specific string

export interface ActionError {
  reason: ActionErrorReason;
  message?: string;
  errors?: Record<string, any>; // Add this to hold the Zod tree
}
export function handleMutationError(error: ActionError) {
  const { reason, errors } = error;

  switch (reason) {
    case "Not authorized":
      redirect("/");
      break;

    case "Validation failed":
      return {
        message:
          ` ${reason} ${errors} ` ||
          "Data validation on submitted data has failed ",
      };

    case "Unknown Db error":
      return { message: reason || "Db error" };
    case "Db failed to create product":
      return { message: reason || "Db error" };
    case "Db failed to delete product":
      return { message: reason || "Db error" };
    case "Db failed to create customer":
      return { message: reason || "Db error" };
    case "Db failed to delete customer":
      return { message: reason || "Db error" };
    case "Db failed to create invoice":
      return { message: reason || "Db error" };
    case "Db failed to update invoice":
      return { message: reason || "Db error" };
    case "Db failed to delete invoice":
      return { message: reason || "Db error" };
    case "Test":
      return { message: reason };
    default:
      // Exhaustive check
      throw new Error(`Unhandled error reason: ${reason satisfies never}`);
  }
}
