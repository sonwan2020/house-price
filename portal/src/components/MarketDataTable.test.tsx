import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type AnchorHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ListingsPage } from "@/lib/market";
import MarketDataTable from "./MarketDataTable";

// next/link needs the app-router context in the real runtime; in jsdom a
// plain anchor keeps the tests about selection and the href contract.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const page: ListingsPage = {
  total: 2,
  page: 0,
  size: 25,
  listings: [
    {
      id: 12,
      square_footage: 1500,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 2000,
      lot_size: 6000,
      distance_to_city_center: 5,
      school_rating: 8,
      price: 450000,
    },
    {
      id: 21,
      square_footage: 2200,
      bedrooms: 4,
      bathrooms: 3,
      year_built: 2010,
      lot_size: 9000,
      distance_to_city_center: 8.1,
      school_rating: 7,
      price: 640000,
    },
  ],
};

const noop = () => {};

/** Wraps the table with real selection state, spying on every change. */
function Harness({ onSelect = noop }: { onSelect?: (id: number | null) => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  return (
    <MarketDataTable
      page={page}
      loading={false}
      sortBy="price"
      sortDir="desc"
      selectedId={selectedId}
      onSort={noop}
      onPageChange={noop}
      onSizeChange={noop}
      onSelect={(id) => {
        setSelectedId(id);
        onSelect(id);
      }}
    />
  );
}

describe("MarketDataTable row selection", () => {
  it("selects a row on click and deselects it on a second click", () => {
    render(<Harness />);
    expect(screen.queryByRole("link", { name: "What-if analysis" })).not.toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]);
    expect(screen.getByRole("link", { name: "What-if analysis" })).toBeInTheDocument();
    expect(rows[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getAllByRole("row")[1]);
    expect(screen.queryByRole("link", { name: "What-if analysis" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")[1]).toHaveAttribute("aria-selected", "false");
  });

  it("moves the selection when another row is clicked", () => {
    render(<Harness />);
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]);
    fireEvent.click(rows[2]);

    expect(rows[1]).toHaveAttribute("aria-selected", "false");
    expect(rows[2]).toHaveAttribute("aria-selected", "true");
  });

  it("links the selected row to the what-if page with the listing's baseline", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("row")[1]);

    const link = screen.getByRole("link", { name: "What-if analysis" });
    expect(link).toHaveAttribute(
      "href",
      "/market/what-if?square_footage=1500&bedrooms=3&bathrooms=2&year_built=2000&lot_size=6000&distance_to_city_center=5&school_rating=8",
    );
  });

  it("does not change the selection when the what-if link is clicked", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole("row")[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("link", { name: "What-if analysis" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("toggles the selection with the Enter key", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("row")[2], { key: "Enter" });
    expect(screen.getAllByRole("row")[2]).toHaveAttribute("aria-selected", "true");
  });
});
