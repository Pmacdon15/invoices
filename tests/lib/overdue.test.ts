import { describe, expect, it } from "vitest";
import { displayStatus, isOverdue } from "@/lib/overdue";

describe("isOverdue", () => {
  it("is true only for a sent invoice flagged overdue", () => {
    expect(isOverdue({ status: "sent", overdue: true })).toBe(true);
    expect(isOverdue({ status: "sent", overdue: false })).toBe(false);
    expect(isOverdue({ status: "sent" })).toBe(false);
  });

  it("ignores a stale flag once the invoice is paid or back to draft", () => {
    expect(isOverdue({ status: "paid", overdue: true })).toBe(false);
    expect(isOverdue({ status: "draft", overdue: true })).toBe(false);
  });
});

describe("displayStatus", () => {
  it("shows overdue in place of sent", () => {
    expect(displayStatus({ status: "sent", overdue: true })).toBe("overdue");
    expect(displayStatus({ status: "sent", overdue: false })).toBe("sent");
    expect(displayStatus({ status: "paid", overdue: true })).toBe("paid");
    expect(displayStatus({ status: "draft" })).toBe("draft");
  });
});
