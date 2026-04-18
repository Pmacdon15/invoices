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
  | "Failed to send invoice"
  | "Failed to verify usage limits"
  | `Usage limit reached, limit: ${string} with your plan. Consider upgrading`
  | "Test";

export interface ActionError {
  reason: ActionErrorReason;
  message?: string;
  errors?: Record<string, unknown>;
}

function isUsageLimitError(
  reason: ActionErrorReason
): reason is `Usage limit reached, limit: ${string} with your plan. Consider upgrading` {
  return reason.startsWith("Usage limit reached");
}

export function handleMutationError(error: ActionError) {
  const { reason, errors } = error;

  if (isUsageLimitError(reason)) {
    return { message: reason };
  }

  switch (reason) {
    case "Not authorized":
      redirect("/");
      break;

    case "Validation failed":
      return {
        message: "Data validation on submitted data has failed",
        errors: errors,
      };

    case "Failed to verify usage limits":
      return { message: "Could not verify subscription limits." };

    case "Unknown Db error":
    case "Db failed to create product":
    case "Db failed to delete product":
    case "Db failed to create customer":
    case "Db failed to delete customer":
    case "Db failed to create invoice":
    case "Db failed to update invoice":
    case "Db failed to delete invoice":
    case "Failed to send invoice":
    case "Test":
      return { message: reason };

    default:
      throw new Error(`Unhandled error reason: ${reason satisfies never}`);
  }
}