// src/Component/Loan/LoanViewLandingPage.jsx
import React, {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";

import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {useLoanMaster} from "@/hooks/useLoans";

function money(v) {
  const n = Number(v || 0);
  return n.toFixed(2);
}

export default function LoanViewLandingPage() {
  const navigate = useNavigate();

  // Quick open input (Loan Account No or numeric Loan ID)
  const [ref, setRef] = useState("");

  const {data, isLoading, isError} = useLoanMaster();

  // API sometimes returns plain array, sometimes {rows/items}
  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    return data?.rows ?? data?.items ?? [];
  }, [data]);

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
        cell: (r) => <div className="whitespace-nowrap">{r.member_name || "-"}</div>,
      },
      {
        key: "group_name",
        header: "Group",
        sortValue: (r) => String(r?.group_name || ""),
        cell: (r) => <div className="whitespace-nowrap">{r.group_name || "-"}</div>,
      },
      {
        key: "outstanding",
        header: "Outstanding",
        sortValue: (r) => Number(r?.outstanding || 0),
        cell: (r) => <div className="text-right font-semibold">₹ {money(r.outstanding)}</div>,
        tdClassName: "px-3 py-3 text-right align-middle whitespace-nowrap",
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
            <div className="text-sm text-muted-foreground">Open a loan by <span className="font-medium">Loan Account No</span> (preferred) or <span className="font-medium">Loan ID</span>.</div>
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
        data={rows}
        columns={columns}
        isLoading={isLoading}
        errorText={isError ? "Failed to load loans." : ""}
        emptyText="No loans found."
        enableSearch
        enablePagination
        initialPageSize={10}
        searchKeys={["loan_account_no", "member_name", "group_name", "status"]}
        onRowClick={(row) => {
          const key = row?.loan_account_no || row?.loan_id;
          if (!key) return;
          navigate(`/dashboard/loans/view/${encodeURIComponent(String(key))}`);
        }}
      />
    </div>
  );
}
