// src/Component/Loan/LoansAllSection.jsx
import React, {useEffect, useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {RefreshCw, Search as SearchIcon, Eye, Pencil, Trash2, Download} from "lucide-react";

import {getISTCurrentMonthRange} from "@/Helpers/dateTimeIST.js";

import {useLoanMaster} from "@/hooks/useLoans.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {getProfileData, getUserRole, getUserBranchId} from "@/hooks/useApi.js";
import {exportLoanMasterRollExcel} from "./loanMasterRollExcel";

import ExcelJS from "exceljs";
import {saveAs} from "file-saver";

const STATUS_OPTIONS = ["ALL", "DISBURSED", "ACTIVE", "CLOSED", "CANCELLED"];

function formatMoney(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function numOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toDateOnlyStr(v) {
    if (!v) return "";
    return String(v).slice(0, 10);
}

function parseToDate(v) {
    if (!v) return null;
    const s = String(v).slice(0, 10);
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function fmtHeaderDateRange(fromDraft, toDraft) {
    const f = parseToDate(fromDraft);
    const t = parseToDate(toDraft);
    if (!f || !t) return `From ${fromDraft || "-"} To ${toDraft || "-"}`;

    const day = (dt) => dt.toLocaleDateString("en-GB", {weekday: "short"});
    const dmy = (dt) => dt.toLocaleDateString("en-GB"); // dd/mm/yyyy
    return `From ${day(f)}, ${dmy(f)} To ${day(t)}, ${dmy(t)}`;
}

function getMyLoId() {
    try {
        const profile = getProfileData?.() || {};
        const loId =
            profile?.lo_id ??
            profile?.loan_officer_id ??
            profile?.loanOfficerId ??
            profile?.loan_officer?.id ??
            profile?.loan_officer?.lo_id;
        return loId != null && String(loId).trim() !== "" ? String(loId) : "";
    } catch {
        return "";
    }
}

/** ✅ Apply Excel "All Borders" to a rectangular range */
function applyAllBorders(ws, startRow, startCol, endRow, endCol) {
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            ws.getCell(r, c).border = {
                top: {style: "thin"},
                left: {style: "thin"},
                bottom: {style: "thin"},
                right: {style: "thin"},
            };
        }
    }
}

/** ✅ Pure exporter (NO API CALLS). Uses prepared maps from hooks. */
async function exportMasterRollExcel({
                                         rows,
                                         fromDate,
                                         toDate,
                                         branchName,
                                         regionName,
                                         meetingDayByGroupId,
                                     }) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Sheet1");

    ws.columns = [
        {width: 6},   // A S#
        {width: 30},  // B Borrower Name
        {width: 26},  // C Father/Husband (Loan A/C No per your instruction)
        {width: 20},  // D Group Name
        {width: 14},  // E Meeting Day
        {width: 18},  // F Disbursed Date
        {width: 18},  // G Principal Amount
        {width: 26},  // H Disbursed Amount (With Interest)
    ];

    const titleStyle = {
        font: {name: "Arial", size: 20, bold: true},
        alignment: {horizontal: "center", vertical: "middle"},
    };

    const subTitleStyle = {
        font: {name: "Arial", size: 15, bold: true},
        alignment: {horizontal: "center", vertical: "middle"},
    };

    const infoStyle = {
        font: {name: "Arial", size: 12, bold: true},
        alignment: {horizontal: "left", vertical: "middle"},
    };

    const headerGrey = {
        font: {name: "Arial", size: 10, bold: true},
        alignment: {horizontal: "center", vertical: "middle", wrapText: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFC0C0C0"}},
    };

    const dataStyle = {
        font: {name: "Microsoft Sans Serif", size: 10},
        alignment: {vertical: "middle"},
    };

    const totalStyle = {
        font: {name: "Tahoma", size: 10, bold: true},
        alignment: {vertical: "middle"},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFD3D3D3"}},
    };

    // --- Row 1: Title ---
    ws.mergeCells("A1:H1");
    ws.getCell("A1").value = "Loan Disbursement Master Roll";
    ws.getCell("A1").style = titleStyle;
    ws.getRow(1).height = 26;

    // --- Row 2: Subtitle ---
    ws.mergeCells("A2:H2");
    ws.getCell("A2").value = "All Loan";
    ws.getCell("A2").style = subTitleStyle;
    ws.getRow(2).height = 20;

    // --- Row 3: Branch + Date Range ---
    ws.mergeCells("A3:D3");
    ws.mergeCells("E3:H3");

    const bn = branchName || "-";
    const rn = regionName ? `  |  Region: ${regionName}` : "";
    ws.getCell("A3").value = `Branch Name: ${bn}${rn}`;
    ws.getCell("E3").value = fmtHeaderDateRange(fromDate, toDate);

    ws.getCell("A3").style = infoStyle;
    ws.getCell("E3").style = infoStyle;

    // --- Header Rows 4-5 ---
    ws.mergeCells("A4:A5");
    ws.mergeCells("B4:B5");
    ws.mergeCells("C4:C5");
    ws.mergeCells("D4:D5");
    ws.mergeCells("E4:E5");
    ws.mergeCells("F4:H4");

    ws.getCell("A4").value = "S#";
    ws.getCell("B4").value = "Borrower Name";

    // ✅ As you requested: this column will show Loan A/C No
    ws.getCell("C4").value = "Father / Husband Name";

    ws.getCell("D4").value = "Group Name";
    ws.getCell("E4").value = "Meeting Day";
    ws.getCell("F4").value = "Loan Disbursed";

    ws.getCell("F5").value = "Disbursed Date";
    ws.getCell("G5").value = "Principal Amount";
    ws.getCell("H5").value = "Disbursed Amount (With Interest)";

    ["A4", "B4", "C4", "D4", "E4", "F4", "F5", "G5", "H5"].forEach((addr) => {
        ws.getCell(addr).style = headerGrey;
    });

    ws.getRow(4).height = 20;
    ws.getRow(5).height = 18;

    // --- Group by disburse_date + daily totals ---
    const groups = new Map();
    for (const r of safeRows) {
        const ds = toDateOnlyStr(r.disburse_date);
        const key = ds || "NO_DATE";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
    }

    const sortedKeys = [...groups.keys()].sort((a, b) => {
        if (a === "NO_DATE") return 1;
        if (b === "NO_DATE") return -1;
        return a.localeCompare(b);
    });

    let excelRow = 6;
    let serial = 1;

    for (const key of sortedKeys) {
        const list = groups.get(key) || [];
        let dailyPrincipal = 0;
        let dailyWithInterest = 0;

        for (const r of list) {
            const borrower = r.member_name ?? "";
            const loanAc = r.loan_account_no ?? ""; // ✅ here
            const groupName = r.group_name ?? "";
            const meetingDay = meetingDayByGroupId?.[String(r.group_id)] || "";
            const disbDate = parseToDate(r.disburse_date);

            const principal = Number(r.principal_amount ?? 0);
            const withInterest = Number(r.total_disbursed_amount ?? 0);

            dailyPrincipal += Number.isFinite(principal) ? principal : 0;
            dailyWithInterest += Number.isFinite(withInterest) ? withInterest : 0;

            ws.getCell(`A${excelRow}`).value = serial++;
            ws.getCell(`B${excelRow}`).value = borrower;
            ws.getCell(`C${excelRow}`).value = loanAc;
            ws.getCell(`D${excelRow}`).value = groupName;
            ws.getCell(`E${excelRow}`).value = meetingDay;

            ws.getCell(`F${excelRow}`).value = disbDate || "";
            ws.getCell(`F${excelRow}`).numFmt = "ddd, dd/mm/yyyy";

            ws.getCell(`G${excelRow}`).value = Number.isFinite(principal) ? principal : 0;
            ws.getCell(`H${excelRow}`).value = Number.isFinite(withInterest) ? withInterest : 0;

            ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
                ws.getCell(`${col}${excelRow}`).style = dataStyle;
            });

            ws.getCell(`G${excelRow}`).numFmt = "#,##0.00";
            ws.getCell(`H${excelRow}`).numFmt = "#,##0.00";

            excelRow++;
        }

        // Daily Total row
        ws.getCell(`B${excelRow}`).value = "Daily Total";
        ws.getCell(`G${excelRow}`).value = dailyPrincipal;
        ws.getCell(`H${excelRow}`).value = dailyWithInterest;

        ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
            ws.getCell(`${col}${excelRow}`).style = totalStyle;
        });

        ws.getCell(`G${excelRow}`).numFmt = "#,##0.00";
        ws.getCell(`H${excelRow}`).numFmt = "#,##0.00";

        excelRow++;
    }

    // ✅ All borders everywhere
    const lastRow = excelRow - 1;
    applyAllBorders(ws, 1, 1, lastRow, 8);

    const filename = `Loan_Disbursement_Master_Roll_${fromDate || "from"}_to_${toDate || "to"}.xlsx`;
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
        filename
    );
}

