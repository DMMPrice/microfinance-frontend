// src/Utils/SimpleDatePicker.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {cn} from "@/lib/utils";
import {formatToIST} from "@/Helpers/dateTimeIST";

function parseISOToDate(iso) {
    if (!iso || typeof iso !== "string") return undefined;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return undefined;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function toYYYYMMDD(d) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function SimpleDatePicker({
                                             value,                 // "YYYY-MM-DD"
                                             onChange,              // returns "YYYY-MM-DD"
                                             placeholder = "Pick date",
                                             disabled = false,
                                         }) {
    const [open, setOpen] = useState(false);

    const selected = useMemo(() => parseISOToDate(value), [value]);

    const label = useMemo(() => {
        if (!value) return placeholder;
        // IST date display
        return formatToIST(value, false);
    }, [value, placeholder]);

    const handleSelect = (d) => {
        if (!d) return;
        onChange?.(toYYYYMMDD(d));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    {label}
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    initialFocus
                    className="rounded-lg border"
                />
            </PopoverContent>
        </Popover>
    );
}
