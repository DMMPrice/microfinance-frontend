import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Skeleton} from "@/components/ui/skeleton";
import {Plus, Pencil, Trash2, RotateCw} from "lucide-react";
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useUsersManagement} from "@/hooks/useUsersManagement.js";

const ROLE_OPTIONS = [
    {id: 1, label: "admin"},
    {id: 2, label: "regional_manager"},
    {id: 3, label: "branch_manager"},
    {id: 4, label: "loan_officer"},
    {id: 5, label: "super_admin"},
];

const emptyForm = {
    username: "",
    email: "",
    password: "",
    is_active: true,

    full_name: "",
    phone: "",
    role_id: "",
    region_id: "0",
    branch_id: "0",
    employee_code: "",
    date_joined: "",
    notes: "",
};

function normalizePayload(form) {
    return {
        username: form.username?.trim(),
        email: form.email?.trim(),
        password: form.password ?? "",
        is_active: !!form.is_active,

        full_name: form.full_name?.trim(),
        phone: form.phone?.trim(),
        role_id: Number(form.role_id),

        region_id: form.region_id ? Number(form.region_id) : 0,
        branch_id: form.branch_id ? Number(form.branch_id) : 0,

        employee_code: form.employee_code?.trim(),
        date_joined: form.date_joined ? new Date(form.date_joined).toISOString() : null,
        notes: form.notes?.trim() || null,
    };
}

