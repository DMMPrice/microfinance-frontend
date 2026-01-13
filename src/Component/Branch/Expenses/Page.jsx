// src/Component/Branches/Expenses/Page.jsx
import React, {useEffect, useMemo, useState} from "react";
import {Download, Plus, Pencil, Trash2, RefreshCcw} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {toast} from "@/components/ui/use-toast";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";
import AdvancedTable from "@/Utils/AdvancedTable.jsx"; // ✅ your util table
import {apiClient} from "@/hooks/useApi.js";

import {ExpenseFormDialog} from "./ExpenseFormDialog.jsx";

// hooks
import {useExpenseCategories, useExpenseSubCategories} from "@/hooks/useExpenseMaster.js";
import {
    useBranchExpenses,
    useCreateBranchExpense,
    useUpdateBranchExpense,
    useDeleteBranchExpense
} from "@/hooks/useBranchExpenses.js";

/* ---------------- helpers ---------------- */
function yyyyMmDd(dateStr) {
    if (!dateStr) return "";
    return String(dateStr).slice(0, 10);
}

function formatINR(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-IN", {style: "currency", currency: "INR"});
}

function downloadCSV(filename, rows) {
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function fetchBranches() {
    const res = await apiClient.get("/branches/");
    return res.data;
}

export default function Page() {
    // dropdowns
    const [branches, setBranches] = useState([]);

    // modal
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("create");
    const [form, setForm] = useState({
        expense_id: null,
        branch_id: "",
        category_id: "",
        subcategory_id: "",
        expense_date: "",
        amount: "",
        description: "",
        reference_no: "",
    });

    // delete confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteRow, setDeleteRow] = useState(null);

    useEffect(() => {
        fetchBranches()
            .then((data) => setBranches(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => setBranches([]));
    }, []);

    // master data
    const categoriesQ = useExpenseCategories({is_active: true});
    const subCatsQ = useExpenseSubCategories({is_active: true});
    const categories = Array.isArray(categoriesQ.data) ? categoriesQ.data : [];
    const subcategories = Array.isArray(subCatsQ.data) ? subCatsQ.data : [];

    // expenses list (no filters here; AdvancedTable handles search/sort/page)
    const expensesQ = useBranchExpenses({});
    const rows = Array.isArray(expensesQ.data) ? expensesQ.data : [];

    // mutations
    const createM = useCreateBranchExpense();
    const updateM = useUpdateBranchExpense();
    const deleteM = useDeleteBranchExpense();

    const saving = createM.isPending || updateM.isPending;
    const deleting = deleteM.isPending;
    const loading = expensesQ.isLoading || categoriesQ.isLoading || subCatsQ.isLoading;

    const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0), [rows]);

    const openCreate = () => {
        setMode("create");
        setForm({
            expense_id: null,
            branch_id: "",
            category_id: "",
            subcategory_id: "",
            expense_date: "",
            amount: "",
            description: "",
            reference_no: "",
        });
        setOpen(true);
    };

    const openEdit = (row) => {
        setMode("edit");
        setForm({
            expense_id: row.expense_id,
            branch_id: String(row.branch_id ?? ""),
            category_id: String(row.category_id ?? ""),
            subcategory_id: String(row.subcategory_id ?? ""),
            expense_date: yyyyMmDd(row.expense_date),
            amount: String(row.amount ?? ""),
            description: row.description ?? "",
            reference_no: row.reference_no ?? "",
        });
        setOpen(true);
    };

    const validate = () => {
        if (!form.branch_id) return "Branch is required";
        if (!form.category_id) return "Category is required";
        if (!form.subcategory_id) return "Subcategory is required";
        if (!form.expense_date) return "Expense date is required";
        if (!form.amount || Number(form.amount) <= 0) return "Amount must be > 0";
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) return toast({title: "Validation error", description: err, variant: "destructive"});

        const payload = {
            branch_id: Number(form.branch_id),
            category_id: Number(form.category_id),
            subcategory_id: Number(form.subcategory_id),
            expense_date: form.expense_date,
            amount: Number(form.amount),
            description: form.description?.trim() || null,
            reference_no: form.reference_no?.trim() || null,
        };

        try {
            if (mode === "create") {
                await createM.mutateAsync(payload);
                toast({title: "Expense added"});
            } else {
                await updateM.mutateAsync({expense_id: form.expense_id, payload});
                toast({title: "Expense updated"});
            }
            setOpen(false);
        } catch (e) {
            toast({
                title: "Save failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    const askDelete = (row) => {
        setDeleteRow(row);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteRow?.expense_id) return;
        try {
            await deleteM.mutateAsync(deleteRow.expense_id);
            toast({title: "Expense deleted"});
            setConfirmOpen(false);
            setDeleteRow(null);
        } catch (e) {
            toast({
                title: "Delete failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    const exportCSV = () => {
        const header = ["Expense ID", "Date", "Branch", "Category", "Subcategory", "Amount", "Reference No", "Description"];
        const data = rows.map((r) => [
            r.expense_id ?? "",
            yyyyMmDd(r.expense_date),
            r.branch_name ?? r.branch_id ?? "",
            r.category_name ?? r.category_id ?? "",
            r.subcategory_name ?? r.subcategory_id ?? "",
            r.amount ?? "",
            r.reference_no ?? "",
            r.description ?? "",
        ]);
        downloadCSV(`branch_expenses_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...data]);
    };

    // ✅ AdvancedTable columns
    const columns = useMemo(() => ([
        {key: "expense_id", header: "ID", sortValue: (r) => r.expense_id},
        {
            key: "expense_date",
            header: "Date",
            cell: (r) => yyyyMmDd(r.expense_date),
            sortValue: (r) => yyyyMmDd(r.expense_date)
        },
        {key: "branch_name", header: "Branch", cell: (r) => r.branch_name ?? r.branch_id},
        {key: "category_name", header: "Category", cell: (r) => r.category_name ?? r.category_id},
        {key: "subcategory_name", header: "Subcategory", cell: (r) => r.subcategory_name ?? r.subcategory_id ?? "-"},
        {
            key: "amount",
            header: "Amount",
            cell: (r) => <span className="font-semibold">{formatINR(r.amount)}</span>,
            sortValue: (r) => Number(r.amount || 0)
        },
        {key: "reference_no", header: "Ref No", cell: (r) => r.reference_no || "-"},
        {
            key: "description",
            header: "Description",
            cell: (r) => r.description || "-",
            tdClassName: "px-3 py-3 align-middle whitespace-normal max-w-[420px]"
        },
        {
            key: "_actions",
            header: "Actions",
            hideable: false,
            cell: (r) => (
                <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4"/>
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => askDelete(r)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </div>
            ),
            sortValue: () => "",
            tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-center",
        },
    ]), [rows]);

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Total Amount: {formatINR(totalAmount)}</Badge>
            </div>

            <AdvancedTable
                title="Branch Expenses"
                description="Track and manage branch-wise expenses (add, edit, delete, export)."
                data={rows}
                columns={columns}
                isLoading={loading}
                emptyText="No expenses found."
                searchPlaceholder="Search by branch/category/subcategory/desc/ref..."
                searchKeys={["expense_id", "branch_name", "category_name", "subcategory_name", "reference_no", "description"]}
                headerRight={
                    <>
                        <Button variant="outline" onClick={() => expensesQ.refetch()} disabled={loading}>
                            <RefreshCcw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                        <Button variant="outline" onClick={exportCSV} disabled={loading || rows.length === 0}>
                            <Download className="h-4 w-4 mr-2"/>
                            Export CSV
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Add Expense
                        </Button>
                    </>
                }
                rowKey={(r) => r.expense_id}
            />

            {/* ✅ separate modal */}
            <ExpenseFormDialog
                open={open}
                onOpenChange={setOpen}
                mode={mode}
                saving={saving}
                form={form}
                setForm={setForm}
                branches={branches}
                categories={categories}
                subcategories={subcategories}
                onSave={handleSave}
            />

            {/* ✅ delete confirm */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete expense?"
                description={deleteRow ? `This will permanently delete expense #${deleteRow.expense_id}.` : "This action cannot be undone."}
                confirmLabel={deleting ? "Deleting..." : "Delete"}
                cancelLabel="Cancel"
                isLoading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
