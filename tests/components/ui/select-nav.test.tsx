import "../helpers/dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function renderSelect(
  props: {
    onValueChange?: (v: string) => void;
    position?: "popper" | "item-aligned";
    size?: "sm" | "default";
  } = {},
) {
  return render(
    <Select onValueChange={props.onValueChange}>
      <SelectTrigger size={props.size} aria-label="Status">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent position={props.position}>
        <SelectGroup>
          <SelectLabel>Statuses</SelectLabel>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectSeparator />
          <SelectItem value="paid">Paid</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>,
  );
}

describe("Select", () => {
  it("shows the placeholder and default size", () => {
    renderSelect();
    const trigger = screen.getByRole("combobox", { name: "Status" });
    expect(trigger).toHaveAttribute("data-size", "default");
    expect(trigger).toHaveTextContent("Pick one");
  });

  it("applies the small size", () => {
    renderSelect({ size: "sm" });
    expect(screen.getByRole("combobox")).toHaveAttribute("data-size", "sm");
  });

  it.each([
    "item-aligned",
    "popper",
  ] as const)("opens and picks an option (%s)", async (position) => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange, position });
    await userEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(listbox.closest('[data-slot="select-content"]')).toBeTruthy();
    expect(screen.getByText("Statuses")).toHaveAttribute(
      "data-slot",
      "select-label",
    );
    expect(
      document.querySelector('[data-slot="select-separator"]'),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("option", { name: "Paid" }));
    expect(onValueChange).toHaveBeenCalledWith("paid");
    expect(screen.getByRole("combobox")).toHaveTextContent("Paid");
  });

  it("renders the scroll buttons inside an open select", () => {
    render(
      <Select open>
        <SelectTrigger aria-label="s">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectScrollUpButton className="up" />
          <SelectItem value="a">A</SelectItem>
          <SelectScrollDownButton className="down" />
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("option", { name: "A" })).toBeInTheDocument();
  });
});

describe("NavigationMenu", () => {
  it("renders items, links and a viewport by default", async () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>More</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/plans">Plans</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const root = container.querySelector('[data-slot="navigation-menu"]');
    expect(root).toHaveAttribute("data-viewport", "true");
    const trigger = screen.getByRole("button", { name: "More" });
    expect(trigger).toHaveAttribute("data-slot", "navigation-menu-trigger");
    await userEvent.click(trigger);
    expect(await screen.findByRole("link", { name: "Plans" })).toHaveAttribute(
      "data-slot",
      "navigation-menu-link",
    );
    expect(
      container.querySelector('[data-slot="navigation-menu-viewport"]'),
    ).toBeTruthy();
  });

  it("can render without a viewport", () => {
    const { container } = render(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="/">Home</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    expect(
      container.querySelector('[data-slot="navigation-menu"]'),
    ).toHaveAttribute("data-viewport", "false");
    expect(
      container.querySelector('[data-slot="navigation-menu-viewport"]'),
    ).toBeNull();
  });

  it("exposes the trigger style", () => {
    expect(navigationMenuTriggerStyle()).toContain("inline-flex");
  });
});
