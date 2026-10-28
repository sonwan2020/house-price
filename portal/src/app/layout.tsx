import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Value Estimator",
  description:
    "Estimate house prices with the regression model served by the House Price Prediction API.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page text-ink antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-ink-muted">
          Powered by the House Price Prediction API · Estimates are stored only in this browser.
        </footer>
      </body>
    </html>
  );
}
