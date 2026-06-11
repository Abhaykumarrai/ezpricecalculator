"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupee } from "@/lib/calculator";

interface AnimatedSellPriceProps {
  value: number;
}

export function AnimatedSellPrice({ value }: AnimatedSellPriceProps) {
  const [display, setDisplay] = useState(value);
  const animatedRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = animatedRef.current;
    const diff = value - start;

    if (Math.abs(diff) < 0.5) {
      animatedRef.current = value;
      setDisplay(value);
      return;
    }

    const duration = 300;
    const startTime = performance.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      animatedRef.current = current;
      setDisplay(Math.round(current));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        animatedRef.current = value;
        setDisplay(value);
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return <div className="sell-price-value">{formatRupee(display)}</div>;
}
