// src/Component/Branches/Expenses/OpeningBalanceTab.jsx
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Plus, RefreshCcw} from "lucide-react";

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

import {useOpeningBalances, useSetOpeningBalance} from "@/hooks/useOpeningBalance.js";
import OpeningBalanceDialog from "./OpeningBalanceDialog.jsx";

import {formatToIST} from "@/Helpers/dateTimeIST.js";

function yyyyMmDd(d) {
    if (!d) return "";
    return String(d).slice(0, 10);
}

function formatSeedDateIST(seedDate) {
    const s = yyyyMmDd(seedDate);
    return s ? formatToIST(`${s}T00:00:00`, false) : "-";
}

function formatINR(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-IN", {style: "currency", currency: "INR"});
}

async function fetchBranches() {
    const res = await apiClient.get("/branches/");
    return res.data;
}

export default function OpeningBalanceTab() {
    const [branches, setBranches] = useState([]);

    const roleUpper = String(getUserRole() || "").toUpperCase();
    const isSuperAdmin = ["SUPER_ADMIN", "SUPERADMIN", "SUPER ADMIN"].includes(roleUpper);

    const role = getUserRole();
    const myRegionId = getUserRegionId();
    const myBranchId = getUserBranchId();
    const isRegionalManager = isRegionalManagerRole(role);
    const isBranchManager = isBranchManagerRole(role);

    useEffect(() => {
        fetchBranches()
            .then((data) => setBranches(Array.isArray(data) ? data : (data?.data || [])))
            .catch(() => setBranches([]));
    }, []);

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

    const allowedBranchIds = useMemo(
        () => new Set(visibleBranches.map((b) => String(b.branch_id))),
        [visibleBranches]
    );

    const branchNameById = useMemo(() => {
        const m = new Map();
        (branches || []).forEach((b) => m.set(String(b.branch_id), b.branch_name));
        return m;
    }, [branches]);

    // GET params
    const listParams = useMemo(() => {
        const p = {entity_type: "BRANCH"};
        if (isBranchManager && myBranchId != null) p.entity_id = Number(myBranchId);
        return p;
    }, [isBranchManager, myBranchId]);

    const listQ = useOpeningBalances(listParams);
    const rawRows = Array.isArray(listQ.data) ? listQ.data : [];

    const rows = useMemo(() => {
        const mapped = rawRows
            .filter((x) => String(x.entity_type || "").toUpperCase() === "BRANCH")
            .map((x) => ({
                ...x,
                branch_id: x.entity_id,
                branch_name: x.branch_name || branchNameById.get(String(x.entity_id)) || String(x.entity_id),
            }));

        if (isRegionalManager || isBranchManager) {
            if (!allowedBranchIds.size) return [];
            return mapped.filter((x) => allowedBranchIds.has(String(x.branch_id)));
        }
        return mapped;
    }, [rawRows, branchNameById, allowedBranchIds, isRegionalManager, isBranchManager]);

    // ✅ Branch Manager: Add only if first time (no data)
    const branchManagerHasAnyData = useMemo(() => {
        if (!isBranchManager) return false;
        return rows.length > 0;
    }, [isBranchManager, rows.length]);

    // ✅ Can add rules:
    // - Super Admin -> can add (as before)
    // - Branch Manager -> only if no data exists
    const canShowAdd = isSuperAdmin || isBranchManager;
    const disableAdd = isBranchManager && branchManagerHasAnyData;

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        branch_id: "",
        seed_date: "",
        opening_balance: "",
        remarks: "",
    });

    const setM = useSetOpeningBalance();
    const saving = setM.isPending;

    const openCreate = useCallback(() => {
        setForm({branch_id: "", seed_date: "", opening_balance: "", remarks: ""});
        setOpen(true);
    }, []);

    const validate = useCallback(() => {
        if (!form.branch_id) return "Branch is required";
        if (!form.seed_date) return "Month is required";
        const dt = new Date(form.seed_date);
        if (Number.isNaN(dt.getTime())) return "Invalid date";
        if (String(form.seed_date).slice(-2) !== "01") return "Seed date must be 1st day of month";
        if (form.opening_balance === "" || !Number.isFinite(Number(form.opening_balance)))
            return "Opening balance is required";
        return null;
    }, [form]);

    const handleSave = useCallback(async () => {
        const err = validate();
        if (err) {
            return toast({title: "Validation error", description: err, variant: "destructive"});
        }

        // role safety: only allowed branches
        if ((isRegionalManager || isBranchManager) && allowedBranchIds.size) {
            if (!allowedBranchIds.has(String(form.branch_id))) {
                return toast({
                    title: "Not allowed",
                    description: "You are not allowed to set opening balance for this branch.",
                    variant: "destructive",
                });
            }
        }

        // ✅ extra safety: Branch Manager can only add first time
        if (isBranchManager && rows.length > 0) {
            return toast({
                title: "Not allowed",
                description: "Opening balance already exists. Add is allowed only for first time.",
                variant: "destructive",
            });
        }

        try {
            await setM.mutateAsync({
                entity_type: "BRANCH",
                entity_id: Number(form.branch_id),
                seed_date: form.seed_date,
                opening_balance: Number(form.opening_balance),
                remarks: form.remarks || "",
            });

            toast({title: "Saved", description: "Opening balance saved successfully"});
            setOpen(false);
            listQ.refetch();
        } catch (e) {
            toast({title: "Failed", description: e?.message || "Could not save", variant: "destructive"});
        }
    }, [validate, isRegionalManager, isBranchManager, allowedBranchIds, form, setM, listQ, rows.length]);

    // ✅ Columns (no actions / no edit)
    const columns = useMemo(() => {
        return [
            {
                header: "Month (IST)",
                key: "seed_date",
                cell: (r) => formatSeedDateIST(r?.seed_date),
            },
            {
                header: "Branch",
                key: "branch_name",
                cell: (r) => r?.branch_name || "-",
            },
            {
                header: "Opening Balance",
                key: "opening_balance",
                cell: (r) => (
                    <Badge variant="secondary" className="font-normal">
                        {formatINR(r?.opening_balance)}
                    </Badge>
                ),
            },
            {
                header: "Remarks",
                key: "remarks",
                cell: (r) => r?.remarks || "-",
            },
        ];
    }, []);

    const loading = listQ.isLoading;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                    <h2 className="text-lg font-semibold">Opening Balance</h2>
                    <p className="text-sm text-muted-foreground">Month-wise opening balance seed for Branch.</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => listQ.refetch()} disabled={loading}>
                        <RefreshCcw className="h-4 w-4 mr-2"/> Refresh
                    </Button>

                    {canShowAdd ? (
                        <Button onClick={openCreate} disabled={disableAdd}>
                            <Plus className="h-4 w-4 mr-2"/>
                            Add
                        </Button>
                    ) : null}
                </div>
            </div>

            {isBranchManager && disableAdd ? (
                <p className="text-sm text-muted-foreground">
                    Opening balance already exists for your branch. Add is allowed only for the first entry.
                </p>
            ) : null}

            <AdvancedTable data={rows} columns={columns} loading={loading} pageSize={10}/>

            <OpeningBalanceDialog
                open={open}
                onOpenChange={setOpen}
                mode="create"
                saving={saving}
                form={form}
                setForm={setForm}
                branches={branches}
                onSave={handleSave}
            />
        </div>
    );
}
