import React, {useEffect, useMemo, useState} from "react";
import {useBranches} from "@/hooks/useBranches";
import {getUserRole, getUserBranchId} from "@/hooks/useApi";
import {useLoanTopSheetBranch} from "@/hooks/useReports";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import StatCard from "@/Utils/StatCard.jsx";
import {Wallet, ArrowUpRight, ArrowDownRight, AlertTriangle} from "lucide-react";
import LoanTopSheetFilters from "@/Component/Reports/LoanTopSheet/LoanTopSheetFilters.jsx";

import {
    isPrivilegedBranchPicker,
    getDefaultMonthRange,
    formatINR,
} from "@/Component/Reports/Branch Reports/branchReports.utils";

import {
    getDailyBranchColumns,
} from "@/Component/Reports/LoanTopSheet/loanTopSheet.columns.jsx";

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

    const branchSelectDisabled = isBranchManager || (!canPickAnyBranch && !!myBranchId);

    const query = useLoanTopSheetBranch({
        branchId,
        monthStart,
        monthEnd,
        persist,
        enabled: load,
    });

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

    const data = query.data || null;

    const openingBranch = data?.opening_branch || null;
    const closingCalc = data?.closing_branch_calc || null;
    const closingBranch = data?.closing_branch || null;

    const selectedBranchName = useMemo(() => {
        const hit = branchOptions.find((b) => String(b.id) === String(branchId));
        return hit?.name || "";
    }, [branchId, branchOptions]);

    const loadDisabled = !branchId || !monthStart || !monthEnd || query.isFetching;

    // tables
    const openingRows = data?.opening || [];
    const closingRows = data?.closing || [];
    const detailedBranchRows = data?.detailed_branch || [];
    const detailedGroupRows = data?.detailed || [];

    return (
        <Card className="border-muted/60">
            <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Loan Top Sheet</CardTitle>
                <CardDescription>Branch-wise snapshot for selected month range</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Filters */}
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
                    branches={branchOptions}
                    branchesLoading={branchesLoading}
                    branchSelectDisabled={branchSelectDisabled}
                />

                {/* ✅ KPI Section using StatCard */}
                {data && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <StatCard
                            title="Branch"
                            value={selectedBranchName || branchId}
                            variant="blue"
                        />

                        <StatCard
                            title="Opening Outstanding"
                            value={`₹${formatINR(openingBranch?.outstanding_amt || 0)}`}
                            subtitle={`${openingBranch?.outstanding_cnt || 0} loans`}
                            Icon={Wallet}
                            variant="purple"
                        />

                        <StatCard
                            title="Closing Balance (calc)"
                            value={`₹${formatINR(closingCalc?.closing_balance_amt || 0)}`}
                            subtitle={`${closingBranch?.outstanding_cnt || 0} loans`}
                            Icon={Wallet}
                            variant="green"
                        />

                        <StatCard
                            title="Month Disbursed"
                            value={`₹${formatINR(closingCalc?.month_disb_amt || 0)}`}
                            Icon={ArrowUpRight}
                            variant="blue"
                        />

                        <StatCard
                            title="Month Realised"
                            value={`₹${formatINR(closingCalc?.month_realised_amt || 0)}`}
                            Icon={ArrowDownRight}
                            variant="green"
                        />

                        <StatCard
                            title="Month Realisable"
                            value={`₹${formatINR(closingCalc?.month_realisable_amt || 0)}`}
                            variant="amber"
                        />

                        <StatCard
                            title="Closing Overdue (calc)"
                            value={`₹${formatINR(closingCalc?.closing_overdue_amt || 0)}`}
                            subtitle={`${closingBranch?.overdue_cnt || 0} overdue loans`}
                            Icon={AlertTriangle}
                            variant="red"
                        />
                    </div>
                )}

                {/* Tables */}
                <div className="space-y-4">

                    <AdvancedTable
                        title="Daily Summary (Branch)"
                        data={detailedBranchRows}
                        columns={getDailyBranchColumns()}
                        isLoading={query.isFetching}
                        enableSearch
                        initialPageSize={10}
                        rowKey={(r, idx) => `db-${r.txn_date}-${idx}`}
                    />
                </div>

                {/* Errors */}
                {query.error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                        {String(query.error?.response?.data?.detail || query.error?.message || "Failed to load")}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}