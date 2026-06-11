"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ComponentConfigTable } from "@/components/ComponentConfigTable";
import { ComponentSelector } from "@/components/ComponentSelector";
import {
  COMPONENT_ORDER,
  calcCosts,
  calcSellPrice,
  cloneDefaultComponents,
  componentLineCost,
  DEFAULT_TOTAL_USERS,
  formatRupee,
  getBreakdownLabel,
  marginPercentToRupee,
  rupeeToMarginPercent,
  type ComponentKey,
  type ComponentsConfig,
  type DistributionMode,
  type AiSubFeatureId,
  countEnabledAiSubFeatures,
  DEFAULT_AI_SUB_FEATURES,
  normalizeAiSubFeatures,
  type MarginTab,
} from "@/lib/calculator";

const INITIAL_MARGIN_RUPEE = 40;
const initialComponents = cloneDefaultComponents();
const initialCosts = calcCosts(initialComponents, DEFAULT_TOTAL_USERS);
const initialMarginPercent = rupeeToMarginPercent(
  initialCosts.variableCost,
  INITIAL_MARGIN_RUPEE
);

export function CostCalculator() {
  const [components, setComponents] = useState<ComponentsConfig>(initialComponents);
  const [totalUsers, setTotalUsers] = useState(DEFAULT_TOTAL_USERS);
  const [marginEnabled, setMarginEnabled] = useState(false);
  const [marginTab, setMarginTab] = useState<MarginTab>("rupee");
  const [marginRupee, setMarginRupee] = useState(INITIAL_MARGIN_RUPEE);
  const [marginPercent, setMarginPercent] = useState(initialMarginPercent);

  const costs = useMemo(
    () => calcCosts(components, totalUsers),
    [components, totalUsers]
  );

  const effectiveMarginRupee = marginEnabled ? marginRupee : 0;

  const sellPrice = useMemo(
    () => calcSellPrice(costs.variableCost, effectiveMarginRupee),
    [costs.variableCost, effectiveMarginRupee]
  );

  useEffect(() => {
    if (marginTab === "percent") {
      setMarginRupee(marginPercentToRupee(costs.variableCost, marginPercent));
    } else {
      setMarginPercent(rupeeToMarginPercent(costs.variableCost, marginRupee));
    }
    // Re-sync paired margin value when component costs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costs.variableCost]);

  const updateComponent = useCallback(
    (key: ComponentKey, patch: Partial<ComponentsConfig[ComponentKey]>) => {
      setComponents((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...patch },
      }));
    },
    []
  );

  const handleAdd = (key: ComponentKey) => {
    updateComponent(key, { enabled: true });
  };

  const handleRemove = (key: ComponentKey) => {
    updateComponent(key, { enabled: false });
  };

  const handleQuantityChange = (key: ComponentKey, quantity: number) => {
    updateComponent(key, { quantity });
  };

  const handleDistributionChange = (key: ComponentKey, distribution: DistributionMode) => {
    updateComponent(key, { distribution });
  };

  const handleAiSubFeatureToggle = (id: AiSubFeatureId, included: boolean) => {
    setComponents((prev) => {
      const ai = prev.aiFeatures;
      const current = normalizeAiSubFeatures(ai.aiSubFeatures);
      if (!included && countEnabledAiSubFeatures(current) <= 1) {
        return prev;
      }
      return {
        ...prev,
        aiFeatures: {
          ...ai,
          aiSubFeatures: { ...current, [id]: included },
        },
      };
    });
  };

  const handleMarginTabChange = (tab: MarginTab) => {
    if (tab === marginTab) return;
    setMarginTab(tab);
    if (tab === "percent") {
      setMarginPercent(rupeeToMarginPercent(costs.variableCost, marginRupee));
    }
  };

  const handleMarginInput = (val: number) => {
    if (isNaN(val) || val < 0) return;
    if (marginTab === "percent") {
      const pct = Math.min(val, 99.9);
      setMarginPercent(pct);
      setMarginRupee(marginPercentToRupee(costs.variableCost, pct));
    } else {
      setMarginRupee(val);
      setMarginPercent(rupeeToMarginPercent(costs.variableCost, val));
    }
  };

  const marginInputValue =
    marginTab === "percent" ? marginPercent.toFixed(1) : String(Math.round(marginRupee));

  const breakdownRows = COMPONENT_ORDER.filter((key) => components[key].enabled).map((key) => {
    const setting = components[key];
    return {
      key,
      label: getBreakdownLabel(key, setting, totalUsers),
      amount: componentLineCost(key, setting, totalUsers),
    };
  });

  return (
    <main>
      <div className="layout layout-split">
        <section className="panel config-col">
          <ComponentConfigTable
            components={components}
            totalUsers={totalUsers}
            onTotalUsersChange={setTotalUsers}
            onQuantityChange={handleQuantityChange}
            onPriceChange={(key, price) => updateComponent(key, { price })}
            onDistributionChange={handleDistributionChange}
            onAiSubFeatureToggle={handleAiSubFeatureToggle}
            onRemove={handleRemove}
          />
          <div className="config-add-section">
            <div className="config-add-label">Add component</div>
            <ComponentSelector components={components} onAdd={handleAdd} />
          </div>
        </section>

        <section className="panel panel-highlight preview-col">
          <div className="breakdown-header">
            <div className="section-label" style={{ marginBottom: 0 }}>
              Preview
            </div>
          </div>

          <div className="margin-enable-row">
            <label className="switch" aria-label="Enable margin">
              <input
                type="checkbox"
                checked={marginEnabled}
                onChange={(e) => setMarginEnabled(e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
            <span className="margin-enable-label">Add margin</span>
          </div>

          {marginEnabled && (
            <table className="breakdown-table margin-table">
              <tbody>
                <tr className="margin-config-row">
                  <td>Margin</td>
                  <td>
                    <div className="margin-row-controls">
                      <div className="tab-group tab-group-inline">
                        <button
                          type="button"
                          className={`tab-btn${marginTab === "rupee" ? " active" : ""}`}
                          onClick={() => handleMarginTabChange("rupee")}
                        >
                          ₹ Margin
                        </button>
                        <button
                          type="button"
                          className={`tab-btn${marginTab === "percent" ? " active" : ""}`}
                          onClick={() => handleMarginTabChange("percent")}
                        >
                          % Margin
                        </button>
                      </div>
                      <input
                        type="number"
                        className="input-field preview-margin-input"
                        value={marginInputValue}
                        min={0}
                        step={marginTab === "percent" ? 0.1 : 1}
                        onChange={(e) => handleMarginInput(parseFloat(e.target.value))}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {breakdownRows.length > 0 ? (
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Cost Component</th>
                  <th>Per User/Mo</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map(({ key, label, amount }) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{formatRupee(amount)}</td>
                  </tr>
                ))}
                <tr className="row-bold">
                  <td>Variable Cost</td>
                  <td>{formatRupee(costs.variableCost)}</td>
                </tr>
                {marginEnabled && (
                  <tr>
                    <td>Your Margin</td>
                    <td>{formatRupee(marginRupee)}</td>
                  </tr>
                )}
                <tr className="row-sell">
                  <td>Sell Price</td>
                  <td>{formatRupee(sellPrice)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="quantity-empty preview-empty">
              Add components to see the cost preview.
            </div>
          )}

        </section>
      </div>
    </main>
  );
}
