"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  options: string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  className,
}: Props) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]);
  const selected = value ?? internal;
  const index = Math.max(0, options.indexOf(selected));

  function select(option: string) {
    setInternal(option);
    onChange?.(option);
  }

  return (
    <div
      role="radiogroup"
      className={cn("relative flex rounded-field bg-recessed p-1", className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-[calc(var(--radius-field)-4px)] bg-surface shadow-sm transition-transform duration-200"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === selected}
          onClick={() => select(option)}
          className={cn(
            "relative z-10 flex-1 rounded-[calc(var(--radius-field)-4px)] px-3 py-2 text-label-docket uppercase",
            "focus-visible:outline-2 focus-visible:outline-espresso",
            option === selected ? "text-espresso" : "text-walnut",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
