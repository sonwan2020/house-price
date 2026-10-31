/** Shared Vitest setup: jest-dom matchers and RTL cleanup between tests. */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without vitest globals there is no global afterEach, so Testing Library
// cannot auto-cleanup — unmount rendered trees explicitly after each test.
afterEach(() => {
  cleanup();
});
