"use client";

import { useEffect, useState } from "react";
import type { WhatIfExportRun } from "@/lib/what-if-history";

export type ExportType = "pdf" | "csv";

interface ExportDialogProps {
  /** Shown above the type choice, e.g. "Export what-if run" or "Export history". */
  title: string;
  /** Default file name without extension, e.g. "what-if-2026-10-31". */
  defaultName: string;
  /** Runs sent to the market-api what-if export endpoint. */
  runs: WhatIfExportRun[];
  onClose: () => void;
}

/**
 * Export window (a.iv): pick PDF or CSV — the choice sets the file
 * extension — optionally rename the file, then download the runs rendered
 * by the market-api export endpoint.
 */
export default function ExportDialog({ title, defaultName, runs, onClose }: ExportDialogProps) {
  const [type, setType] = useState<ExportType>("pdf");
  const [stem, setStem] = useState(defaultName);
  const [status, setStatus] = useState<"idle" | "downloading">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const fileName = `${stem}.${type}`;

  const handleExport = async () => {
    setStatus("downloading");
    setError(null);
    try {
      const res = await fetch(`/api/market/export/what-if?type=${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runs }),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        setError(
          data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
            ? data.detail
            : "The export failed.",
        );
        setStatus("idle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("The market analysis service is unreachable. Please try again later.");
      setStatus("idle");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="w-full max-w-sm rounded-lg border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="export-dialog-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Choose a file type — the file name extension follows your choice.
        </p>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-ink-secondary">File type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["pdf", "csv"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={type === option}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  type === option
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-hairline text-ink-secondary hover:text-ink"
                }`}
              >
                {option === "pdf" ? "PDF" : "CSV"}{" "}
                <span className="text-xs text-ink-muted">.{option}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-ink-secondary">File name</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={stem}
              onChange={(event) => setStem(event.target.value.replace(/[.\\/:*?"<>|]/g, ""))}
              className="field-input"
              aria-label="File name"
            />
            <span className="shrink-0 text-sm text-ink-muted">.{type}</span>
          </div>
        </label>

        {error && (
          <p role="alert" className="mt-3 text-xs text-critical">
            ✕ {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={status === "downloading"}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-primary"
            disabled={status === "downloading" || stem.trim() === ""}
          >
            {status === "downloading" ? "Exporting…" : `Download .${type}`}
          </button>
        </div>
      </div>
    </div>
  );
}