export default function LoansAllSection({onOpenSummary, onEditLoan, onDeleteLoan}) {
    const role = useMemo(() => String(getUserRole?.() || "").toLowerCase(), []);
    const myBranchId = useMemo(() => numOrNull(getUserBranchId?.()), []);
    const myLoId = useMemo(() => getMyLoId(), []);

    const isLoanOfficer = role === "loan_officer";
    const isBranchManager = role === "branch_manager";

    const loQ = useLoanOfficers();

    const loOptions = useMemo(() => {
        const list = loQ.loanOfficers || [];
        const filtered = isBranchManager && myBranchId != null
            ? list.filter((x) => {
                const emp = x?.employee || {};
                const b = numOrNull(emp.branch_id ?? emp.branchId);
                return b == null ? true : b === myBranchId;
            })
            : list;

        return filtered.map((x) => ({
            lo_id: String(x.lo_id),
            label: x?.employee?.full_name ? `${x.employee.full_name}` : `LO-${x.lo_id}`,
        }));
    }, [loQ.loanOfficers, isBranchManager, myBranchId]);

    const monthRange = useMemo(() => getISTCurrentMonthRange(), []);
    const defaultFrom = monthRange.from_date;
    const defaultTo = monthRange.to_date;

    const [searchDraft, setSearchDraft] = useState("");
    const [statusDraft, setStatusDraft] = useState("ALL");
    const [fromDraft, setFromDraft] = useState(defaultFrom);
    const [toDraft, setToDraft] = useState(defaultTo);
    const [loDraft, setLoDraft] = useState(isLoanOfficer ? (myLoId || "ALL") : "ALL");

    const [limit, setLimit] = useState(5);
    const [offset, setOffset] = useState(0);

    const [applied, setApplied] = useState({
        search: "",
        status: "",
        disburse_from: defaultFrom,
        disburse_to: defaultTo,
        lo_id: isLoanOfficer ? (myLoId || "") : "",
    });

    useEffect(() => {
        if (!isLoanOfficer) return;
        const forced = myLoId || "";
        setLoDraft(forced || "ALL");
        setApplied((prev) => ({...prev, lo_id: forced}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoanOfficer, myLoId]);

    const filters = useMemo(
        () => ({
            search: applied.search || undefined,
            status: applied.status || undefined,
            disburse_from: applied.disburse_from || undefined,
            disburse_to: applied.disburse_to || undefined,
            lo_id: applied.lo_id || undefined,
            limit,
            offset,
        }),
        [applied, limit, offset]
    );

    const q = useLoanMaster(filters);

    const rows = useMemo(() => {
        const d = q.data;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.results)) return d.results;
        return [];
    }, [q.data]);

    const total = useMemo(() => {
        const d = q.data;
        if (!d) return null;
        if (typeof d.total === "number") return d.total;
        if (typeof d.count === "number") return d.count;
        return null;
    }, [q.data]);

    const exportBranchId = useMemo(() => {
        return rows?.[0]?.branch_id ?? myBranchId ?? null;
    }, [rows, myBranchId]);

    // ✅ Hooks (cached data) for export
    const branchesQ = useBranches();          // gives getBranchName + branchById
    const regionsQ = useRegions();            // gives getRegionName
    const groupsQ = useGroups(
        exportBranchId != null ? {branch_id: exportBranchId} : {}
    ); // groups list for this branch

    // ✅ Prepare maps from hooks (no extra API calls)
    const meetingDayByGroupId = useMemo(() => {
        const map = {};
        (groupsQ.groups || []).forEach((g) => {
            const id = g.group_id ?? g.id;
            if (id != null) map[String(id)] = g.meeting_day || "";
        });
        return map;
    }, [groupsQ.groups]);

    const branchName = useMemo(() => {
        if (!exportBranchId) return "";
        return branchesQ.getBranchName?.(exportBranchId) || "";
    }, [branchesQ, exportBranchId]);

    const regionName = useMemo(() => {
        if (!exportBranchId) return "";
        const b = branchesQ.branchById?.[String(exportBranchId)];
        const rid = b?.region_id ?? b?.regionId ?? null;
        return regionsQ.getRegionName?.(rid) || "";
    }, [branchesQ.branchById, exportBranchId, regionsQ]);

    const page = Math.floor(offset / limit) + 1;
    const canPrev = offset > 0;
    const canNext = total !== null ? offset + limit < total : rows.length === limit;

    const applyFilters = () => {
        setOffset(0);
        const nextLo = isLoanOfficer ? (myLoId || "") : (loDraft === "ALL" ? "" : loDraft);
        setApplied({
            search: searchDraft.trim(),
            status: statusDraft === "ALL" ? "" : statusDraft,
            disburse_from: fromDraft || "",
            disburse_to: toDraft || "",
            lo_id: nextLo,
        });
    };

    const clearFilters = () => {
        setSearchDraft("");
        setStatusDraft("ALL");
        setFromDraft(defaultFrom);
        setToDraft(defaultTo);

        const forcedLo = isLoanOfficer ? (myLoId || "") : "";
        setLoDraft(isLoanOfficer ? (myLoId || "ALL") : "ALL");

        setOffset(0);
        setApplied({
            search: "",
            status: "",
            disburse_from: defaultFrom,
            disburse_to: defaultTo,
            lo_id: forcedLo,
        });
    };

    const columns = useMemo(
        () => [
            {
                key: "loan_account_no",
                header: "Loan A/C No",
                cell: (r) => <div className="font-medium">{r.loan_account_no ?? "-"}</div>
            },
            {
                key: "status",
                header: "Status",
                cell: (r) => <span className="text-xs px-2 py-1 rounded-md border">{String(r.status ?? "-")}</span>
            },
            {key: "member_name", header: "Member", cell: (r) => r.member_name ?? "-"},
            {key: "group_name", header: "Group", cell: (r) => r.group_name ?? "-"},
            {key: "disburse_date", header: "Disbursed Date", cell: (r) => String(r.disburse_date ?? "-")},
            {key: "principal", header: "Principal Amount", cell: (r) => formatMoney(r.principal_amount ?? "-")},
            {
                key: "action",
                header: "Action",
                hideable: false,
                cell: (r) => {
                    const loanId = r.loan_id ?? r.id ?? null;
                    return (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => loanId && onOpenSummary?.(loanId)}
                                    disabled={!loanId}>
                                <Eye className="h-4 w-4 mr-2"/> Summary
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onEditLoan?.(r)}>
                                <Pencil className="h-4 w-4 mr-2"/> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => loanId && onDeleteLoan?.(loanId)}
                                    disabled={!loanId}>
                                <Trash2 className="h-4 w-4 mr-2"/> Delete
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [onOpenSummary, onEditLoan, onDeleteLoan]
    );

    const [exporting, setExporting] = useState(false);

    const exportDisabled =
        exporting ||
        q.isLoading ||
        !rows?.length ||
        !exportBranchId ||
        branchesQ.isLoading ||
        regionsQ.isLoading ||
        groupsQ.isLoading;

    const handleExport = async () => {
        try {
            setExporting(true);
            await exportLoanMasterRollExcel({
                rows,
                fromDate: applied.disburse_from || fromDraft,
                toDate: applied.disburse_to || toDraft,
                branchName,
                regionName,
                meetingDayByGroupId,
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
                        <div className="xl:col-span-4">
                            <div className="relative">
                                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    placeholder="Search (loan no / member / phone etc.)"
                                    className="pl-8 w-full"
                                />
                            </div>
                        </div>

                        <div className="xl:col-span-2">
                            <Select value={statusDraft} onValueChange={setStatusDraft}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Status"/></SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {!isLoanOfficer && (
                            <div className="xl:col-span-3">
                                <Select value={loDraft} onValueChange={setLoDraft}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={loQ.isLoading ? "Loading Loan Officers..." : "Loan Officer"}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Loan Officers</SelectItem>
                                        {loQ.isLoading ? (
                                            <div className="px-3 py-2"><Skeleton className="h-4 w-full"/></div>
                                        ) : loQ.isError ? (
                                            <div className="px-3 py-2 text-sm text-destructive">Failed to load Loan
                                                Officers</div>
                                        ) : (
                                            loOptions.map((o) => <SelectItem key={o.lo_id}
                                                                             value={String(o.lo_id)}>{o.label}</SelectItem>)
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className={isLoanOfficer ? "xl:col-span-6" : "xl:col-span-3"}>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)}
                                       className="w-full"/>
                                <Input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)}
                                       className="w-full"/>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button onClick={applyFilters}>Apply</Button>
                        <Button variant="outline" onClick={clearFilters}>Clear</Button>

                        <Button variant="outline" onClick={handleExport} disabled={exportDisabled}>
                            <Download className="h-4 w-4 mr-2"/>
                            {exporting ? "Exporting..." : "Export Excel"}
                        </Button>

                        <Button variant="outline" onClick={() => q.refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="w-full overflow-x-auto">
                <AdvancedTable
                    title="Loan Master Sheet"
                    description="Browse all loans with filters and open summary."
                    data={rows}
                    columns={columns}
                    isLoading={q.isLoading}
                    errorText={q.isError ? "No loans loaded (API error)." : ""}
                    emptyText="No loans found for the selected filters."
                    enableSearch={false}
                    enablePagination={false}
                    stickyHeader
                    rowKey={(r) => String(r.loan_id ?? r.id ?? r.loan_account_no ?? Math.random())}
                />
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{page}</span>
                    {total !== null ? <> · Total <span className="font-medium text-foreground">{total}</span></> : null}
                </div>

                <div className="flex items-center gap-2">
                    <Select value={String(limit)} onValueChange={(v) => {
                        setLimit(Number(v));
                        setOffset(0);
                    }}>
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Rows"/></SelectTrigger>
                        <SelectContent>
                            {[5, 10, 25, 50, 100].map((n) => <SelectItem key={n}
                                                                         value={String(n)}>{n} rows</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" disabled={!canPrev}
                            onClick={() => setOffset((x) => Math.max(0, x - limit))}>Prev</Button>
                    <Button variant="outline" disabled={!canNext}
                            onClick={() => setOffset((x) => x + limit)}>Next</Button>
                </div>
            </div>
        </div>
    );
}
