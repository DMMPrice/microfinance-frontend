// src/Utils/MonthPicker.jsx
// ShadCN month picker built on top of Calendar (react-day-picker)
// UX: Simple popover + basic calendar (no month/year dropdowns).
// When user clicks any day, we store the FIRST day of that month as YYYY-MM-01.

import * as React from "react";
import {CalendarIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

import {formatToIST} from "@/Helpers/dateTimeIST.js";

function toMonthStartISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function parseISOToDate(iso) {
  if (!iso) return undefined;
  // Force midnight to avoid timezone drift
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function displayMonth(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  // Use IST formatter so UI is consistent with other pages
  // Show only month/year in a compact way
  const label = formatToIST(`${s}T00:00:00`, false);
  // label is DD/MM/YYYY, convert to MMM YYYY quickly:
  const dt = new Date(`${s}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return label;
  return dt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    year: "numeric",
  });
}

export default function MonthPicker({
  value,
  onChange,
  placeholder = "Pick month",
  disabled = false,
  className = "",
}) {
  const selected = React.useMemo(() => parseISOToDate(value), [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={`w-full justify-between font-normal ${className}`}
        >
          <span className={value ? "" : "text-muted-foreground"}>
            {value ? displayMonth(value) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          // basic calendar UI (no month/year dropdowns)
          onSelect={(d) => {
            const iso = toMonthStartISO(d);
            if (iso && typeof onChange === "function") onChange(iso);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
