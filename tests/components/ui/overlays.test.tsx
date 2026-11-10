import "../helpers/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

describe("AlertDialog", () => {
  function renderAlert(onAction = vi.fn()) {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent className="extra">
          <AlertDialogHeader>
            <AlertDialogTitle>Sure?</AlertDialogTitle>
            <AlertDialogDescription>Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    return onAction;
  }

  it("is closed until the trigger is clicked", async () => {
    renderAlert();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveClass("extra");
    expect(dialog).toHaveAccessibleName("Sure?");
    expect(dialog).toHaveAccessibleDescription("Cannot be undone.");
  });

  it("runs the action and closes", async () => {
    const onAction = renderAlert();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes on cancel without running the action", async () => {
    const onAction = renderAlert();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveClass("border");
    await userEvent.click(cancel);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("opens, renders its slots and closes with the X button", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit</DialogTitle>
            <DialogDescription>Change things</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog-content");
    expect(dialog).toHaveAccessibleName("Edit");
    expect(screen.getByText("Change things")).toHaveAttribute(
      "data-slot",
      "dialog-description",
    );
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeTruthy();
    expect(
      screen.getByText("Done").closest('[data-slot="dialog-footer"]'),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from a DialogClose button", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription>D</DialogDescription>
          <DialogClose>Done</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Sheet", () => {
  it.each([
    ["right", "right-0"],
    ["left", "left-0"],
    ["top", "top-0"],
    ["bottom", "bottom-0"],
  ] as const)("slides in from the %s", (side, cls) => {
    render(
      <Sheet defaultOpen>
        <SheetContent side={side}>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Nav</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toHaveClass(cls);
  });

  it("opens from its trigger and closes with the X button", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Nav</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Menu");
    expect(
      screen.getByText("Done").closest('[data-slot="sheet-footer"]'),
    ).toBeTruthy();
    expect(screen.getByText("Menu").parentElement).toHaveAttribute(
      "data-slot",
      "sheet-header",
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("can hide the close button", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Nav</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });
});

describe("Popover", () => {
  it("opens its content from the trigger", async () => {
    render(
      <Popover>
        <PopoverAnchor>
          <span>anchor</span>
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="w-10">Popover body</PopoverContent>
      </Popover>,
    );
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const content = screen.getByText("Popover body");
    expect(content).toHaveAttribute("data-slot", "popover-content");
    expect(content).toHaveClass("w-10");
  });
});
