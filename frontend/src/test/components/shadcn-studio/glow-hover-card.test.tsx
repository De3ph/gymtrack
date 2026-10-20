import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

import { GlowHoverCard } from "@/components/shadcn-studio/card/glow-hover-card";

// jsdom does not implement the Web Animations API. The component animates the
// spotlight blob with `Element.animate`, so a minimal stub is installed here.
beforeAll(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = function animate() {
      return { cancel: vi.fn(), finish: vi.fn() } as unknown as Animation;
    };
  }
});

afterEach(() => {
  cleanup();
});

describe("GlowHoverCard", () => {
  it("renders the title with no extra description copy by default", () => {
    const { container } = render(<GlowHoverCard />);

    expect(
      screen.getByText("Hover for the Glow-Up"),
    ).toBeInTheDocument();

    // The title lives inside the content slot, and nothing else is rendered,
    // so the card stays compact.
    const content = container.querySelector<HTMLElement>(
      '[data-slot="card-content"]',
    );
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Hover for the Glow-Up");
    expect(content?.querySelector('[data-slot="card-description"]')).toBeNull();
    expect(
      screen.queryByText(/Glide your cursor here and watch magic unfold/i),
    ).not.toBeInTheDocument();
  });

  it("accepts a custom title", () => {
    render(<GlowHoverCard title="Custom title" />);

    expect(screen.getByText("Custom title")).toBeInTheDocument();
  });

  it("renders a leading icon when provided", () => {
    render(<GlowHoverCard title="With icon" icon={<svg data-testid="card-icon" />} />);

    expect(screen.getByTestId("card-icon")).toBeInTheDocument();
  });

  it("acts as a button when an onClick handler is given", () => {
    const onClick = vi.fn();
    render(<GlowHoverCard title="Clickable" onClick={onClick} />);

    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("tabindex", "0");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Enter and Space", () => {
    const onClick = vi.fn();
    render(<GlowHoverCard title="Clickable" onClick={onClick} />);

    const button = screen.getByRole("button");

    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is not interactive when no onClick handler is given", () => {
    render(<GlowHoverCard title="Static" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the blob hidden until the pointer enters the card", () => {
    const { container } = render(<GlowHoverCard />);

    const blob = container.querySelector<HTMLElement>(".blob");
    const fakeBlob = container.querySelector<HTMLElement>(".fake-blob");

    expect(blob).toBeInTheDocument();
    expect(fakeBlob).toBeInTheDocument();
    expect(blob).toHaveClass("opacity-0");
  });

  it("reveals the blob while the pointer moves over the card", () => {
    const { container } = render(<GlowHoverCard />);

    const card = container.querySelector<HTMLElement>(".spotlight-card");
    const blob = container.querySelector<HTMLElement>(".blob");

    expect(card).toBeInTheDocument();

    fireEvent.mouseMove(card!, { clientX: 120, clientY: 60 });

    expect(blob!.style.opacity).toBe("1");
  });

  it("hides the blob again when the pointer leaves the card", () => {
    const { container } = render(<GlowHoverCard />);

    const card = container.querySelector<HTMLElement>(".spotlight-card");
    const blob = container.querySelector<HTMLElement>(".blob");

    fireEvent.mouseMove(card!, { clientX: 120, clientY: 60 });
    expect(blob!.style.opacity).toBe("1");

    fireEvent.mouseLeave(card!);
    expect(blob!.style.opacity).toBe("0");
  });

  it("keeps the decorative blob layers non-interactive", () => {
    const { container } = render(<GlowHoverCard title="Clickable" onClick={vi.fn()} />);

    const blob = container.querySelector<HTMLElement>(".blob");
    const fakeBlob = container.querySelector<HTMLElement>(".fake-blob");

    // The blob follows the cursor and is painted above the card. Without
    // `pointer-events-none` it swallows every click aimed at the card.
    expect(blob).toHaveClass("pointer-events-none");
    expect(fakeBlob).toHaveClass("pointer-events-none");
  });

  it("clicks through the decorative blob layer", () => {
    const onClick = vi.fn();
    const { container } = render(
      <GlowHoverCard title="Clickable" onClick={onClick} />,
    );

    const blob = container.querySelector<HTMLElement>(".blob")!;
    const card = container.querySelector<HTMLElement>(".spotlight-card")!;

    // Moving the pointer over the card makes the blob track the cursor.
    fireEvent.mouseMove(card, { clientX: 120, clientY: 60 });
    expect(blob.style.opacity).toBe("1");

    // A click that lands on the blob must still reach the card.
    fireEvent.click(blob);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("removes its listeners on unmount", () => {
    const removeEventListener = vi.spyOn(HTMLElement.prototype, "removeEventListener");

    const { unmount } = render(<GlowHoverCard />);
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function),
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "mouseleave",
      expect.any(Function),
    );

    removeEventListener.mockRestore();
  });
});
