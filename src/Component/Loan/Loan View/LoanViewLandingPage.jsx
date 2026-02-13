// src/Component/Loan/LoanViewLandingPage.jsx
import React, {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {useLoanMaster} from "@/hooks/useLoans";
import {useLoanOfficers} from "@/hooks/useLoanOfficers"; // ✅ fetch all LO once (fast + sortable by name)

function money(v) {
    const n = Number(v || 0);
    return n.toFixed(2);
}

export default function LoanViewLandingPage() {
    const navigate = useNavigate();

    // Quick open input (Loan Account No or numeric Loan ID)
    const [ref, setRef] = useState("");

    const {data, isLoading, isError} = useLoanMaster();

    // ✅ Fetch all LOs once (so LO sort works by name)
    const {loanOfficers = []} = useLoanOfficers();

    // API sometimes returns plain array, sometimes {rows/items}
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        return data?.rows ?? data?.items ?? [];
    }, [data]);

    // ✅ lo_id -> full_name map
    const loNameById = useMemo(() => {
        const m = new Map();
        for (const lo of loanOfficers || []) {
            const id = lo?.lo_id;
            if (id == null) continue;

            const name =
                lo?.employee?.full_name ||
                lo?.full_name ||
                lo?.name ||
                lo?.employee?.user?.username ||
                "";

            m.set(Number(id), name || `LO-${Number(id)}`);
        }
        return m;
    }, [loanOfficers]);

    // ✅ enrich rows with loan_officer_name for UI + sorting + searching
    const rowsWithLoName = useMemo(() => {
        const base = Array.isArray(rows) ? rows : [];
        return base.map((r) => {
            const loId = r?.lo_id != null ? Number(r.lo_id) : null;
            const nm = loId != null ? (loNameById.get(loId) || `LO-${loId}`) : "-";
            return {...r, loan_officer_name: nm};
        });
    }, [rows, loNameById]);

    const columns = useMemo(
        () => [
            {
                key: "loan_account_no",
                header: "Loan A/C No",
                sortValue: (r) => String(r?.loan_account_no || ""),
                cell: (r) => <div className="text-center font-medium">{r.loan_account_no || "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "member_name",
                header: "Member Name",
                sortValue: (r) => String(r?.member_name || ""),
                cell: (r) => <div className="text-center whitespace-nowrap">{r.member_name || "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "group_name",
                header: "Group Name",
                sortValue: (r) => String(r?.group_name || ""),
                cell: (r) => <div className="text-center whitespace-nowrap">{r.group_name || "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "disburse_date",
                header: "Disburse Date",
                sortValue: (r) => String(r?.disburse_date || ""),
                cell: (r) => <div className="text-center">{r.disburse_date || "-"}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "loan_officer_name",
                header: "Loan Officer Name",
                sortValue: (r) => String(r?.loan_officer_name || ""),
                cell: (r) => (
                    <div className="text-center whitespace-nowrap font-medium">
                        {r.loan_officer_name || "-"}
                    </div>
                ),
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "outstanding",
                header: "Outstanding Amount",
                sortValue: (r) => Number(r?.outstanding || 0),
                cell: (r) => <div className="text-center font-semibold">₹ {money(r.outstanding)}</div>,
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
            {
                key: "status",
                header: "Status",
                sortValue: (r) => String(r?.status || ""),
                cell: (r) => (
                    <div className="text-center">
                        <Badge variant="secondary">{r.status || "-"}</Badge>
                    </div>
                ),
                tdClassName: "px-3 py-3 text-center align-middle whitespace-nowrap",
            },
        ],
        []
    );

    const openLoan = () => {
        const clean = String(ref || "").trim();
        if (!clean) return;
        navigate(`/dashboard/loans/view/${encodeURIComponent(clean)}`);
    };

    return (
        <div className="space-y-4">
            {/* Quick Open */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Loan View</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">
                            Open a loan by <span className="font-medium">Loan Account No</span> (preferred) or{" "}
                            <span className="font-medium">Loan ID</span>.
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                value={ref}
                                onChange={(e) => setRef(e.target.value)}
                                placeholder="Enter Loan Account No (e.g., LN-TIYA-01)"
                                className="w-full md:w-[320px]"
                            />
                            <Button onClick={openLoan}>Open</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loans List */}
            <AdvancedTable
                title="Loans"
                description="Click any row to open loan view"
                data={rowsWithLoName}
                columns={columns}
                isLoading={isLoading}
                errorText={isError ? "Failed to load loans." : ""}
                emptyText="No loans found."
                enableSearch
                enablePagination
                initialPageSize={10}
                searchKeys={["loan_account_no", "member_name", "group_name", "loan_officer_name", "status"]}

                // ✅ ONLY these 2 sort options
                enableSortDropdown
                sortDropdownTitle="Sort"
                sortDropdownOptions={[
                    {key: "loan_officer_name", label: "Loan Officer"},
                    {key: "group_name", label: "Group Name"},
                ]}

                onRowClick={(row) => {
                    const key = row?.loan_account_no || row?.loan_id;
                    if (!key) return;
                    navigate(`/dashboard/loans/view/${encodeURIComponent(String(key))}`);
                }}
            />
        </div>
    );
}
