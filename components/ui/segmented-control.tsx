"use client";

import { useState } from "react";
import { useSound } from "@/components/sound-provider";
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
  const sound = useSound();

  function select(option: string) {
    if (option !== selected) sound?.play("toggle");
    setInternal(option);
    onChange?.(option);
  }

  return (
    <div
      role="radiogroup"
      className={cn("relative flex rounded-field border-2 border-espresso bg-recessed p-1", className)}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 rounded-[calc(var(--radius-field)-4px)] border-2 border-espresso bg-rose",
          // A jerky, stepped slide instead of a smooth ease — reads as "digital", not analog.
          "transition-transform duration-150 ease-[steps(3)]",
          "motion-reduce:duration-75 motion-reduce:ease-linear",
        )}
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
            "relative z-10 flex-1 rounded-[calc(var(--radius-field)-4px)] px-3 py-2 font-pixel text-[9px] uppercase tracking-wide",
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
