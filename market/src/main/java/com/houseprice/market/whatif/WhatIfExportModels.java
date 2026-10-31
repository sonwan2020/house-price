package com.houseprice.market.whatif;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request records for POST /api/v1/market/export/what-if (a.iii export). */
public final class WhatIfExportModels {

  private WhatIfExportModels() {}

  /** One saved what-if run: baseline plus its scenario outcomes, exported as-is. */
  public record WhatIfRun(
      @NotBlank(message = "run label is required.") @Size(max = 120, message = "run label must be at most 120 characters.") String label,
      @NotBlank(message = "created_at is required.") String createdAt,
      @NotNull(message = "baseline is required.") @Valid WhatIfModels.HouseFeaturesRequest baseline,
      Long baselinePrice,
      @NotNull(message = "scenarios is required.") @Size(min = 1, max = 50, message = "scenarios must contain 1 to 50 items.") List<@Valid ScenarioExport> scenarios) {}

  /** One scenario outcome; `changes` maps feature names to their new values. */
  public record ScenarioExport(
      @NotBlank(message = "scenario name is required.") @Size(max = 60, message = "scenario name must be at most 60 characters.") String name,
      @NotNull(message = "changes are required.") @Size(min = 1, max = 7, message = "changes must contain 1 to 7 features.") Map<String, Double> changes,
      Long price,
      Long delta,
      String reason) {}

  /** One or more runs: the portal exports either the current run or the saved history. */
  public record WhatIfExportRequest(
      @NotNull(message = "runs is required.") @Size(min = 1, max = 100, message = "runs must contain 1 to 100 items.") List<@Valid WhatIfRun> runs) {}
}
