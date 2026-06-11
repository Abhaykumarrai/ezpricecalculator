"use client";

import { Fragment, useEffect, useState } from "react";
import { AiFeatureSubRows } from "@/components/AiFeatureSubRows";
import {
  COMPONENT_META,
  COMPONENT_ORDER,
  type ComponentKey,
  type ComponentsConfig,
  type DistributionMode,
  type AiSubFeatureId,
} from "@/lib/calculator";

interface ComponentConfigTableProps {
  components: ComponentsConfig;
  totalUsers: number;
  onTotalUsersChange: (users: number) => void;
  onQuantityChange: (key: ComponentKey, quantity: number) => void;
  onPriceChange: (key: ComponentKey, price: number) => void;
  onDistributionChange: (key: ComponentKey, distribution: DistributionMode) => void;
  onAiSubFeatureToggle: (id: AiSubFeatureId, included: boolean) => void;
  onRemove: (key: ComponentKey) => void;
}

function formatNumericDisplay(value: number, integer: boolean): string {
  return integer ? String(Math.round(value)) : String(value);
}

function SheetNumericInput({
  value,
  onCommit,
  integer = false,
  min = 0,
  className,
  ariaLabel,
}: {
  value: number;
  onCommit: (val: number) => void;
  integer?: boolean;
  min?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(() => formatNumericDisplay(value, integer));

  useEffect(() => {
    setText(formatNumericDisplay(value, integer));
  }, [value, integer]);

  const parseRaw = (raw: string): number | null => {
    if (raw === "" || raw === "-" || raw === ".") return null;
    const val = integer ? parseInt(raw, 10) : parseFloat(raw);
    return isNaN(val) ? null : val;
  };

  const tryCommit = (raw: string) => {
    if (raw.endsWith(".")) return;
    const val = parseRaw(raw);
    if (val === null || val < min) return;
    onCommit(val);
  };

  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      className={className}
      value={text}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        if (integer && /[^\d]/.test(raw) && raw !== "") return;
        if (!integer && /[^\d.]/.test(raw) && raw !== "") return;
        setText(raw);
        tryCommit(raw);
      }}
      onBlur={() => {
        const val = parseRaw(text);
        if (val === null || val < min) {
          setText(formatNumericDisplay(value, integer));
          return;
        }
        onCommit(val);
        setText(formatNumericDisplay(val, integer));
      }}
    />
  );
}

function DistributionCell({
  componentKey,
  setting,
  onDistributionChange,
}: {
  componentKey: ComponentKey;
  setting: ComponentsConfig[ComponentKey];
  onDistributionChange: (key: ComponentKey, distribution: DistributionMode) => void;
}) {
  const meta = COMPONENT_META[componentKey];
  if (!meta.supportsDistribution) return null;

  const distribution = setting.distribution ?? "perUser";

  return (
    <div className="distribution-cell">
      <select
        className="sheet-select distribution-select"
        value={distribution}
        aria-label={`${meta.label} distribution`}
        onChange={(e) =>
          onDistributionChange(componentKey, e.target.value as DistributionMode)
        }
      >
        <option value="perUser">Per user basis</option>
        <option value="overall">Overall</option>
      </select>
    </div>
  );
}

function ValueCell({
  componentKey,
  setting,
  onQuantityChange,
}: {
  componentKey: ComponentKey;
  setting: ComponentsConfig[ComponentKey];
  onQuantityChange: (key: ComponentKey, quantity: number) => void;
}) {
  const meta = COMPONENT_META[componentKey];

  if (!meta.hasValue) {
    return <span className="sheet-na">NA</span>;
  }

  return (
    <SheetNumericInput
      className="sheet-input value-input"
      value={setting.quantity}
      integer
      min={meta.valueMin ?? 1}
      ariaLabel={`${meta.label} value`}
      onCommit={(val) => onQuantityChange(componentKey, val)}
    />
  );
}

function RateCell({
  componentKey,
  setting,
  onPriceChange,
}: {
  componentKey: ComponentKey;
  setting: ComponentsConfig[ComponentKey];
  onPriceChange: (key: ComponentKey, price: number) => void;
}) {
  const meta = COMPONENT_META[componentKey];

  return (
    <div className="sheet-inline-value">
      {componentKey !== "aiFeatures" && (
        <span className="sheet-cell-prefix">₹</span>
      )}
      <SheetNumericInput
        className="sheet-input rate-input"
        value={setting.price}
        min={0}
        ariaLabel={`${meta.label} rate`}
        onCommit={(val) => onPriceChange(componentKey, val)}
      />
      <span className="sheet-cell-suffix">{meta.rateLabel}</span>
    </div>
  );
}

export function ComponentConfigTable({
  components,
  totalUsers,
  onTotalUsersChange,
  onQuantityChange,
  onPriceChange,
  onDistributionChange,
  onAiSubFeatureToggle,
  onRemove,
}: ComponentConfigTableProps) {
  const enabledKeys = COMPONENT_ORDER.filter((key) => components[key].enabled);

  return (
    <div className="config-table-wrap">
      <div className="total-users-row">
        <span className="total-users-label">Total Users</span>
        <SheetNumericInput
          className="sheet-input total-users-input"
          value={totalUsers}
          integer
          min={1}
          ariaLabel="Total users"
          onCommit={onTotalUsersChange}
        />
      </div>

      {enabledKeys.length === 0 ? (
        <div className="quantity-empty">
          No components added yet. Use the buttons below to add items.
        </div>
      ) : (
      <table className="sheet-table config-spreadsheet">
        <thead>
          <tr>
            <th>Component</th>
            <th>Value</th>
            <th>Rate</th>
            <th>Distribution</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {enabledKeys.map((key) => {
            const meta = COMPONENT_META[key];
            const setting = components[key];

            return (
              <Fragment key={key}>
                <tr className="config-row" data-component={key}>
                  <td className="config-component">
                    {meta.label}
                    {meta.tooltip && (
                      <span
                        className="tooltip-trigger"
                        tabIndex={0}
                        aria-label={`${meta.label} info`}
                      >
                        ?
                        <span className="tooltip-text">{meta.tooltip}</span>
                      </span>
                    )}
                  </td>
                  <td className="config-value">
                    <ValueCell
                      componentKey={key}
                      setting={setting}
                      onQuantityChange={onQuantityChange}
                    />
                  </td>
                  <td className="config-rate">
                    <RateCell
                      componentKey={key}
                      setting={setting}
                      onPriceChange={onPriceChange}
                    />
                  </td>
                  <td className="config-distribution">
                    <DistributionCell
                      componentKey={key}
                      setting={setting}
                      onDistributionChange={onDistributionChange}
                    />
                  </td>
                  <td className="sheet-action-cell">
                    <button
                      type="button"
                      className="component-remove-btn"
                      aria-label={`Remove ${meta.label}`}
                      onClick={() => onRemove(key)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
                {key === "aiFeatures" && (
                  <AiFeatureSubRows
                    creditRs={setting.price}
                    distribution={setting.distribution}
                    totalUsers={totalUsers}
                    aiSubFeatures={setting.aiSubFeatures}
                    onAiSubFeatureToggle={onAiSubFeatureToggle}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      )}
    </div>
  );
}
