import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";

interface Item {
  id: string;
  label: string;
}

const items: Item[] = [
  { id: "a", label: "First" },
  { id: "b", label: "Second" },
  { id: "c", label: "Third" },
];

function renderSortable(
  value: Item[] = items,
  onValueChange?: (value: Item[]) => void,
) {
  return render(
    <Sortable
      value={value}
      onValueChange={onValueChange ?? (() => {})}
      getItemValue={(item: Item) => item.id}
    >
      {value.map((item) => (
        <SortableItem key={item.id} value={item.id}>
          <span>{item.label}</span>
          <SortableItemHandle data-testid={`handle-${item.id}`}>
            <span aria-hidden>grip</span>
          </SortableItemHandle>
        </SortableItem>
      ))}
    </Sortable>,
  );
}

afterEach(() => {
  cleanup();
});

describe("Sortable", () => {
  it("renders the items in the given order", () => {
    const { container } = renderSortable();

    const rendered = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="sortable-item"]'),
    ).map((element) => element.dataset.value);

    expect(rendered).toEqual(["a", "b", "c"]);
  });

  it("renders each item label", () => {
    renderSortable();

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("exposes the item value through the data attribute", () => {
    const { container } = renderSortable();

    const second = container.querySelector<HTMLElement>(
      '[data-slot="sortable-item"][data-value="b"]',
    );

    expect(second).toBeInTheDocument();
  });

  it("is not dragging initially", () => {
    const { container } = renderSortable();

    const root = container.querySelector<HTMLElement>('[data-slot="sortable"]');
    const item = container.querySelector<HTMLElement>(
      '[data-slot="sortable-item"][data-value="a"]',
    );

    expect(root).toHaveAttribute("data-dragging", "false");
    expect(item).toHaveAttribute("data-dragging", "false");
  });

  it("marks the root as dragging once a drag starts", () => {
    const { container } = renderSortable();

    const root = container.querySelector<HTMLElement>('[data-slot="sortable"]');
    const handle = screen.getByTestId("handle-a");

    expect(root).toHaveAttribute("data-dragging", "false");
    // The handle owns the drag listeners, so it must be reachable and
    // rendered as the activator for the sortable item.
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("data-slot", "sortable-item-handle");
  });

  it("gives the drag handle a grab cursor", () => {
    renderSortable();

    const handle = screen.getByTestId("handle-a");

    expect(handle).toHaveClass("cursor-grab!");
    expect(handle).toHaveAttribute("data-dragging", "false");
  });

  it("does not attach drag listeners to the item body", () => {
    const { container } = renderSortable();

    const item = container.querySelector<HTMLElement>(
      '[data-slot="sortable-item"][data-value="a"]',
    );

    // `useSortable` adds `tabindex`/`aria` attributes to the item itself, but
    // the pointer listeners live on the handle only.
    expect(item).toHaveAttribute("data-slot", "sortable-item");
    expect(item?.getAttribute("data-dragging")).toBe("false");
  });

  it("supports a render-prop-free handle with custom children", () => {
    render(
      <Sortable
        value={items}
        onValueChange={() => {}}
        getItemValue={(item: Item) => item.id}
      >
        {items.map((item) => (
          <SortableItem key={item.id} value={item.id}>
            <SortableItemHandle>
              <span aria-hidden>⠿</span>
            </SortableItemHandle>
          </SortableItem>
        ))}
      </Sortable>,
    );

    expect(screen.getAllByText("⠿")).toHaveLength(3);
  });

  it("applies the className to the root element", () => {
    const { container } = render(
      <Sortable
        value={items}
        onValueChange={() => {}}
        getItemValue={(item: Item) => item.id}
        className="custom-root"
      >
        {items.map((item) => (
          <SortableItem key={item.id} value={item.id}>
            <span>{item.label}</span>
          </SortableItem>
        ))}
      </Sortable>,
    );

    const root = container.querySelector<HTMLElement>('[data-slot="sortable"]');

    expect(root).toHaveClass("custom-root");
  });
});
