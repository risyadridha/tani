"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { forwardRef, useState, useEffect } from "react";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  disabled?: boolean;
}

export const QuantitySelector = forwardRef<
  HTMLDivElement,
  QuantitySelectorProps
>(({ value, onChange, min = 1, max = 999, step = 1, unit, className, disabled }, ref) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Nilai valid = min + n*step dalam [min, max] agar konsisten dengan
  // minOrder (mis. kelipatan 20/50). Input manual dibulatkan ke grid ini.
  const roundToStep = (raw: number) => {
    const clamped = Math.min(Math.max(raw, min), max);
    const stepped = min + Math.round((clamped - min) / step) * step;
    return Math.min(Math.max(stepped, min), max);
  };

  const increment = () => {
    const newValue = roundToStep(localValue + step);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = roundToStep(localValue - step);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value, 10);
    if (!isNaN(inputValue)) {
      const steppedValue = roundToStep(inputValue);
      setLocalValue(steppedValue);
      onChange(steppedValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value, 10);
    if (isNaN(inputValue)) {
      setLocalValue(min);
      onChange(min);
    } else {
      const steppedValue = roundToStep(inputValue);
      setLocalValue(steppedValue);
      onChange(steppedValue);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 border border-input rounded-lg overflow-hidden",
        "bg-background",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      role="group"
      aria-label={`Quantity selector${unit ? ` (${unit})` : ""}`}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-none border-r border-input"
        onClick={decrement}
        disabled={disabled || localValue <= min}
        aria-label="Kurangi jumlah"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <input
        type="number"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        className="w-16 text-center bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground"
        aria-label="Jumlah"
        disabled={disabled}
        inputMode="numeric"
      />

      {unit && (
        <span className="px-2 text-sm text-muted-foreground whitespace-nowrap">
          {unit}
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-none border-l border-input"
        onClick={increment}
        disabled={disabled || localValue >= max}
        aria-label="Tambah jumlah"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
});

QuantitySelector.displayName = "QuantitySelector";