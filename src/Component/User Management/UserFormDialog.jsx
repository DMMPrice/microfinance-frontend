import React, {useMemo} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";

export default function UserFormDialog({
                                           mode = "create", // "create" | "edit"
                                           open,
                                           onOpenChange,

                                           form,
                                           setForm,

                                           onSubmit,
                                           submitText,
                                           submitting = false,

                                           ROLE_OPTIONS = [],
                                           regions = [],
                                           branches = [],
                                           regionsLoading = false,
                                           branchesLoading = false,
                                       }) {
    const roleId = Number(form.role_id || 0);

    const needRegion = roleId === 2 || roleId === 3 || roleId === 4;
    const needBranch = roleId === 3 || roleId === 4;

    const filteredBranches = useMemo(() => {
        const rid = Number(form.region_id || 0);
        if (!rid) return branches;
        return branches.filter((b) => Number(b.region_id) === rid);
    }, [branches, form.region_id]);

    function applyRoleRulesToForm(next, roleIdNum) {
        const rid = Number(next.region_id || 0);
        const bid = Number(next.branch_id || 0);

        if (roleIdNum === 1 || roleIdNum === 5) {
            return {...next, region_id: "0", branch_id: "0"};
        }
        if (roleIdNum === 2) {
            return {...next, branch_id: "0", region_id: rid ? String(rid) : "0"};
        }
        if (roleIdNum === 3 || roleIdNum === 4) {
            return {
                ...next,
                region_id: rid ? String(rid) : "0",
                branch_id: bid ? String(bid) : "0",
            };
        }
        return next;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "Create New User" : "Edit User"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Username</Label>
                            <Input
                                value={form.username}
                                onChange={(e) => setForm((p) => ({...p, username: e.target.value}))}
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((p) => ({...p, email: e.target.value}))}
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>{mode === "create" ? "Password" : "New Password (optional)"}</Label>
                            <Input
                                value={form.password}
                                onChange={(e) => setForm((p) => ({...p, password: e.target.value}))}
                                placeholder={mode === "edit" ? "Leave blank to keep unchanged" : ""}
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>Employee Full Name</Label>
                            <Input
                                value={form.full_name}
                                onChange={(e) => setForm((p) => ({...p, full_name: e.target.value}))}
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>Phone</Label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setForm((p) => ({...p, phone: e.target.value}))}
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>Employee Code</Label>
                            <Input
                                value={form.employee_code}
                                onChange={(e) => setForm((p) => ({...p, employee_code: e.target.value}))}
                                placeholder="EMP-..."
                                required={mode === "create"}
                            />
                        </div>

                        <div>
                            <Label>Role</Label>
                            <Select
                                value={form.role_id}
                                onValueChange={(v) => {
                                    const roleIdNum = Number(v);
                                    const next = applyRoleRulesToForm({...form, role_id: v}, roleIdNum);
                                    setForm(next);
                                }}
                                required={mode === "create"}
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

                        {needRegion && (
                            <div>
                                <Label>Region</Label>
                                <Select
                                    value={form.region_id}
                                    onValueChange={(v) => {
                                        const next = {...form, region_id: v, branch_id: "0"};
                                        setForm(applyRoleRulesToForm(next, Number(form.role_id || 0)));
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

                        {needBranch && (
                            <div>
                                <Label>Branch</Label>
                                <Select
                                    value={form.branch_id}
                                    onValueChange={(v) => setForm((p) => ({...p, branch_id: v}))}
                                    disabled={branchesLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select branch"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredBranches.map((b) => (
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
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({...p, notes: e.target.value}))}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                checked={!!form.is_active}
                                onCheckedChange={(v) => setForm((p) => ({...p, is_active: !!v}))}
                            />
                            <span className="text-sm">Active</span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? "Saving..." : submitText}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
