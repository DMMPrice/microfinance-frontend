// src/Component/Reports/BranchReports/BranchReportsPage.jsx
import React, {useMemo, useEffect, useState} from "react";
import {useBranchCashbookPassbook, useBranchLoanLedgerLogs, useRebuildBalances} from "@/hooks/useReports";
import {useBranches} from "@/hooks/useBranches";
import {getUserRole, getUserBranchId} from "@/hooks/useApi";

import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import BranchReportsFilters from "./BranchReportsFilters.jsx";
import BranchReportsSummary from "./BranchReportsSummary.jsx";
import BranchReportsTables from "./BranchReportsTables.jsx";

import {addDaysYmd, diffDays, getDefaultMonthRange, isPrivilegedBranchPicker} from "./branchReports.utils";

function resolveEntityId(branchId, branchOptions) {
    if (!branchId) return null;

    // If already numeric, use it
    const n = Number(branchId);
    if (Number.isFinite(n) && n > 0) return n;

    // Sometimes UI may accidentally pass branch name (e.g., "BARACKPORE").
    // In that case, match from branchOptions and return its id.
    const name = String(branchId).trim().toLowerCase();
    const hit = (branchOptions || []).find((b) => String(b.name || "").trim().toLowerCase() === name);
    if (hit) {
        const idNum = Number(hit.id);
        if (Number.isFinite(idNum) && idNum > 0) return idNum;
    }
    return null;
}

