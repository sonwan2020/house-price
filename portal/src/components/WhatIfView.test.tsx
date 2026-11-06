import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WhatIfView from "./WhatIfView";

// next/link needs the app-router context in the real runtime; the back
// link is not what this test is about.
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const predict = vi.fn();
vi.stubGlobal("fetch", predict);

function mockPriceResponse(price: number) {
  return {
    ok: true,
    json: async () => ({
      summary: { total: 1, succeed: price > 0 ? 1 : 0, failed: price > 0 ? 0 : 1 },
      predicts: [{ index: 0, id: "", price, reason: price > 0 ? "" : "Out of range" }],
    }),
  };
}

describe("WhatIfView baseline seeding", () => {
  it("prefills the seeded fields and keeps the defaults for the rest", () => {
    render(<WhatIfView initialBaseline={{ square_footage: "1800", bedrooms: "4" }} />);

    expect(screen.getByLabelText(/square footage/i)).toHaveValue(1800);
    expect(screen.getByLabelText(/bedrooms/i)).toHaveValue(4);
    // Unseeded fields fall back to BASELINE_DEFAULTS.
    expect(screen.getByLabelText(/lot size/i)).toHaveValue(6000);
    expect(screen.getByLabelText(/distance to centre/i)).toHaveValue(5);
  });
});

describe("WhatIfView baseline price", () => {
  it("predicts the baseline property and shows its price", async () => {
    predict.mockResolvedValue(mockPriceResponse(512400));
    render(<WhatIfView />);

    expect(await screen.findByText("$512,400", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(predict).toHaveBeenCalledWith(
      "/api/predict",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((predict.mock.calls[0][1] as RequestInit).body as string) as unknown[];
    expect(body[0]).toMatchObject({ square_footage: 1500, bedrooms: 3 });
  });

  it("re-predicts when a baseline field changes", async () => {
    predict.mockResolvedValue(mockPriceResponse(512400));
    render(<WhatIfView />);
    await screen.findByText("$512,400", {}, { timeout: 3000 });
    const callsBefore = predict.mock.calls.length;

    predict.mockResolvedValue(mockPriceResponse(600000));
    fireEvent.change(screen.getByLabelText(/square footage/i), { target: { value: "2000" } });

    expect(await screen.findByText("$600,000", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(predict.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("does not call the prediction service while the baseline is invalid", async () => {
    predict.mockReset();
    render(<WhatIfView initialBaseline={{ square_footage: "" }} />);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(predict).not.toHaveBeenCalled();
  });
});
