// src/Component/Reports/LoanTopSheet/LoanTopSheetPage.jsx
import React, {useEffect, useMemo, useState} from "react";
import {useBranches} from "@/hooks/useBranches";
import {getUserRole, getUserBranchId} from "@/hooks/useApi";
import {useLoanTopSheetBranch, useAuthUsers} from "@/hooks/useReports";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import LoanTopSheetFilters from "@/Component/Reports/LoanTopSheet/LoanTopSheetFilters.jsx";
import LoanTopSheetKpis from "@/Component/Reports/LoanTopSheet/LoanTopSheetKpis.jsx";
import LoanTopSheetTables from "@/Component/Reports/LoanTopSheet/LoanTopSheetTables.jsx";
import {exportLoanTopSheetExcel} from "@/Component/Reports/LoanTopSheet/loanTopSheet.export";

import {
    isPrivilegedBranchPicker,
    getDefaultMonthRange,
} from "@/Component/Reports/Branch Reports/branchReports.utils";

function buildBranchSummaryRows(data) {
    if (!data) return [];

    const openingBranch = data?.opening_branch || {};
    const closingCalc = data?.closing_branch_calc || {};
    const closingBranch = data?.closing_branch || {};

    return [
        {metric: "Opening Outstanding Count", value: Number(openingBranch?.outstanding_cnt || 0), type: "count"},
        {metric: "Opening Outstanding Amount", value: Number(openingBranch?.outstanding_amt || 0), type: "amount"},
        {metric: "Opening Overdue Count", value: Number(openingBranch?.overdue_cnt || 0), type: "count"},
        {metric: "Opening Overdue Amount", value: Number(openingBranch?.overdue_amt || 0), type: "amount"},

        {metric: "Month Disbursed Amount", value: Number(closingCalc?.month_disb_amt || 0), type: "amount"},
        {metric: "Month Realisable Amount", value: Number(closingCalc?.month_realisable_amt || 0), type: "amount"},
        {metric: "Month Realised Amount", value: Number(closingCalc?.month_realised_amt || 0), type: "amount"},

        {metric: "Closing Outstanding Count", value: Number(closingBranch?.outstanding_cnt || 0), type: "count"},
        {metric: "Closing Outstanding Amount", value: Number(closingBranch?.outstanding_amt || 0), type: "amount"},
        {metric: "Closing Overdue Count", value: Number(closingBranch?.overdue_cnt || 0), type: "count"},
        {metric: "Closing Overdue Amount", value: Number(closingBranch?.overdue_amt || 0), type: "amount"},

        {metric: "Closing Balance (Calc)", value: Number(closingCalc?.closing_balance_amt || 0), type: "amount"},
        {metric: "Closing Overdue (Calc)", value: Number(closingCalc?.closing_overdue_amt || 0), type: "amount"},
    ];
}

function getBranchOfficerName(users, branchId) {
    if (!Array.isArray(users) || !branchId) return "";

    const hit = users.find((u) => {
        const emp = u?.employee || {};
        return (
            u?.is_active === true &&
            emp?.is_active === true &&
            String(emp?.role_name || "").toLowerCase() === "branch_manager" &&
            String(emp?.branch_id ?? "") === String(branchId)
        );
    });

    return hit?.employee?.full_name || "";
}

