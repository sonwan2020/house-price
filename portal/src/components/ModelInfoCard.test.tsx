import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModelInfo } from "@/lib/types";
import ModelInfoCard from "./ModelInfoCard";

const modelInfo: ModelInfo = {
  model: "LinearRegression (positive)",
  model_version: "1.0",
  target: "price",
  feature_order: [],
  coefficients: { intercept: 0, features: {} },
  metrics: {
    cv: { r2: 0.979, mae: 8643.6, rmse: 10776.1 },
  },
};

describe("ModelInfoCard", () => {
  it("renders the model tile and the cross-validated metrics", () => {
    render(<ModelInfoCard modelInfo={modelInfo} />);
    expect(screen.getByText("LinearRegression (positive) v1.0")).toBeInTheDocument();
    expect(screen.getByText("0.979")).toBeInTheDocument();
    expect(screen.getByText("$8,643.6")).toBeInTheDocument();
    expect(screen.getByText("$10,776.1")).toBeInTheDocument();
  });

  it("orders the metric tiles R², MAE, RMSE", () => {
    render(<ModelInfoCard modelInfo={modelInfo} />);
    const [r2, mae, rmse] = ["0.979", "$8,643.6", "$10,776.1"].map((value) =>
      screen.getByText(value),
    );
    const follows = (a: HTMLElement, b: HTMLElement) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(follows(r2, mae)).toBe(true);
    expect(follows(mae, rmse)).toBe(true);
  });

  it("explains each metric with an accessible info mark", () => {
    render(<ModelInfoCard modelInfo={modelInfo} />);
    expect(screen.getByRole("note", { name: /coefficient of determination/ })).toBeInTheDocument();
    expect(screen.getByRole("note", { name: /mean absolute error/ })).toBeInTheDocument();
    expect(screen.getByRole("note", { name: /root mean squared error/ })).toBeInTheDocument();
  });

  it("explains the five-fold cross-validation in the footnote", () => {
    render(<ModelInfoCard modelInfo={modelInfo} />);
    expect(screen.getByText(/five folds/)).toBeInTheDocument();
  });

  it("shows placeholders when the metrics file is missing", () => {
    render(<ModelInfoCard modelInfo={{ ...modelInfo, metrics: null }} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("degrades to an offline notice when the API is down", () => {
    render(<ModelInfoCard modelInfo={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/offline/);
  });
});