export default function BranchReportsPage() {
    const role = useMemo(() => getUserRole(), []);
    const myBranchId = useMemo(() => getUserBranchId(), []);
    const canPickAnyBranch = isPrivilegedBranchPicker(role);
    const isBranchManager = (role || "").toLowerCase() === "branch_manager";

    const {from: defaultFrom, to: defaultTo} = useMemo(() => getDefaultMonthRange(), []);

    const [branchId, setBranchId] = useState(isBranchManager && myBranchId ? String(myBranchId) : "");
    const [fromDate, setFromDate] = useState(defaultFrom);
    const [toDate, setToDate] = useState(defaultTo);
    const [load, setLoad] = useState(false);

    const [reportType, setReportType] = useState("LOAN_LEDGER"); // LOAN_LEDGER | PASSBOOK

    const [includeCharges, setIncludeCharges] = useState(true);
    const [includeOtherLogs, setIncludeOtherLogs] = useState(true);
    const [includeExpenses, setIncludeExpenses] = useState(true);
    const [includeEmptyDays, setIncludeEmptyDays] = useState(true);
    const [viewMode, setViewMode] = useState("DAILY");
    const [weekStart, setWeekStart] = useState("MON");
    const [search, setSearch] = useState("");

    const {branches, isLoading: branchesLoading} = useBranches(null);

    const branchOptions = useMemo(() => {
        const opts = (branches || []).map((b) => {
            const id = b.branch_id ?? b.id;
            const name = b.branch_name ?? b.name ?? `Branch ${id}`;
            return {id: String(id), name};
        });

        if (isBranchManager && myBranchId) return opts.filter((x) => x.id === String(myBranchId));
        if (canPickAnyBranch) return opts;
        if (myBranchId) return opts.filter((x) => x.id === String(myBranchId));
        return opts;
    }, [branches, isBranchManager, myBranchId, canPickAnyBranch]);

    useEffect(() => {
        if (isBranchManager && myBranchId) {
            setBranchId(String(myBranchId));
            return;
        }
        if (!branchId && branchOptions.length === 1) setBranchId(branchOptions[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchOptions.length, isBranchManager, myBranchId]);

    useEffect(() => {
        if (!fromDate || !toDate) return;

        if (diffDays(fromDate, toDate) < 0) {
            setToDate(fromDate);
            setLoad(false);
            return;
        }
        const days = diffDays(fromDate, toDate);
        if (days > 365) {
            setToDate(addDaysYmd(fromDate, 365));
            setLoad(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate]);

    const maxToDate = fromDate ? addDaysYmd(fromDate, 365) : "";
    const canLoad = !!branchId && !!fromDate && !!toDate;

    // Before loading the cashbook, rebuild balances so opening/closing and daily summary stays correct
    const rebuildBalancesM = useRebuildBalances();
    const rebuildPending = Boolean(rebuildBalancesM?.isPending ?? rebuildBalancesM?.isLoading);

    const handleLoad = async () => {
        if (!canLoad) return;

        // force refetch even if already loaded
        setLoad(false);

        try {
            // ✅ entity_type always BRANCH
            // ✅ entity_id should be the SELECTED branch id (not branch name)
            const entityId = resolveEntityId(branchId, branchOptions);

            // Guard: if branch/date missing, skip rebuild to avoid sending empty payload
            if (Number.isFinite(entityId) && fromDate && toDate) {
                await rebuildBalancesM.mutateAsync({
                    entity_type: "BRANCH",
                    entity_id: entityId,
                    from_date: fromDate,
                    to_date: toDate,
                    rebuild_ledger: true,
                    update_next_seed: true,
                });
            }
        } catch (e) {
            const msg =
                e?.response?.data?.detail ||
                e?.response?.data?.message ||
                e?.data?.detail ||
                e?.detail ||
                e?.message ||
                "Failed to rebuild balances";

            toast({
                title: "Rebuild failed",
                description: String(msg),
                variant: "destructive",
            });

            console.error("Failed to rebuild balances", e);
        } finally {
            setLoad(true);
        }
    };

    const passbookQ = useBranchCashbookPassbook({
        branchId,
        fromDate,
        toDate,
        enabled: load && reportType === "PASSBOOK",
    });

    const loanLedgerQ = useBranchLoanLedgerLogs({
        branchId,
        fromDate,
        toDate,
        includeCharges,
        includeOtherLogs,
        includeExpenses,
        includeEmptyDays,
        viewMode,
        weekStart,
        search: search?.trim() ? search.trim() : undefined,
        enabled: load && reportType === "LOAN_LEDGER",
    });

    // ✅ Selected branch name (for UI / export)
    const selectedBranchName = useMemo(() => {
        if (!branchId) return "";
        const hit = branchOptions.find((b) => String(b.id) === String(branchId));
        return hit?.name || "";
    }, [branchId, branchOptions]);

    const data = reportType === "PASSBOOK" ? passbookQ.data : loanLedgerQ.data;
    const reportLoading = reportType === "PASSBOOK" ? passbookQ.isLoading : loanLedgerQ.isLoading;
    const reportFetching = reportType === "PASSBOOK" ? passbookQ.isFetching : loanLedgerQ.isFetching;
    const error = reportType === "PASSBOOK" ? passbookQ.error : loanLedgerQ.error;
    const loading = reportLoading || reportFetching || rebuildPending;

    const summary = useMemo(() => {
        if (!data) return null;

        if (reportType === "PASSBOOK") {
            const tx = data?.transactions || [];
            const totalCredit = tx.reduce((s, r) => s + Number(r.credit || 0), 0);
            const totalDebit = tx.reduce((s, r) => s + Number(r.debit || 0), 0);
            const opening = Number(data?.opening_balance || 0);
            const closing = opening + (totalCredit - totalDebit);
            return {opening, totalCredit, totalDebit, closing};
        }

        const opening = Number(data?.opening_balance || 0);
        const closing = Number(data?.closing_balance || 0);
        const rows = Array.isArray(data?.summary_rows) ? data.summary_rows : [];
        const totalCredit = rows.reduce((s, r) => s + Number(r.credit_total || 0), 0);
        const totalDebit = rows.reduce((s, r) => s + Number(r.debit_total || 0), 0);
        return {opening, totalCredit, totalDebit, closing};
    }, [data, reportType]);

    const txCount =
        reportType === "PASSBOOK"
            ? (Array.isArray(data?.transactions) ? data.transactions.length : 0)
            : (Array.isArray(data?.rows) ? data.rows.length : 0);

    const setThisMonth = () => {
        const {from, to} = getDefaultMonthRange();
        setFromDate(from);
        setToDate(to);
        setLoad(false);
    };

    const branchSelectDisabled = isBranchManager || (!canPickAnyBranch && !!myBranchId);
    const branchLockedReason = isBranchManager
        ? "Branch is locked for Branch Manager role."
        : (!canPickAnyBranch && myBranchId ? "Branch is restricted by your role." : "");

    return (
        <Card className="border-muted/60">
            <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Branch Reports</CardTitle>
                <CardDescription>
                    {reportType === "PASSBOOK" ? "Branch passbook" : "Branch cashbook"}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <BranchReportsFilters
                    reportType={reportType}
                    setReportType={(v) => {
                        setReportType(v);
                        setLoad(false);
                    }}
                    branchId={branchId}
                    setBranchId={(v) => {
                        setBranchId(v);
                        setLoad(false);
                    }}
                    fromDate={fromDate}
                    setFromDate={(v) => {
                        setFromDate(v);
                        setLoad(false);
                    }}
                    toDate={toDate}
                    setToDate={(v) => {
                        setToDate(v);
                        setLoad(false);
                    }}
                    maxToDate={maxToDate}
                    branchesLoading={branchesLoading}
                    branchOptions={branchOptions}
                    branchSelectDisabled={branchSelectDisabled}
                    branchLockedReason={branchLockedReason}
                    onThisMonth={setThisMonth}
                    onLoad={handleLoad}
                    loading={loading}
                    loadDisabled={!canLoad}
                    showLoanFilters={reportType === "LOAN_LEDGER"}
                    search={search}
                    setSearch={(v) => {
                        setSearch(v);
                        setLoad(false);
                    }}
                    viewMode={viewMode}
                    setViewMode={(v) => {
                        setViewMode(v);
                        setLoad(false);
                    }}
                    weekStart={weekStart}
                    setWeekStart={(v) => {
                        setWeekStart(v);
                        setLoad(false);
                    }}
                    includeCharges={includeCharges}
                    setIncludeCharges={(fn) => {
                        setIncludeCharges(fn);
                        setLoad(false);
                    }}
                    includeExpenses={includeExpenses}
                    setIncludeExpenses={(fn) => {
                        setIncludeExpenses(fn);
                        setLoad(false);
                    }}
                    includeOtherLogs={includeOtherLogs}
                    setIncludeOtherLogs={(fn) => {
                        setIncludeOtherLogs(fn);
                        setLoad(false);
                    }}
                    includeEmptyDays={includeEmptyDays}
                    setIncludeEmptyDays={(fn) => {
                        setIncludeEmptyDays(fn);
                        setLoad(false);
                    }}
                />

                <BranchReportsSummary summary={summary} txCount={txCount}/>

                <BranchReportsTables
                    reportType={reportType}
                    branchId={branchId}
                    branchName={selectedBranchName} // ✅ branch name
                    fromDate={fromDate}
                    toDate={toDate}
                    viewMode={viewMode}
                    weekStart={weekStart}
                    includeCharges={includeCharges}
                    includeExpenses={includeExpenses}
                    includeOtherLogs={includeOtherLogs}
                    includeEmptyDays={includeEmptyDays}
                    data={data}
                    loading={loading}
                    error={error}
                    summary={summary}
                    txCount={txCount}
                />
            </CardContent>
        </Card>
    );
}