export default function LoanTopSheetPage() {
    const role = useMemo(() => getUserRole(), []);
    const myBranchId = useMemo(() => getUserBranchId(), []);
    const isBranchManager = (role || "").toLowerCase() === "branch_manager";
    const canPickAnyBranch = isPrivilegedBranchPicker(role);

    const {from: defaultFrom, to: defaultTo} = useMemo(() => getDefaultMonthRange(), []);

    const [branchId, setBranchId] = useState(
        isBranchManager && myBranchId ? String(myBranchId) : ""
    );
    const [monthStart, setMonthStart] = useState(defaultFrom || "");
    const [monthEnd, setMonthEnd] = useState(defaultTo || "");
    const [persist, setPersist] = useState(true);
    const [load, setLoad] = useState(false);
    const [exporting, setExporting] = useState(false);

    const {branches, isLoading: branchesLoading} = useBranches(null);
    const {data: authUsers = []} = useAuthUsers(true);

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

        if (!branchId && branchOptions.length === 1) {
            setBranchId(branchOptions[0].id);
        }
    }, [branchOptions, branchId, isBranchManager, myBranchId]);

    const branchSelectDisabled = isBranchManager || (!canPickAnyBranch && !!myBranchId);

    const query = useLoanTopSheetBranch({
        branchId,
        monthStart,
        monthEnd,
        persist,
        enabled: load,
    });

    const data = query.data || null;

    const selectedBranchName = useMemo(() => {
        const hit = branchOptions.find((b) => String(b.id) === String(branchId));
        return hit?.name || "";
    }, [branchId, branchOptions]);

    const branchOfficerName = useMemo(() => {
        return getBranchOfficerName(authUsers, branchId);
    }, [authUsers, branchId]);

    const openingRows = data?.opening || [];
    const closingRows = data?.closing || [];
    const detailedBranchRows = data?.detailed_branch || [];
    const detailedGroupRows = data?.detailed || [];
    const summaryRows = useMemo(() => buildBranchSummaryRows(data), [data]);

    const loadDisabled = !branchId || !monthStart || !monthEnd || query.isFetching;
    const exportDisabled = !data || exporting || query.isFetching;

    const onThisMonth = () => {
        const {from, to} = getDefaultMonthRange();
        setMonthStart(from || "");
        setMonthEnd(to || "");
        setLoad(false);
    };

    const onLoad = async () => {
        if (!branchId || !monthStart || !monthEnd) return;

        if (!load) {
            setLoad(true);
            return;
        }

        await query.refetch();
    };

    const onDownloadExcel = async () => {
        if (!data) return;

        try {
            setExporting(true);
            await exportLoanTopSheetExcel({
                data,
                branchName: selectedBranchName || `branch-${branchId}`,
                branchOfficerName,
                monthStart,
                monthEnd,
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <Card className="border-muted/60">
            <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Loan Top Sheet</CardTitle>
                <CardDescription>
                    Branch-wise snapshot for selected month range
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <LoanTopSheetFilters
                    branchId={branchId}
                    setBranchId={(v) => {
                        setBranchId(v);
                        setLoad(false);
                    }}
                    monthStart={monthStart}
                    setMonthStart={(v) => {
                        setMonthStart(v);
                        setLoad(false);
                    }}
                    monthEnd={monthEnd}
                    setMonthEnd={(v) => {
                        setMonthEnd(v);
                        setLoad(false);
                    }}
                    persist={persist}
                    setPersist={(v) => {
                        setPersist(v);
                        setLoad(false);
                    }}
                    loadDisabled={loadDisabled}
                    loading={query.isFetching}
                    onThisMonth={onThisMonth}
                    onLoad={onLoad}
                    onDownloadExcel={onDownloadExcel}
                    exportDisabled={exportDisabled}
                    exporting={exporting}
                    branches={branchOptions}
                    branchesLoading={branchesLoading}
                    branchSelectDisabled={branchSelectDisabled}
                />

                {data && (
                    <LoanTopSheetKpis
                        branchLabel={selectedBranchName || branchId}
                        data={data}
                    />
                )}

                <LoanTopSheetTables
                    openingRows={openingRows}
                    detailedBranchRows={detailedBranchRows}
                    detailedGroupRows={detailedGroupRows}
                    closingRows={closingRows}
                    summaryRows={summaryRows}
                    loading={query.isFetching}
                />

                {query.error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                        {String(
                            query.error?.response?.data?.detail ||
                            query.error?.message ||
                            "Failed to load"
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}