// src/Utils/AdvancedTable.jsx
import React, {useMemo, useState} from "react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {Badge} from "@/components/ui/badge";

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpDown,
    Columns3,
    Download,
} from "lucide-react";

const TH = "px-3 py-3 text-center align-middle whitespace-nowrap";
const TD = "px-3 py-3 align-middle whitespace-nowrap";
const TD_LEFT = "px-3 py-3 align-middle whitespace-normal";

function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v);
}

function defaultTextSort(a, b) {
    return safeText(a).localeCompare(safeText(b), undefined, {numeric: true, sensitivity: "base"});
}

function downloadBlob(bytes, filename, mime) {
    const blob = new Blob([bytes], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function AdvancedTable({
                                          title,
                                          description,
                                          data = [],
                                          columns = [], // [{ key, header, cell, sortValue?, exportValue?, className?, tdClassName?, hideable? }]
                                          isLoading = false,
                                          errorText = "",
                                          emptyText = "No data found.",
                                          initialPageSize = 5,
                                          pageSizeOptions = [5, 10, 20, 50, 100],
                                          enableSearch = true,
                                          searchPlaceholder = "Search...",
                                          searchKeys = [], // array of column keys to search, fallback to all columns
                                          enablePagination = true,
                                          enableColumnToggle = true,
                                          stickyHeader = true,
                                          headerRight = null, // custom actions (refresh, export etc)
                                          rowKey = (row, idx) => idx,
                                          onRowClick = null,

                                          // ✅ Export options
                                          enableExport = false,
                                          exportFileName = "export.xlsx",
                                          exportSheetName = "Sheet1",
                                          exportScope = "all", // "all" | "page"
                                          exportVisibleOnly = true,
                                          exportTitleRow = null, // optional string title at top

                                          // ✅ NEW: extra rows before header in excel (Opening balance etc.)
                                          exportMetaRows = [], // array of arrays (AOA)
                                      }) {
    const [q, setQ] = useState("");
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [page, setPage] = useState(1);

    // Sorting
    const [sort, setSort] = useState({key: null, dir: "asc"});

    // Columns visibility
    const defaultVisible = useMemo(() => {
        const map = {};
        columns.forEach((c) => (map[c.key] = true));
        return map;
    }, [columns]);

    const [visible, setVisible] = useState(defaultVisible);

    // If columns change, keep visibility sane
    React.useEffect(() => {
        setVisible((prev) => {
            const next = {...defaultVisible, ...prev};
            // remove keys that no longer exist
            Object.keys(next).forEach((k) => {
                if (!columns.some((c) => c.key === k)) delete next[k];
            });
            return next;
        });
    }, [defaultVisible, columns]);

    const visibleColumnsForUI = useMemo(() => {
        return columns.filter((c) => visible[c.key] !== false);
    }, [columns, visible]);

    const visibleColumnsForExport = useMemo(() => {
        return columns
            .filter((c) => (exportVisibleOnly ? visible[c.key] !== false : true))
            .filter((c) => c?.key);
    }, [columns, visible, exportVisibleOnly]);

    // Search filter
    const filtered = useMemo(() => {
        const base = Array.isArray(data) ? data : [];
        const query = q.trim().toLowerCase();
        if (!enableSearch || !query) return base;

        const keysToSearch = (searchKeys?.length ? searchKeys : columns.map((c) => c.key)).filter(Boolean);

        return base.filter((row) => {
            return keysToSearch.some((k) => {
                const col = columns.find((c) => c.key === k);
                if (!col) return false;

                // search by sortValue (if provided) else raw field
                const raw =
                    typeof col.sortValue === "function"
                        ? col.sortValue(row)
                        : row?.[k];

                return safeText(raw).toLowerCase().includes(query);
            });
        });
    }, [data, q, enableSearch, searchKeys, columns]);

    // Sort
    const sorted = useMemo(() => {
        if (!sort.key) return filtered;
        const col = columns.find((c) => c.key === sort.key);
        if (!col) return filtered;

        const getter =
            col.sortValue ||
            ((row) => (col.key in (row || {}) ? row[col.key] : ""));

        const copy = [...filtered];
        copy.sort((ra, rb) => {
            const va = getter(ra);
            const vb = getter(rb);

            // number sort if both numeric
            const na = Number(va);
            const nb = Number(vb);
            const bothNum = Number.isFinite(na) && Number.isFinite(nb);

            const cmp = bothNum ? na - nb : defaultTextSort(va, vb);
            return sort.dir === "asc" ? cmp : -cmp;
        });

        return copy;
    }, [filtered, sort, columns]);

    // Pagination
    const total = sorted.length;
    const totalPages = enablePagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    React.useEffect(() => {
        // keep page within range when filters change
        if (page > totalPages) setPage(totalPages);
        if (page < 1) setPage(1);
    }, [page, totalPages]);

    const paged = useMemo(() => {
        if (!enablePagination) return sorted;
        const start = (page - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, enablePagination, page, pageSize]);

    const handleSort = (key) => {
        setSort((prev) => {
            if (prev.key !== key) return {key, dir: "asc"};
            return {key, dir: prev.dir === "asc" ? "desc" : "asc"};
        });
    };

    React.useEffect(() => {
        setPage(1);
    }, [q, pageSize]);

    const exportRows = exportScope === "page" ? paged : sorted;

    const onExportExcel = async () => {
        try {
            const XLSX = await import("xlsx");

            const headers = visibleColumnsForExport.map((c) => safeText(c.header ?? c.key));

            const rows = exportRows.map((row, idx) => {
                return visibleColumnsForExport.map((c) => {
                    // priority: exportValue -> sortValue -> raw field
                    const v =
                        typeof c.exportValue === "function"
                            ? c.exportValue(row, idx)
                            : typeof c.sortValue === "function"
                                ? c.sortValue(row, idx)
                                : row?.[c.key];

                    return v ?? "";
                });
            });

            const aoa = [];

            // title row
            if (exportTitleRow) aoa.push([exportTitleRow]);

            // meta rows (Opening, totals etc.)
            if (Array.isArray(exportMetaRows) && exportMetaRows.length > 0) {
                exportMetaRows.forEach((r) => aoa.push(Array.isArray(r) ? r : [safeText(r)]));
                aoa.push([]); // blank line after meta
            }

            // header + data
            aoa.push(headers);
            aoa.push(...rows);

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, exportSheetName);

            // ✅ some usability: freeze top rows (title/meta/header)
            const freezeRows =
                (exportTitleRow ? 1 : 0) +
                (Array.isArray(exportMetaRows) ? exportMetaRows.length : 0) +
                (Array.isArray(exportMetaRows) && exportMetaRows.length > 0 ? 1 : 0) + // blank line
                1; // header

            ws["!freeze"] = {xSplit: 0, ySplit: freezeRows};

            // ✅ set column widths a bit (auto-ish)
            ws["!cols"] = visibleColumnsForExport.map((c) => {
                const h = safeText(c.header ?? c.key);
                const w = Math.min(60, Math.max(12, h.length + 4));
                return {wch: w};
            });

            const out = XLSX.write(wb, {bookType: "xlsx", type: "array"});
            downloadBlob(out, exportFileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } catch (e) {
            console.error("Excel export failed:", e);
        }
    };

    return (
        <Card className="rounded-xl">
            {/* Header */}
            <div className="p-6 pb-3 space-y-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        {title ? <div className="text-lg font-semibold">{title}</div> : null}
                        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {headerRight}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        {enableSearch ? (
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full md:w-[320px]"
                            />
                        ) : null}

                        <Badge variant="secondary">
                            Rows: <span className="ml-1 font-semibold">{total}</span>
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* ✅ Export */}
                        {enableExport ? (
                            <Button variant="outline" size="sm" onClick={onExportExcel}
                                    disabled={isLoading || total === 0}>
                                <Download className="h-4 w-4 mr-2"/>
                                Export
                            </Button>
                        ) : null}

                        {enableColumnToggle ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Columns3 className="h-4 w-4 mr-2"/>
                                        Columns
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {columns
                                        .filter((c) => c.hideable !== false)
                                        .map((c) => (
                                            <DropdownMenuCheckboxItem
                                                key={c.key}
                                                checked={visible[c.key] !== false}
                                                onCheckedChange={(checked) => {
                                                    setVisible((prev) => ({...prev, [c.key]: !!checked}));
                                                }}
                                            >
                                                {c.header}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}

                        {enablePagination ? (
                            <select
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                {pageSizeOptions.map((n) => (
                                    <option key={n} value={n}>
                                        {n}/page
                                    </option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="px-6 pb-6">
                <div className="w-full overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className={`bg-muted/40 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
                        <tr>
                            {visibleColumnsForUI.map((c) => (
                                <th key={c.key} className={`${TH} ${c.className || ""}`}>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 hover:underline"
                                        onClick={() => handleSort(c.key)}
                                        title="Sort"
                                    >
                                        {c.header}
                                        <ArrowUpDown className="h-3.5 w-3.5 opacity-70"/>
                                    </button>
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {isLoading ? (
                            Array.from({length: 8}).map((_, i) => (
                                <tr key={i} className="border-t">
                                    {visibleColumnsForUI.map((c) => (
                                        <td key={c.key} className={TD}>
                                            <Skeleton className="h-4 w-24 mx-auto"/>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : errorText ? (
                            <tr className="border-t">
                                <td colSpan={visibleColumnsForUI.length} className="p-6 text-center text-destructive">
                                    {errorText}
                                </td>
                            </tr>
                        ) : paged.length === 0 ? (
                            <tr className="border-t">
                                <td colSpan={visibleColumnsForUI.length}
                                    className="p-6 text-center text-muted-foreground">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            paged.map((row, idx) => (
                                <tr
                                    key={rowKey(row, idx)}
                                    className={`border-t hover:bg-muted/20 ${onRowClick ? "cursor-pointer" : ""}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {visibleColumnsForUI.map((c) => (
                                        <td key={c.key} className={c.tdClassName || TD_LEFT}>
                                            {typeof c.cell === "function" ? c.cell(row, idx) : safeText(row?.[c.key])}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {enablePagination ? (
                    <div className="flex flex-col gap-2 pt-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium">
                {total === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
                            to{" "}
                            <span className="font-medium">
                {Math.min(page * pageSize, total)}
              </span>{" "}
                            of <span className="font-medium">{total}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page <= 1}>
                                <ChevronsLeft className="h-4 w-4"/>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}>
                                <ChevronLeft className="h-4 w-4"/>
                            </Button>

                            <Badge variant="outline">
                                Page <span className="ml-1 font-semibold">{page}</span> /{" "}
                                <span className="font-semibold">{totalPages}</span>
                            </Badge>

                            <Button variant="outline" size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}>
                                <ChevronRight className="h-4 w-4"/>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)}
                                    disabled={page >= totalPages}>
                                <ChevronsRight className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </Card>
    );
}

export {TH, TD, TD_LEFT};
