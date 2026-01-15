import React, {useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Plus, Pencil, Trash2} from "lucide-react";
import {toast} from "@/components/ui/use-toast";

import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

import {
    useExpenseCategories,
    useExpenseSubCategories,
    useCreateExpenseCategory,
    useUpdateExpenseCategory,
    useDeleteExpenseCategory,
    useCreateExpenseSubCategory,
    useUpdateExpenseSubCategory,
    useDeleteExpenseSubCategory,
} from "@/hooks/useExpenseMaster";

import {useAuth} from "@/contexts/AuthContext.jsx";
import {ROLES, normalizeRole} from "@/config/roles";

export default function ExpenseMasterSection() {
    const {user, profile} = useAuth();
    const role = normalizeRole(profile?.role || user?.role);
    const isAdminOnly = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

    const categoriesQ = useExpenseCategories({});
    const subCatsQ = useExpenseSubCategories({});

    const categories = categoriesQ.data || [];
    const subcategories = subCatsQ.data || [];

    const loading = categoriesQ.isLoading || subCatsQ.isLoading;

    const refetchExpenseMaster = () => {
        categoriesQ.refetch?.();
        subCatsQ.refetch?.();
    };

    // Map category_id -> category_name
    const categoryMap = useMemo(() => {
        const m = {};
        categories.forEach((c) => (m[String(c.category_id)] = c.category_name));
        return m;
    }, [categories]);

    // ---------------- Category dialog ----------------
    const [catOpen, setCatOpen] = useState(false);
    const [catMode, setCatMode] = useState("create"); // create | edit
    const [catForm, setCatForm] = useState({
        category_id: null,
        category_name: "",
        is_active: true,
    });

    const createCat = useCreateExpenseCategory();
    const updateCat = useUpdateExpenseCategory();
    const deleteCat = useDeleteExpenseCategory();

    const openCreateCat = () => {
        setCatMode("create");
        setCatForm({category_id: null, category_name: "", is_active: true});
        setCatOpen(true);
    };

    const openEditCat = (row) => {
        setCatMode("edit");
        setCatForm({
            category_id: row.category_id,
            category_name: row.category_name || "",
            is_active: !!row.is_active,
        });
        setCatOpen(true);
    };

    const saveCategory = async () => {
        if (!isAdminOnly) return;

        const name = catForm.category_name.trim();
        if (!name) {
            toast({title: "Category name required", variant: "destructive"});
            return;
        }

        try {
            if (catMode === "create") {
                await createCat.mutateAsync({category_name: name, is_active: !!catForm.is_active});
                toast({title: "Category created"});
            } else {
                await updateCat.mutateAsync({
                    category_id: catForm.category_id,
                    payload: {category_name: name, is_active: !!catForm.is_active},
                });
                toast({title: "Category updated"});
            }
            setCatOpen(false);
            refetchExpenseMaster();
        } catch (e) {
            toast({
                title: "Save failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    // ---------------- Subcategory dialog ----------------
    const [subOpen, setSubOpen] = useState(false);
    const [subMode, setSubMode] = useState("create"); // create | edit
    const [subForm, setSubForm] = useState({
        subcategory_id: null,
        category_id: "",
        subcategory_name: "",
        is_active: true,
        payment_type: "DEBIT", // ✅ NEW
    });

    const createSub = useCreateExpenseSubCategory();
    const updateSub = useUpdateExpenseSubCategory();
    const deleteSub = useDeleteExpenseSubCategory();

    const openCreateSub = () => {
        setSubMode("create");
        setSubForm({
            subcategory_id: null,
            category_id: "",
            subcategory_name: "",
            is_active: true,
            payment_type: "DEBIT",
        });
        setSubOpen(true);
    };

    const openEditSub = (row) => {
        setSubMode("edit");
        setSubForm({
            subcategory_id: row.subcategory_id,
            category_id: String(row.category_id || ""),
            subcategory_name: row.subcategory_name || "",
            is_active: !!row.is_active,
            payment_type: row.payment_type || "DEBIT",
        });
        setSubOpen(true);
    };

    const saveSubcategory = async () => {
        if (!isAdminOnly) return;

        const cid = String(subForm.category_id || "");
        const name = subForm.subcategory_name.trim();

        if (!cid) {
            toast({title: "Category is required", variant: "destructive"});
            return;
        }
        if (!name) {
            toast({title: "Subcategory name required", variant: "destructive"});
            return;
        }

        try {
            if (subMode === "create") {
                await createSub.mutateAsync({
                    category_id: Number(cid),
                    subcategory_name: name,
                    is_active: !!subForm.is_active,
                    payment_type: subForm.payment_type, // ✅ NEW
                });
                toast({title: "Subcategory created"});
            } else {
                await updateSub.mutateAsync({
                    subcategory_id: subForm.subcategory_id,
                    payload: {
                        category_id: Number(cid),
                        subcategory_name: name,
                        is_active: !!subForm.is_active,
                        payment_type: subForm.payment_type, // ✅ NEW
                    },
                });
                toast({title: "Subcategory updated"});
            }

            setSubOpen(false);
            refetchExpenseMaster();
        } catch (e) {
            toast({
                title: "Save failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    // ---------------- Delete confirm ----------------
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteMeta, setDeleteMeta] = useState({type: null, row: null});

    const askDelete = (type, row) => {
        setDeleteMeta({type, row});
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        const {type, row} = deleteMeta;
        if (!type || !row) return;

        try {
            if (type === "category") {
                await deleteCat.mutateAsync(row.category_id);
                toast({title: "Category deleted"});
            } else {
                await deleteSub.mutateAsync(row.subcategory_id);
                toast({title: "Subcategory deleted"});
            }

            refetchExpenseMaster();
        } catch (e) {
            toast({
                title: "Delete failed",
                description: e?.response?.data?.detail || e?.message || "Unknown error",
                variant: "destructive",
            });
        } finally {
            setConfirmOpen(false);
            setDeleteMeta({type: null, row: null});
        }
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <CardTitle>Expense Master</CardTitle>
                    <CardDescription>
                        Manage Expense Categories & Subcategories used in Branch Expenses.
                    </CardDescription>
                </div>

                <div className="flex gap-2 md:pt-1">
                    <Button onClick={refetchExpenseMaster} variant="outline" disabled={loading}>
                        {loading ? "Loading..." : "Refresh"}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <Tabs defaultValue="categories">
                    <TabsList>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
                    </TabsList>

                    {/* ================= Categories ================= */}
                    <TabsContent value="categories" className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm text-muted-foreground">
                                Total: <span className="font-semibold">{categories.length}</span>
                            </div>

                            <Button onClick={openCreateCat} disabled={!isAdminOnly || createCat.isPending}>
                                <Plus className="h-4 w-4 mr-2"/>
                                Add Category
                            </Button>
                        </div>

                        {categoriesQ.isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-14 w-full"/>
                                <Skeleton className="h-14 w-full"/>
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No categories found.</div>
                        ) : (
                            <div className="space-y-2">
                                {categories.map((c) => (
                                    <div
                                        key={c.category_id}
                                        className="border rounded-2xl p-4 flex items-start justify-between gap-4"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-semibold">{c.category_name}</div>
                                            <div className="text-xs text-muted-foreground">ID: {c.category_id}</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant={c.is_active ? "secondary" : "outline"}>
                                                {c.is_active ? "Active" : "Inactive"}
                                            </Badge>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!isAdminOnly}
                                                onClick={() => openEditCat(c)}
                                            >
                                                <Pencil className="h-4 w-4 mr-2"/>
                                                Edit
                                            </Button>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={!isAdminOnly}
                                                onClick={() => askDelete("category", c)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2"/>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ================= Subcategories ================= */}
                    <TabsContent value="subcategories" className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm text-muted-foreground">
                                Total: <span className="font-semibold">{subcategories.length}</span>
                            </div>

                            <Button onClick={openCreateSub} disabled={!isAdminOnly || createSub.isPending}>
                                <Plus className="h-4 w-4 mr-2"/>
                                Add Subcategory
                            </Button>
                        </div>

                        {subCatsQ.isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-14 w-full"/>
                                <Skeleton className="h-14 w-full"/>
                            </div>
                        ) : subcategories.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No subcategories found.</div>
                        ) : (
                            <div className="space-y-2">
                                {subcategories.map((s) => (
                                    <div
                                        key={s.subcategory_id}
                                        className="border rounded-2xl p-4 flex items-start justify-between gap-4"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-semibold">{s.subcategory_name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Category: {categoryMap[String(s.category_id)] || s.category_id}
                                                {" "}• Sub ID: {s.subcategory_id}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* ✅ Payment Type Badge */}
                                            <Badge
                                                className={`uppercase font-semibold
        ${s.payment_type === "CREDIT"
                                                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                                                    : "bg-red-100 text-red-700 border border-red-300"
                                                }`}
                                                title="Payment Type"
                                            >
                                                {s.payment_type || "DEBIT"}
                                            </Badge>


                                            <Badge variant={s.is_active ? "secondary" : "outline"}>
                                                {s.is_active ? "Active" : "Inactive"}
                                            </Badge>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!isAdminOnly}
                                                onClick={() => openEditSub(s)}
                                            >
                                                <Pencil className="h-4 w-4 mr-2"/>
                                                Edit
                                            </Button>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={!isAdminOnly}
                                                onClick={() => askDelete("subcategory", s)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2"/>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* ================= Category Dialog ================= */}
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
                <DialogContent className="sm:max-w-[520px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{catMode === "create" ? "Add Category" : "Edit Category"}</DialogTitle>
                        <DialogDescription>Category name must be unique.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Category Name</div>
                            <Input
                                value={catForm.category_name}
                                onChange={(e) => setCatForm((p) => ({...p, category_name: e.target.value}))}
                                disabled={!isAdminOnly}
                            />
                        </div>

                        <div className="flex items-center justify-between border rounded-xl p-3">
                            <div>
                                <div className="font-medium">Active</div>
                                <div className="text-xs text-muted-foreground">Show in dropdowns</div>
                            </div>
                            <Switch
                                checked={!!catForm.is_active}
                                onCheckedChange={(v) => setCatForm((p) => ({...p, is_active: v}))}
                                disabled={!isAdminOnly}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
                        <Button
                            onClick={saveCategory}
                            disabled={!isAdminOnly || createCat.isPending || updateCat.isPending}
                        >
                            {createCat.isPending || updateCat.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================= Subcategory Dialog ================= */}
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
                <DialogContent className="sm:max-w-[560px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{subMode === "create" ? "Add Subcategory" : "Edit Subcategory"}</DialogTitle>
                        <DialogDescription>Subcategory must be unique inside the selected category.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Category</div>
                            <Select
                                value={String(subForm.category_id || "")}
                                onValueChange={(v) => setSubForm((p) => ({...p, category_id: v}))}
                                disabled={!isAdminOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.category_id} value={String(c.category_id)}>
                                            {c.category_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Subcategory Name</div>
                            <Input
                                value={subForm.subcategory_name}
                                onChange={(e) => setSubForm((p) => ({...p, subcategory_name: e.target.value}))}
                                disabled={!isAdminOnly}
                            />
                        </div>

                        {/* ===== Payment Type ===== */}
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Payment Type</div>
                            <Select
                                value={subForm.payment_type}
                                onValueChange={(v) => setSubForm((p) => ({...p, payment_type: v}))}
                                disabled={!isAdminOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DEBIT">Debit (Expense)</SelectItem>
                                    <SelectItem value="CREDIT">Credit (Income / Refund)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between border rounded-xl p-3">
                            <div>
                                <div className="font-medium">Active</div>
                                <div className="text-xs text-muted-foreground">Show in dropdowns</div>
                            </div>
                            <Switch
                                checked={!!subForm.is_active}
                                onCheckedChange={(v) => setSubForm((p) => ({...p, is_active: v}))}
                                disabled={!isAdminOnly}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSubOpen(false)}>Cancel</Button>
                        <Button
                            onClick={saveSubcategory}
                            disabled={!isAdminOnly || createSub.isPending || updateSub.isPending}
                        >
                            {createSub.isPending || updateSub.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================= Delete Confirm ================= */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete?"
                description="This action cannot be undone."
                confirmLabel={(deleteCat.isPending || deleteSub.isPending) ? "Deleting..." : "Delete"}
                cancelLabel="Cancel"
                isLoading={deleteCat.isPending || deleteSub.isPending}
                onConfirm={confirmDelete}
            />
        </Card>
    );
}
