import { describe, expect, it } from "vitest";
import { formatCompact, formatDateTime, formatNumber, formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats whole dollars", () => {
    expect(formatPrice(251000)).toBe("$251,000");
  });

  it("rounds to whole dollars", () => {
    expect(formatPrice(8643.6)).toBe("$8,644");
  });

  it("shows decimals when requested", () => {
    expect(formatPrice(8643.6, 1)).toBe("$8,643.6");
  });
});

describe("formatCompact", () => {
  it("keeps small numbers plain", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("compacts thousands", () => {
    expect(formatCompact(1200)).toBe("1.2K");
  });
});

describe("formatNumber", () => {
  it("defaults to no decimals", () => {
    expect(formatNumber(1234.56)).toBe("1,235");
  });

  it("supports decimals", () => {
    expect(formatNumber(1234.56, 1)).toBe("1,234.6");
  });
});

describe("formatDateTime", () => {
  it("formats ISO timestamps as readable dates", () => {
    expect(formatDateTime("2026-10-28T09:15:00Z")).toContain("Oct 28, 2026");
  });
});
