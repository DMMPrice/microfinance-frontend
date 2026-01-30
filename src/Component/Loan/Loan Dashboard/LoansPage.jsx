// src/pages/LoansPage.jsx
import {useState} from "react";
import {useSearchParams} from "react-router-dom";

import {Button} from "@/components/ui/button.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {Plus, RefreshCw} from "lucide-react";

import CreateLoanDialog from "@/Component/Loan/CreateLoanDialog.jsx";
import LoanSummaryDrawer from "@/Component/Loan/LoanSummaryDrawer.jsx";

import {
    useLoanStats,
    useUpdateLoan,
    useDeactivateLoan,
} from "@/hooks/useLoans.js";

import {getUserCtx} from "@/lib/http.js";

import {toast} from "@/components/ui/use-toast";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";
import EditLoanDialog from "@/Component/Loan/EditLoanDialog.jsx";

// ✅ sections
import LoansAllSection from "@/Component/Loan/LoansAllSection.jsx";
import LoanDueSection from "@/Component/Loan/LoanDueSection.jsx";
import LoansKpiRow from "./LoansKpiRow.jsx";

const TAB_DEFAULT = "due";
const TAB_KEYS = ["all", "due"]; // ✅ removed collections

function safeTab(value) {
    if (!value) return TAB_DEFAULT;
    return TAB_KEYS.includes(value) ? value : TAB_DEFAULT;
}

export default function LoansPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = safeTab(searchParams.get("tab"));

    const setTab = (next) => {
        setSearchParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                p.set("tab", next);
                return p;
            },
            {replace: true}
        );
    };

    // dialogs
    const [createOpen, setCreateOpen] = useState(false);

    const [summaryOpen, setSummaryOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);

    // ✅ Edit state
    const [editOpen, setEditOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);

    // ✅ Delete confirm state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoanId, setDeleteLoanId] = useState(null);

    // ✅ Role-wise scope for stats
    // - super_admin: no branch filter (all branches)
    // - others: restrict to their branch_id if present
    const ctx = getUserCtx();
    const branch_id = ctx?.role === "super_admin" ? undefined : (ctx?.branchId ?? undefined);

    const statsQ = useLoanStats({branch_id});

    // mutations
    const updateMut = useUpdateLoan();
    const cancelMut = useDeactivateLoan();

    const openSummary = (loanId) => {
        setSelectedLoanId(loanId);
        setSummaryOpen(true);
    };

    const openEdit = (row) => {
        setEditRow(row || null);
        setEditOpen(true);
    };

    const openDelete = (loanId) => {
        setDeleteLoanId(loanId ?? null);
        setDeleteOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Loans</h1>
                    <p className="text-sm text-muted-foreground">
                        Create loans, view due installments, collections, and summaries.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => statsQ.refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-2"/>
                        Create Loan
                    </Button>
                </div>
            </div>

            {/* KPI row */}
            <LoansKpiRow statsQ={statsQ}/>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="w-full md:w-auto overflow-x-auto">
                    <TabsTrigger value="all">All Loans</TabsTrigger>
                    <TabsTrigger value="due">Installments Due</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Content */}
            {tab === "all" && (
                <LoansAllSection
                    onCreate={() => setCreateOpen(true)}
                    onOpenSummary={openSummary}
                    onEditLoan={openEdit}
                    onDeleteLoan={openDelete}
                />
            )}

            {tab === "due" && (
                <LoanDueSection
                    onOpenSummary={openSummary}
                />
            )}

            {/* Dialogs */}
            <CreateLoanDialog open={createOpen} onOpenChange={setCreateOpen}/>

            <LoanSummaryDrawer
                open={summaryOpen}
                onOpenChange={setSummaryOpen}
                loanId={selectedLoanId}
            />

            <EditLoanDialog
                open={editOpen}
                onOpenChange={(v) => {
                    setEditOpen(v);
                    if (!v) setEditRow(null);
                }}
                row={editRow}
                isSaving={updateMut.isPending}
                onSave={async (loan_id, payload) => {
                    try {
                        await updateMut.mutateAsync({loan_id, payload});
                        toast({title: "Loan updated"});
                        setEditOpen(false);
                        setEditRow(null);
                    } catch (e) {
                        toast({
                            title: "Update failed",
                            description: e?.response?.data?.detail || e.message,
                            variant: "destructive",
                        });
                    }
                }}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={(v) => {
                    setDeleteOpen(v);
                    if (!v) setDeleteLoanId(null);
                }}
                title="Delete Loan?"
                description="This will cancel the loan. Allowed only if no payments exist."
                confirmText="Yes, Cancel Loan"
                variant="destructive"
                loading={cancelMut.isPending}
                onConfirm={async () => {
                    try {
                        if (!deleteLoanId) return;
                        await cancelMut.mutateAsync({loan_id: deleteLoanId});
                        toast({title: "Loan cancelled"});
                        setDeleteOpen(false);
                        setDeleteLoanId(null);
                    } catch (e) {
                        toast({
                            title: "Unable to cancel loan",
                            description: e?.response?.data?.detail || e.message,
                            variant: "destructive",
                        });
                    }
                }}
            />
        </div>
    );
}
