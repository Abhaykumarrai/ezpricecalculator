"use client";

import { useEffect, useState } from "react";
import {
  COMPONENT_META,
  COMPONENT_ORDER,
  type ComponentKey,
  type ComponentsConfig,
} from "@/lib/calculator";

interface ComponentSelectorProps {
  components: ComponentsConfig;
  onAdd: (key: ComponentKey) => void;
}

export function ComponentSelector({ components, onAdd }: ComponentSelectorProps) {
  const [toast, setToast] = useState<string | null>(null);
  const availableKeys = COMPONENT_ORDER.filter((key) => !components[key].enabled);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (availableKeys.length === 0) {
    return (
      <div className="select-empty">
        All components added. Remove one below to add a different item.
      </div>
    );
  }

  const handleClick = (key: ComponentKey) => {
    const meta = COMPONENT_META[key];
    if (meta.addable === false) {
      setToast(
        meta.unavailableMessage ??
          "This component is in development and cannot be added yet."
      );
      return;
    }
    onAdd(key);
  };

  return (
    <>
      {toast && (
        <div className="app-toast is-visible" role="status" aria-live="polite">
          {toast}
        </div>
      )}
      <div className="component-select-grid">
        {availableKeys.map((key) => {
          const meta = COMPONENT_META[key];
          const unavailable = meta.addable === false;

          return (
            <button
              key={key}
              type="button"
              className={`component-add-card${unavailable ? " is-unavailable" : ""}`}
              aria-disabled={unavailable || undefined}
              onClick={() => handleClick(key)}
            >
              <span className="component-add-icon" aria-hidden="true">
                +
              </span>
              <span className="component-select-label">{meta.label}</span>
              <span className="component-select-helper">{meta.helper}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
