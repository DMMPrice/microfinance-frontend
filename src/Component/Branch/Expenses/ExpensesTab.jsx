// src/Component/Branches/Expenses/ExpensesTab.jsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Download, Plus, Pencil, Trash2, RefreshCcw} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {toast} from "@/components/ui/use-toast";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

import {
    apiClient,
    getUserRole,
    getUserRegionId,
    getUserBranchId,
    isRegionalManagerRole,
    isBranchManagerRole,
} from "@/hooks/useApi.js";

import {ExpenseFormDialog} from "./ExpenseFormDialog.jsx";

import {useExpenseCategories, useExpenseSubCategories} from "@/hooks/useExpenseMaster.js";
import {
    useBranchExpenses,
    useCreateBranchExpense,
    useUpdateBranchExpense,
    useDeleteBranchExpense,
} from "@/hooks/useBranchExpenses.js";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

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
    const csv = rows
        .map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
        .join("\n");
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

export default function ExpensesTab() {
    // dropdowns
    const [branches, setBranches] = useState([]);

    /* =========================================================
       ✅ Role based access
       - Regional Manager -> only branches of own region
       - Branch Manager   -> only own branch
    ========================================================= */
    const role = getUserRole();
    const myRegionId = getUserRegionId();
    const myBranchId = getUserBranchId();

    const isRegionalManager = isRegionalManagerRole(role);
    const isBranchManager = isBranchManagerRole(role);

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

    // ✅ Filter branches (RM -> region, BM -> own branch)
    const visibleBranches = useMemo(() => {
        if (!Array.isArray(branches)) return [];

        if (isBranchManager) {
            if (myBranchId == null) return [];
            return branches.filter((b) => String(b.branch_id) === String(myBranchId));
        }

        if (isRegionalManager) {
            if (myRegionId == null) return [];
            return branches.filter((b) => String(b.region_id) === String(myRegionId));
        }

        return branches;
    }, [branches, isRegionalManager, isBranchManager, myRegionId, myBranchId]);

    const allowedBranchIds = useMemo(() => {
        return new Set(visibleBranches.map((b) => String(b.branch_id)));
    }, [visibleBranches]);

    // master data
    const categoriesQ = useExpenseCategories({is_active: true});
    const subCatsQ = useExpenseSubCategories({is_active: true});
    const categories = Array.isArray(categoriesQ.data) ? categoriesQ.data : [];
    const subcategories = Array.isArray(subCatsQ.data) ? subCatsQ.data : [];

    // expenses list
    const expensesQ = useBranchExpenses({});
    const rows = Array.isArray(expensesQ.data) ? expensesQ.data : [];

    // ✅ Filter expense rows for RM/BM
    const visibleRows = useMemo(() => {
        if (!Array.isArray(rows)) return [];
        if (isRegionalManager || isBranchManager) {
            if (!allowedBranchIds.size) return [];
            return rows.filter((r) => allowedBranchIds.has(String(r.branch_id)));
        }
        return rows;
    }, [rows, isRegionalManager, isBranchManager, allowedBranchIds]);

    // mutations
    const createM = useCreateBranchExpense();
    const updateM = useUpdateBranchExpense();
    const deleteM = useDeleteBranchExpense();

    const saving = createM.isPending || updateM.isPending;
    const deleting = deleteM.isPending;
    const loading = expensesQ.isLoading || categoriesQ.isLoading || subCatsQ.isLoading;

    const totalAmount = useMemo(
        () => visibleRows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
        [visibleRows]
    );

    const openCreate = useCallback(() => {
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
    }, []);

    const openEdit = useCallback((row) => {
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
    }, []);

    const validate = useCallback(() => {
        if (!form.branch_id) return "Branch is required";
        if (!form.category_id) return "Category is required";
        if (!form.subcategory_id) return "Subcategory is required";
        if (!form.expense_date) return "Expense date is required";
        if (!form.amount || Number(form.amount) <= 0) return "Amount must be > 0";
        return null;
    }, [form]);

    const handleSave = useCallback(async () => {
        const err = validate();
        if (err) {
            return toast({title: "Validation error", description: err, variant: "destructive"});
        }

        // ✅ extra safety: RM/BM can only save for allowed branches
        if ((isRegionalManager || isBranchManager) && allowedBranchIds.size) {
            if (!allowedBranchIds.has(String(form.branch_id))) {
                return toast({
                    title: "Not allowed",
                    description: "You are not allowed to add/edit expense for this branch.",
                    variant: "destructive",
                });
            }
        }

        const payload = {
            branch_id: Number(form.branch_id),
            category_id: Number(form.category_id),
            subcategory_id: Number(form.subcategory_id),
            expense_date: form.expense_date,
            amount: Number(form.amount),
            description: form.description || "",
            reference_no: form.reference_no || "",
        };

        try {
            if (mode === "create") {
                await createM.mutateAsync(payload);
                toast({title: "Saved", description: "Expense added successfully"});
            } else {
                await updateM.mutateAsync({expense_id: form.expense_id, payload});
                toast({title: "Saved", description: "Expense updated successfully"});
            }
            setOpen(false);
            expensesQ.refetch();
        } catch (e) {
            toast({title: "Failed", description: e?.message || "Could not save", variant: "destructive"});
        }
    }, [validate, isRegionalManager, isBranchManager, allowedBranchIds, form, mode, createM, updateM, expensesQ]);

    const requestDelete = useCallback((row) => {
        setDeleteRow(row);
        setConfirmOpen(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deleteRow) return;

        // ✅ safety: RM/BM can only delete allowed branches
        if ((isRegionalManager || isBranchManager) && allowedBranchIds.size) {
            if (!allowedBranchIds.has(String(deleteRow.branch_id))) {
                setConfirmOpen(false);
                return toast({
                    title: "Not allowed",
                    description: "You are not allowed to delete expense for this branch.",
                    variant: "destructive",
                });
            }
        }

        try {
            await deleteM.mutateAsync({expense_id: deleteRow.expense_id});
            toast({title: "Deleted", description: "Expense deleted successfully"});
            setConfirmOpen(false);
            setDeleteRow(null);
            expensesQ.refetch();
        } catch (e) {
            toast({title: "Failed", description: e?.message || "Could not delete", variant: "destructive"});
        }
    }, [deleteRow, isRegionalManager, isBranchManager, allowedBranchIds, deleteM, expensesQ]);

    const branchNameById = useMemo(() => {
        const m = new Map();
        (branches || []).forEach((b) => m.set(String(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    const categoryById = useMemo(() => {
        const m = new Map();
        (categories || []).forEach((c) => m.set(String(c.category_id), c.category_name));
        return m;
    }, [categories]);

    const subcatById = useMemo(() => {
        const m = new Map();
        (subcategories || []).forEach((s) => m.set(String(s.subcategory_id), s.subcategory_name));
        return m;
    }, [subcategories]);

    const columns = useMemo(() => {
        const getRow = (ctx) => ctx?.original ?? ctx?.row?.original ?? ctx;

        const wrapClass = "whitespace-normal break-words max-w-[180px]";

        return [
            {
                header: "Date",
                accessorKey: "expense_date",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    return (
                        <div className={wrapClass}>
                            {yyyyMmDd(r?.expense_date)}
                        </div>
                    );
                },
            },
            {
                header: "Branch",
                accessorKey: "branch_id",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    const bid = r?.branch_id;
                    return (
                        <div className={wrapClass}>
                            {branchNameById.get(String(bid)) || bid || "-"}
                        </div>
                    );
                },
            },
            {
                header: "Category",
                accessorKey: "category_id",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    const cid = r?.category_id;
                    return (
                        <div className={wrapClass}>
                            {categoryById.get(String(cid)) || cid || "-"}
                        </div>
                    );
                },
            },
            {
                header: "Subcategory",
                accessorKey: "subcategory_id",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    const sid = r?.subcategory_id;
                    return (
                        <div className={wrapClass}>
                            {subcatById.get(String(sid)) || sid || "-"}
                        </div>
                    );
                },
            },
            {
                header: "Amount",
                accessorKey: "amount",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    return (
                        <Badge
                            variant="secondary"
                            className="font-normal whitespace-normal break-words"
                        >
                            {formatINR(r?.amount)}
                        </Badge>
                    );
                },
            },
            {
                header: "Ref",
                accessorKey: "reference_no",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    return (
                        <div className={wrapClass}>
                            {r?.reference_no || "-"}
                        </div>
                    );
                },
            },
            {
                header: "Actions",
                id: "actions",
                cell: (ctx) => {
                    const r = getRow(ctx);
                    return (
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => openEdit(r)}>
                                <Pencil className="h-4 w-4"/>
                            </Button>
                            <Button
                                size="icon"
                                variant="destructive"
                                disabled={deleting}
                                onClick={() => requestDelete(r)}
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    );
                },
            },
        ];
    }, [branchNameById, categoryById, subcatById, openEdit, deleting, requestDelete]);

    const doDownload = useCallback(() => {
        const header = ["Date", "Branch", "Category", "Subcategory", "Amount", "Ref", "Description"];
        const body = visibleRows.map((r) => [
            yyyyMmDd(r.expense_date),
            branchNameById.get(String(r.branch_id)) || r.branch_id,
            categoryById.get(String(r.category_id)) || r.category_id,
            subcatById.get(String(r.subcategory_id)) || r.subcategory_id,
            r.amount,
            r.reference_no || "",
            r.description || "",
        ]);
        downloadCSV(`branch_expenses_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body]);
    }, [visibleRows, branchNameById, categoryById, subcatById]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-lg font-semibold">Branch Expenses</h2>
                    <p className="text-sm text-muted-foreground">
                        Total: <span className="font-medium">{formatINR(totalAmount)}</span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => expensesQ.refetch()} disabled={loading}>
                        <RefreshCcw className="h-4 w-4 mr-2"/> Refresh
                    </Button>
                    <Button variant="outline" onClick={doDownload} disabled={!visibleRows.length}>
                        <Download className="h-4 w-4 mr-2"/> CSV
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2"/> Add Expense
                    </Button>
                </div>
            </div>

            <AdvancedTable
                data={visibleRows}
                columns={columns}
                loading={loading}
                pageSize={10}
            />

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

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete expense?"
                description="This action cannot be undone."
                confirmText={deleting ? "Deleting..." : "Delete"}
                confirmVariant="destructive"
                onConfirm={confirmDelete}
                disabled={deleting}
            />
        </div>
    );
}
