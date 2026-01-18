import React, {useMemo, useState, useEffect} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Plus, RotateCw} from "lucide-react";

import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";

import {useRegions} from "@/hooks/useRegions.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useUsersManagement} from "@/hooks/useUsersManagement.js";
import {useGroups} from "@/hooks/useGroups.js";

import UsersTable from "@/Component/User Management/UsersTable.jsx";
import UserFormDialog from "@/Component/User Management/UserFormDialog.jsx";

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

    // only used in edit for group assignment UI
    group_ids: [],
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

function extractLoanOfficerId(row) {
    return (
        row?.loan_officer?.lo_id ??
        row?.employee?.loan_officer?.lo_id ??
        row?.employee?.lo_id ??
        row?.lo_id ??
        null
    );
}

export default function Page() {
    const {regions = [], isLoading: regionsLoading} = useRegions();
    const {branches = [], isLoading: branchesLoading} = useBranches();

    const {
        users,
        isLoading,
        refetch,
        createUser,
        updateUser,
        deleteUser,
        assignGroupsToLO,
    } = useUsersManagement();

    // all groups list (for MultiSelect options in edit)
    const {data: allGroups = [], isLoading: groupsLoading} = useGroups();

    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [createForm, setCreateForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);

    const [editingUserId, setEditingUserId] = useState(null);
    const [editingLoanOfficerId, setEditingLoanOfficerId] = useState(null);

    const [deletingUserId, setDeletingUserId] = useState(null);

    // Region/Branch maps
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

        // 1) update user/employee
        const payload = normalizePayload(editForm);
        await updateUser.mutateAsync({user_id: editingUserId, payload});

        // 2) assign groups only if loan_officer
        const isLO = Number(editForm.role_id) === 4;
        if (isLO && editingLoanOfficerId) {
            await assignGroupsToLO.mutateAsync({
                lo_id: editingLoanOfficerId,
                group_ids: editForm.group_ids || [],
            });
        }

        setOpenEdit(false);
        setEditingUserId(null);
        setEditingLoanOfficerId(null);
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

    function openEditModal(row) {
        setEditingUserId(row.user_id);

        const loId = extractLoanOfficerId(row);
        setEditingLoanOfficerId(loId);

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

            group_ids: [],
        };

        setEditForm(next);
        setOpenEdit(true);
    }

    // Prefill group_ids in edit (using your /groups?lo_id=...)
    const editRoleId = Number(editForm.role_id || 0);
    const isEditLO = editRoleId === 4;

    const {data: assignedGroups = []} = useGroups(
        isEditLO && editingLoanOfficerId ? {lo_id: editingLoanOfficerId} : {}
    );

    useEffect(() => {
        if (!openEdit) return;
        if (!isEditLO) return;
        if (!editingLoanOfficerId) return;

        const ids = (assignedGroups || []).map((g) => Number(g.group_id));
        setEditForm((p) => ({...p, group_ids: ids}));
    }, [openEdit, isEditLO, editingLoanOfficerId, assignedGroups]);

    const headerRight = (
        <>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                <RotateCw className="h-4 w-4 mr-2"/>
                Refresh
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
                <Plus className="h-4 w-4 mr-2"/>
                New User
            </Button>
        </>
    );

    return (
        <div className="space-y-4">
            {/* Page Heading (no Card - simple) */}
            <div>
                <h1 className="text-2xl font-bold">Users</h1>
                <p className="text-muted-foreground">
                    Create and manage users, roles, regions and branches assignments
                </p>
            </div>

            {/* ✅ Single box only (AdvancedTable card) */}
            <UsersTable
                title="Users Management"
                description=""
                headerRight={headerRight}
                users={users}
                isLoading={isLoading}
                ROLE_OPTIONS={ROLE_OPTIONS}
                getRegionName={getRegionName}
                getBranchName={getBranchName}
                regionsLoading={regionsLoading}
                branchesLoading={branchesLoading}
                onEdit={openEditModal}
                onDelete={askDelete}
            />

            {/* CREATE: no groups */}
            <UserFormDialog
                mode="create"
                open={openCreate}
                onOpenChange={setOpenCreate}
                form={createForm}
                setForm={setCreateForm}
                onSubmit={onCreateSubmit}
                submitText={createUser.isPending ? "Creating..." : "Create User"}
                submitting={createUser.isPending}
                ROLE_OPTIONS={ROLE_OPTIONS}
                regions={regions}
                branches={branches}
                regionsLoading={regionsLoading}
                branchesLoading={branchesLoading}
                showGroups={false}
            />

            {/* EDIT: groups only if loan_officer */}
            <UserFormDialog
                mode="edit"
                open={openEdit}
                onOpenChange={(v) => {
                    setOpenEdit(v);
                    if (!v) {
                        setEditingUserId(null);
                        setEditingLoanOfficerId(null);
                        setEditForm(emptyForm);
                    }
                }}
                form={editForm}
                setForm={setEditForm}
                onSubmit={onEditSubmit}
                submitText={updateUser.isPending ? "Saving..." : "Save Changes"}
                submitting={updateUser.isPending || assignGroupsToLO.isPending}
                ROLE_OPTIONS={ROLE_OPTIONS}
                regions={regions}
                branches={branches}
                regionsLoading={regionsLoading}
                branchesLoading={branchesLoading}
                showGroups={isEditLO}
                groups={allGroups}
                groupsLoading={groupsLoading}
                groupValue={editForm.group_ids}
                onGroupsChange={(next) => setEditForm((p) => ({...p, group_ids: next}))}
                groupsDisabled={!editingLoanOfficerId}
                groupsHelperText={!editingLoanOfficerId ? "This user is not a loan officer (LO id not found)." : ""}
            />

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete user?"
                description="This will permanently delete the user (and cascade employee / loan officer if configured)."
                confirmText="Delete"
                confirmVariant="destructive"
                onConfirm={confirmDelete}
            />
        </div>
    );
}
