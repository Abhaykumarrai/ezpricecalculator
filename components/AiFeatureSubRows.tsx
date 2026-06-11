"use client";

import {
  AI_FEATURE_DETAIL_ROWS,
  buildAiSubFeatureTooltip,
  calcAiSubFeatureCounts,
  normalizeAiSubFeatures,
  type AiSubFeatureId,
  type AiSubFeaturesEnabled,
  type DistributionMode,
} from "@/lib/calculator";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip-trigger" tabIndex={0} aria-label="More info">
      ?
      <span className="tooltip-text ai-calc-tooltip">{text}</span>
    </span>
  );
}

function formatSubRate(rate: number): string {
  if (rate < 0.01) return rate.toFixed(5);
  return rate.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function RateCellContent({ rate, rateNote }: { rate?: number; rateNote?: string }) {
  if (rate === undefined && !rateNote) return null;
  if (rate === undefined) {
    return <span className="config-sub-rate-note">{rateNote}</span>;
  }
  return (
    <div className="sheet-inline-value config-sub-rate">
      <span className="sheet-cell-prefix">₹</span>
      <span className="config-sub-rate-value">{formatSubRate(rate)}</span>
      {rateNote && <span className="sheet-cell-suffix">{rateNote}</span>}
    </div>
  );
}

export function AiFeatureSubRows({
  creditRs,
  distribution = "perUser",
  totalUsers,
  aiSubFeatures,
  onAiSubFeatureToggle,
}: {
  creditRs: number;
  distribution?: DistributionMode;
  totalUsers: number;
  aiSubFeatures?: AiSubFeaturesEnabled;
  onAiSubFeatureToggle: (id: AiSubFeatureId, included: boolean) => void;
}) {
  const subFeatures = normalizeAiSubFeatures(aiSubFeatures);
  const counts = calcAiSubFeatureCounts(
    creditRs,
    distribution,
    totalUsers,
    subFeatures
  );

  return (
    <>
      {AI_FEATURE_DETAIL_ROWS.map((row) => {
        const subId = row.id as AiSubFeatureId;
        const included = subFeatures[subId];

        return (
          <tr
            key={row.id}
            className={`config-sub-row${included ? "" : " is-disabled"}`}
          >
            <td className={`config-sub-label depth-${row.depth}`}>
              <label className="ai-sub-include">
                <input
                  type="checkbox"
                  className="ai-sub-checkbox"
                  checked={included}
                  aria-label={`Include ${row.label}`}
                  onChange={(e) => onAiSubFeatureToggle(subId, e.target.checked)}
                />
                <span>{row.label}</span>
              </label>
              <Tooltip
                text={buildAiSubFeatureTooltip(
                  subId,
                  creditRs,
                  distribution,
                  totalUsers,
                  subFeatures
                )}
              />
            </td>
            <td className="config-value"></td>
            <td className="config-rate">
              <RateCellContent rate={row.rate} rateNote={row.rateNote} />
            </td>
            <td className="config-distribution">
              {included && row.valueType && row.valueType !== "na" ? (
                <div className="search-count-cell">
                  <span className="credit-count-badge">{counts[subId]}</span>
                  <span className="sheet-cell-suffix">{row.countLabel}</span>
                </div>
              ) : null}
            </td>
            <td></td>
          </tr>
        );
      })}
    </>
  );
}
