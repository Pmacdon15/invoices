import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

describe("Button", () => {
  it("renders the default variant and size", () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass("bg-primary", "h-9");
  });

  it.each([
    ["destructive", "bg-destructive"],
    ["outline", "border"],
    ["secondary", "bg-secondary"],
    ["ghost", "hover:bg-accent"],
    ["link", "underline-offset-4"],
  ] as const)("applies the %s variant", (variant, cls) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass(cls);
  });

  it.each([
    ["sm", "h-8"],
    ["lg", "h-10"],
    ["icon", "size-9"],
  ] as const)("applies the %s size", (size, cls) => {
    render(<Button size={size}>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass(cls);
  });

  it("passes props through and handles clicks", () => {
    const onClick = vi.fn();
    render(
      <Button className="extra" onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button")).toHaveClass("extra");
  });

  it("renders its child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/plans">Plans</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Plans" });
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link).toHaveClass("bg-primary");
  });

  it("exposes its class builder", () => {
    expect(buttonVariants({ variant: "outline" })).toContain("border");
  });
});

describe("Badge", () => {
  it("renders the default variant as a span", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-variant", "default");
    expect(badge).toHaveClass("bg-primary");
  });

  it.each([
    ["secondary", "bg-secondary"],
    ["destructive", "bg-destructive"],
    ["outline", "border-border"],
    ["ghost", "[a&]:hover:bg-accent"],
    ["link", "underline-offset-4"],
  ] as const)("applies the %s variant", (variant, cls) => {
    render(<Badge variant={variant}>B</Badge>);
    expect(screen.getByText("B")).toHaveClass(cls);
  });

  it("renders its child element with asChild", () => {
    render(
      <Badge asChild>
        <a href="/x">Link badge</a>
      </Badge>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-slot", "badge");
  });

  it("exposes its class builder", () => {
    expect(badgeVariants({ variant: "secondary" })).toContain("bg-secondary");
  });
});

describe("Card", () => {
  it("renders every slot with merged classes", () => {
    render(
      <Card className="p-8" data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("rounded-xl", "p-8");
    expect(screen.getByTestId("header")).toHaveAttribute(
      "data-slot",
      "card-header",
    );
    for (const [text, slot] of [
      ["Title", "card-title"],
      ["Description", "card-description"],
      ["Action", "card-action"],
      ["Content", "card-content"],
      ["Footer", "card-footer"],
    ]) {
      expect(screen.getByText(text)).toHaveAttribute("data-slot", slot);
    }
  });
});

describe("Input and Label", () => {
  it("links a label to its input and accepts typing", () => {
    const onChange = vi.fn();
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" className="w-10" onChange={onChange} />
      </>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveClass("w-10");
    fireEvent.change(input, { target: { value: "Pat" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("Name")).toHaveAttribute("data-slot", "label");
  });

  it("passes the input type through", () => {
    render(<Input type="number" aria-label="qty" />);
    expect(screen.getByLabelText("qty")).toHaveAttribute("type", "number");
  });
});

describe("Skeleton", () => {
  it("renders a pulsing placeholder", () => {
    render(<Skeleton className="h-4" data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("animate-pulse", "h-4");
  });
});

describe("Table", () => {
  it("renders every slot", () => {
    render(
      <Table className="t">
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Foot</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(table).toHaveClass("t");
    expect(table.parentElement).toHaveAttribute("data-slot", "table-container");
    expect(screen.getByText("Caption")).toHaveAttribute(
      "data-slot",
      "table-caption",
    );
    expect(screen.getByRole("columnheader")).toHaveTextContent("Head");
    expect(screen.getByText("Cell")).toHaveAttribute("data-slot", "table-cell");
    expect(screen.getByText("Foot").closest("tfoot")).toHaveAttribute(
      "data-slot",
      "table-footer",
    );
    expect(table.querySelector("thead")).toHaveAttribute(
      "data-slot",
      "table-header",
    );
    expect(table.querySelector("tbody")).toHaveAttribute(
      "data-slot",
      "table-body",
    );
  });
});