export default function UsersManagement() {
    const {regions = [], isLoading: regionsLoading} = useRegions();
    const {branches = [], isLoading: branchesLoading} = useBranches();

    const {
        users,
        isLoading,
        refetch,
        createUser,
        updateUser,
        deleteUser,
    } = useUsersManagement();

    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [createForm, setCreateForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);
    const [editingUserId, setEditingUserId] = useState(null);
    const [deletingUserId, setDeletingUserId] = useState(null);

    // ✅ REGION + BRANCH MAPS
    const regionMap = useMemo(() => {
        const m = new Map();
        regions.forEach((r) => m.set(Number(r.region_id), r.region_name));
        return m;
    }, [regions]);

    const branchMap = useMemo(() => {
        const m = new Map();
        branches.forEach((b) => m.set(Number(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    const getRegionName = (regionId) => {
        const id = Number(regionId);
        if (!id) return "-";
        return regionMap.get(id) || String(id);
    };

    const getBranchName = (branchId) => {
        const id = Number(branchId);
        if (!id) return "-";
        return branchMap.get(id) || String(id);
    };

    const roleObjCreate = useMemo(
        () => ROLE_OPTIONS.find((r) => String(r.id) === String(createForm.role_id)),
        [createForm.role_id]
    );

    const roleObjEdit = useMemo(
        () => ROLE_OPTIONS.find((r) => String(r.id) === String(editForm.role_id)),
        [editForm.role_id]
    );

    const filteredBranchesCreate = useMemo(() => {
        const rid = Number(createForm.region_id || 0);
        if (!rid) return branches;
        return branches.filter((b) => Number(b.region_id) === rid);
    }, [branches, createForm.region_id]);

    const filteredBranchesEdit = useMemo(() => {
        const rid = Number(editForm.region_id || 0);
        if (!rid) return branches;
        return branches.filter((b) => Number(b.region_id) === rid);
    }, [branches, editForm.region_id]);

    function applyRoleRulesToForm(next, roleId) {
        const rid = Number(next.region_id || 0);
        const bid = Number(next.branch_id || 0);

        if (roleId === 1 || roleId === 5) {
            return {...next, region_id: "0", branch_id: "0"};
        }
        if (roleId === 2) {
            return {...next, branch_id: "0", region_id: rid ? String(rid) : "0"};
        }
        if (roleId === 3 || roleId === 4) {
            return {
                ...next,
                region_id: rid ? String(rid) : "0",
                branch_id: bid ? String(bid) : "0",
            };
        }
        return next;
    }

    async function onCreateSubmit(e) {
        e.preventDefault();
        const payload = normalizePayload(createForm);
        await createUser.mutateAsync(payload);
        setOpenCreate(false);
        setCreateForm(emptyForm);
    }

    async function onEditSubmit(e) {
        e.preventDefault();
        if (!editingUserId) return;
        const payload = normalizePayload(editForm);
        await updateUser.mutateAsync({user_id: editingUserId, payload});
        setOpenEdit(false);
        setEditingUserId(null);
    }

    function openEditModal(row) {
        setEditingUserId(row.user_id);

        const next = {
            username: row.username ?? "",
            email: row.email ?? "",
            password: "",
            is_active: row.is_active ?? true,

            full_name: row.employee?.full_name ?? row.full_name ?? "",
            phone: row.employee?.phone ?? row.phone ?? "",
            role_id: String(row.employee?.role_id ?? row.role_id ?? ""),
            region_id: String(row.employee?.region_id ?? row.region_id ?? "0"),
            branch_id: String(row.employee?.branch_id ?? row.branch_id ?? "0"),
            employee_code: row.employee?.employee_code ?? row.employee_code ?? "",
            date_joined: "",
            notes: row.employee?.notes ?? row.notes ?? "",
        };

        setEditForm(next);
        setOpenEdit(true);
    }

    function askDelete(userId) {
        setDeletingUserId(userId);
        setConfirmOpen(true);
    }

    async function confirmDelete() {
        if (!deletingUserId) return;
        await deleteUser.mutateAsync({user_id: deletingUserId});
        setConfirmOpen(false);
        setDeletingUserId(null);
    }

    const createRoleId = Number(createForm.role_id || 0);
    const editRoleId = Number(editForm.role_id || 0);

    const needRegionCreate = createRoleId === 2 || createRoleId === 3 || createRoleId === 4;
    const needBranchCreate = createRoleId === 3 || createRoleId === 4;

    const needRegionEdit = editRoleId === 2 || editRoleId === 3 || editRoleId === 4;
    const needBranchEdit = editRoleId === 3 || editRoleId === 4;

    return (
        <>
            <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle>Users Management</CardTitle>
                        <CardDescription>
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                            <RotateCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                        <Button onClick={() => setOpenCreate(true)}>
                            <Plus className="h-4 w-4 mr-2"/>
                            New User
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="w-full overflow-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                            <tr className="text-left">
                                <th className="p-3">User ID</th>
                                <th className="p-3">Username</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Region</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Active</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {isLoading ? (
                                Array.from({length: 6}).map((_, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-3"><Skeleton className="h-4 w-16"/></td>
                                        <td className="p-3"><Skeleton className="h-4 w-40"/></td>
                                        <td className="p-3"><Skeleton className="h-4 w-28"/></td>
                                        <td className="p-3"><Skeleton className="h-4 w-28"/></td>
                                        <td className="p-3"><Skeleton className="h-4 w-28"/></td>
                                        <td className="p-3"><Skeleton className="h-4 w-12"/></td>
                                        <td className="p-3"><Skeleton className="h-8 w-28 ml-auto"/></td>
                                    </tr>
                                ))
                            ) : (users?.length ? (
                                users.map((u) => {
                                    const roleId = u.employee?.role_id ?? u.role_id;
                                    const roleLabel = ROLE_OPTIONS.find(r => r.id === Number(roleId))?.label ?? "-";

                                    const regionId = u.employee?.region_id ?? u.region_id;
                                    const branchId = u.employee?.branch_id ?? u.branch_id;

                                    return (
                                        <tr key={u.user_id} className="border-t">
                                            <td className="p-3">{u.user_id}</td>
                                            <td className="p-3">{u.username}</td>
                                            <td className="p-3 capitalize">{roleLabel.replaceAll("_", " ")}</td>

                                            {/* ✅ SHOW NAMES */}
                                            <td className="p-3">
                                                {regionsLoading ? "..." : getRegionName(regionId)}
                                            </td>
                                            <td className="p-3">
                                                {branchesLoading ? "..." : getBranchName(branchId)}
                                            </td>

                                            <td className="p-3">{(u.is_active ?? u.employee?.is_active) ? "Yes" : "No"}</td>
                                            <td className="p-3">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm"
                                                            onClick={() => openEditModal(u)}>
                                                        <Pencil className="h-4 w-4 mr-1"/>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => askDelete(u.user_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1"/>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* CREATE / EDIT / CONFIRM dialogs stay same */}
            {/* (no change needed below) */}

            {/* ---------------- CREATE MODAL ---------------- */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent className="max-w-3xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={onCreateSubmit} className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Username</Label>
                                <Input
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm((p) => ({...p, username: e.target.value}))}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((p) => ({...p, email: e.target.value}))}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Password</Label>
                                <Input
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((p) => ({...p, password: e.target.value}))}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Employee Full Name</Label>
                                <Input
                                    value={createForm.full_name}
                                    onChange={(e) => setCreateForm((p) => ({...p, full_name: e.target.value}))}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    value={createForm.phone}
                                    onChange={(e) => setCreateForm((p) => ({...p, phone: e.target.value}))}
                                    required
                                />
                            </div>

                            <div>
                                <Label>Employee Code</Label>
                                <Input
                                    value={createForm.employee_code}
                                    onChange={(e) => setCreateForm((p) => ({...p, employee_code: e.target.value}))}
                                    placeholder="EMP-..."
                                    required
                                />
                            </div>

                            <div>
                                <Label>Role</Label>
                                <Select
                                    value={createForm.role_id}
                                    onValueChange={(v) => {
                                        const roleId = Number(v);
                                        const next = applyRoleRulesToForm({...createForm, role_id: v}, roleId);
                                        setCreateForm(next);
                                    }}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((r) => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.label.replaceAll("_", " ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {needRegionCreate && (
                                <div>
                                    <Label>Region</Label>
                                    <Select
                                        value={createForm.region_id}
                                        onValueChange={(v) => {
                                            const next = {...createForm, region_id: v, branch_id: "0"};
                                            setCreateForm(applyRoleRulesToForm(next, Number(createForm.role_id || 0)));
                                        }}
                                        disabled={regionsLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select region"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regions.map((r) => (
                                                <SelectItem key={r.region_id} value={String(r.region_id)}>
                                                    {r.region_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {needBranchCreate && (
                                <div>
                                    <Label>Branch</Label>
                                    <Select
                                        value={createForm.branch_id}
                                        onValueChange={(v) => setCreateForm((p) => ({...p, branch_id: v}))}
                                        disabled={branchesLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select branch"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredBranchesCreate.map((b) => (
                                                <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                                    {b.branch_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <Label>Notes</Label>
                                <Input
                                    value={createForm.notes}
                                    onChange={(e) => setCreateForm((p) => ({...p, notes: e.target.value}))}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={!!createForm.is_active}
                                    onCheckedChange={(v) => setCreateForm((p) => ({...p, is_active: !!v}))}
                                />
                                <span className="text-sm">Active</span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createUser.isPending}>
                                {createUser.isPending ? "Creating..." : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ---------------- EDIT MODAL ---------------- */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="max-w-3xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={onEditSubmit} className="grid gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Username</Label>
                                <Input
                                    value={editForm.username}
                                    onChange={(e) => setEditForm((p) => ({...p, username: e.target.value}))}
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((p) => ({...p, email: e.target.value}))}
                                />
                            </div>

                            <div>
                                <Label>New Password (optional)</Label>
                                <Input
                                    value={editForm.password}
                                    onChange={(e) => setEditForm((p) => ({...p, password: e.target.value}))}
                                    placeholder="Leave blank to keep unchanged"
                                />
                            </div>

                            <div>
                                <Label>Full Name</Label>
                                <Input
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm((p) => ({...p, full_name: e.target.value}))}
                                />
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((p) => ({...p, phone: e.target.value}))}
                                />
                            </div>

                            <div>
                                <Label>Employee Code</Label>
                                <Input
                                    value={editForm.employee_code}
                                    onChange={(e) => setEditForm((p) => ({...p, employee_code: e.target.value}))}
                                />
                            </div>

                            <div>
                                <Label>Role</Label>
                                <Select
                                    value={editForm.role_id}
                                    onValueChange={(v) => {
                                        const roleId = Number(v);
                                        const next = applyRoleRulesToForm({...editForm, role_id: v}, roleId);
                                        setEditForm(next);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((r) => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.label.replaceAll("_", " ")}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {needRegionEdit && (
                                <div>
                                    <Label>Region</Label>
                                    <Select
                                        value={editForm.region_id}
                                        onValueChange={(v) => {
                                            const next = {...editForm, region_id: v, branch_id: "0"};
                                            setEditForm(applyRoleRulesToForm(next, Number(editForm.role_id || 0)));
                                        }}
                                        disabled={regionsLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select region"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regions.map((r) => (
                                                <SelectItem key={r.region_id} value={String(r.region_id)}>
                                                    {r.region_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {needBranchEdit && (
                                <div>
                                    <Label>Branch</Label>
                                    <Select
                                        value={editForm.branch_id}
                                        onValueChange={(v) => setEditForm((p) => ({...p, branch_id: v}))}
                                        disabled={branchesLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select branch"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredBranchesEdit.map((b) => (
                                                <SelectItem key={b.branch_id} value={String(b.branch_id)}>
                                                    {b.branch_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <Label>Notes</Label>
                                <Input
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm((p) => ({...p, notes: e.target.value}))}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={!!editForm.is_active}
                                    onCheckedChange={(v) => setEditForm((p) => ({...p, is_active: !!v}))}
                                />
                                <span className="text-sm">Active</span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpenEdit(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateUser.isPending}>
                                {updateUser.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete user?"
                description="This will permanently delete the user (and cascade employee / loan officer if configured)."
                confirmText="Delete"
                confirmVariant="destructive"
                onConfirm={confirmDelete}
            />
        </>
    );
}
