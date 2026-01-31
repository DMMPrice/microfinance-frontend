// src/Component/Utils/SearchableSelect.jsx
import React, {useMemo, useState} from "react";
import {Check, ChevronsUpDown} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

/**
 * Reusable searchable dropdown (ShadCN Command + Popover)
 *
 * Props:
 * - value: string
 * - onValueChange: (value: string) => void
 * - options: Array<{ value: string, label: string, keywords?: string }>
 * - placeholder?: string
 * - searchPlaceholder?: string
 * - disabled?: boolean
 * - className?: string
 */
export default function SearchableSelect({
    value,
    onValueChange,
    options = [],
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    disabled = false,
    className = "",
}) {
    const [open, setOpen] = useState(false);

    const selectedLabel = useMemo(() => {
        const opt = (options || []).find((o) => String(o.value) === String(value));
        return opt?.label ?? "";
    }, [options, value]);

    return (
        // ✅ Important for Dialog usage:
        // Radix Dialog is modal + scroll-locked. PopoverContent renders in a Portal
        // (outside the DialogContent DOM tree), so mouse-wheel scrolling can get
        // captured by the Dialog overlay.
        // Setting modal={false} ensures the dropdown can receive wheel events.
        <Popover modal={false} open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={`w-full justify-between ${className}`}
                >
            <span className="truncate">
                {selectedLabel ? selectedLabel : placeholder}
            </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50"/>
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                sideOffset={5}
                // Prevent wheel/touch scroll from bubbling to the Dialog overlay
                onWheelCapture={(e) => e.stopPropagation()}
            >
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />

                    <CommandList
                        // ✅ Dedicated scroll container for long option lists
                        className="max-h-64 overflow-y-auto overflow-x-hidden"
                    >
                        <CommandEmpty>No results found.</CommandEmpty>

                        <CommandGroup>
                            {(options || []).map((opt) => {
                                const isSelected = String(opt.value) === String(value);
                                const searchValue = `${opt.label} ${opt.value} ${opt.keywords || ""}`.trim();

                                return (
                                    <CommandItem
                                        key={String(opt.value)}
                                        value={searchValue}
                                        onSelect={() => {
                                            onValueChange?.(String(opt.value));
                                            setOpen(false);
                                        }}>
                                        <Check
                                            className={`mr-2 h-4 w-4 ${
                                                isSelected ? "opacity-100" : "opacity-0"
                                            }`}
                                        />
                                        <span className="truncate">{opt.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
