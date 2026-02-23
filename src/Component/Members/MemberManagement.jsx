// src/Component/Home Main Components/Members/MemberManagement.jsx
import React, {useEffect, useMemo, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.tsx";
import {Plus} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";
import {useMembers} from "@/hooks/useMembers.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

import {getProfileData, isBranchManagerRole, isSuperAdminRole} from "@/hooks/useApi";

import MemberFilters from "@/Component/Members/MemberFilters.jsx";
import MemberTable from "@/Component/Members/MemberTable.jsx";
import MemberDialog from "@/Component/Members/MemberDialog.jsx";
import {buildMaps, getMemberInfo, filterMemberRows} from "@/Component/Members/memberUtils.js";
import MembersKpiRow from "@/Component/Members/MembersKpiRow.jsx";

// ✅ NEW
import {ConfirmDialog} from "@/Utils/ConfirmDialog.jsx";
import {Textarea} from "@/components/ui/textarea";

export default function MemberManagement({groups = [], branches = [], officers = [], regions = []}) {
    const {toast} = useToast();

    const role = useMemo(() => {
        const p = getProfileData();
        return (p?.role || "").toString().trim().toLowerCase();
    }, []);

    const isLoanOfficer = role === "loan_officer";
    const isBranchManager = isBranchManagerRole(role);
    const hideBranchRegion = isLoanOfficer || isBranchManager;

    // ✅ SUPER ADMIN check
    const isSuperAdmin = isSuperAdminRole(role);

    // filters (declare BEFORE useMembers)
    const [q, setQ] = useState("");
    const [filterRegionId, setFilterRegionId] = useState("all");
    const [filterBranchId, setFilterBranchId] = useState("all");
    const [filterOfficerId, setFilterOfficerId] = useState("all");
    const [filterGroupId, setFilterGroupId] = useState("all");
    const [onlyActive, setOnlyActive] = useState(true);

    // ✅ If not SUPER ADMIN, force active-only
    useEffect(() => {
        if (!isSuperAdmin) setOnlyActive(true);
    }, [isSuperAdmin]);

    const {
        members = [],
        isLoading,
        isError,
        error,
        createMember,
        isCreating,
        updateMember,
        isUpdating,
        deactivateMember,
        isDeactivating,
        reactivateMember,
        isReactivating,
        refetch,
    } = useMembers({
        include_inactive: isSuperAdmin ? !onlyActive : false,
    });

    const busy = isDeactivating || isReactivating;

    // ✅ Ensure Loan Officer dropdown always has data
    const {loanOfficers = []} = useLoanOfficers();
    const officersList = (Array.isArray(officers) && officers.length > 0) ? officers : loanOfficers;

    // modal state
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // ✅ Deactivate confirm modal state
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [deactivateTarget, setDeactivateTarget] = useState(null);
    const [deactivateReason, setDeactivateReason] = useState("");

    // ✅ Reactivate confirm modal state (NEW)
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [reactivateTarget, setReactivateTarget] = useState(null);

    // form state
    const [groupId, setGroupId] = useState("");
    const [fullName, setFullName] = useState("");
    const [fatherOrHusbandName, setFatherOrHusbandName] = useState("");
    const [motherName, setMotherName] = useState("");
    const [dob, setDob] = useState("");
    const [phone, setPhone] = useState("");
    const [aadharNo, setAadharNo] = useState("");
    const [panNo, setPanNo] = useState("");
    const [voterId, setVoterId] = useState("");
    const [presentAddress, setPresentAddress] = useState("");
    const [permanentAddress, setPermanentAddress] = useState("");
    const [pincode, setPincode] = useState("");
    const [otherDetails, setOtherDetails] = useState("");
    const [photoB64, setPhotoB64] = useState("");
    const [photoPreview, setPhotoPreview] = useState("");

    const maps = useMemo(
        () => buildMaps({groups, branches, regions, officers: officersList}),
        [groups, branches, regions, officersList]
    );

    const rows = useMemo(() => {
        return (members || []).map((m) => ({m, info: getMemberInfo(m, maps)}));
    }, [members, maps]);

    const filteredRows = useMemo(() => {
        return filterMemberRows(rows, {
            q,
            onlyActive,
            filterRegionId: hideBranchRegion ? "all" : filterRegionId,
            filterBranchId: hideBranchRegion ? "all" : filterBranchId,
            filterOfficerId,
            filterGroupId,
        });
    }, [
        rows,
        q,
        onlyActive,
        filterRegionId,
        filterBranchId,
        filterOfficerId,
        filterGroupId,
        hideBranchRegion,
    ]);

    const resetForm = () => {
        setEditingId(null);
        setGroupId("");
        setFullName("");
        setFatherOrHusbandName("");
        setMotherName("");
        setDob("");
        setPhone("");
        setAadharNo("");
        setPanNo("");
        setVoterId("");
        setPresentAddress("");
        setPermanentAddress("");
        setPincode("");
        setOtherDetails("");
        setPhotoB64("");
        setPhotoPreview("");
    };

    const openCreate = () => {
        resetForm();
        setOpen(true);
    };

    const openEdit = (m) => {
        setEditingId(m.member_id);
        setGroupId(String(m.group_id ?? ""));
        setFullName(m.full_name ?? "");
        setFatherOrHusbandName(m.father_or_husband_name ?? "");
        setMotherName(m.mother_name ?? "");
        setDob(m.dob ?? "");
        setPhone(m.phone ?? "");
        setAadharNo(m.aadhar_no ?? "");
        setPanNo(m.pan_no ?? "");
        setVoterId(m.voter_id ?? "");
        setPresentAddress(m.present_address ?? "");
        setPermanentAddress(m.permanent_address ?? "");
        setPincode(m.pincode ?? "");
        setOtherDetails(m.other_details ?? "");

        const b64 = m.photo_b64 || "";
        setPhotoB64(b64);
        setPhotoPreview(b64 ? `data:image/*;base64,${b64}` : "");
        setOpen(true);
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast({title: "Please upload an image file", variant: "destructive"});
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
            setPhotoB64(b64);
            setPhotoPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const clearPhoto = () => {
        setPhotoB64("");
        setPhotoPreview("");
    };

    const saving = isCreating || isUpdating;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                full_name: fullName,
                father_or_husband_name: fatherOrHusbandName || null,
                mother_name: motherName || null,
                photo_b64: photoB64 || null,
                dob: dob || null,
                phone,
                aadhar_no: aadharNo || null,
                pan_no: panNo || null,
                voter_id: voterId || null,
                present_address: presentAddress,
                permanent_address: permanentAddress,
                pincode,
                group_id: Number(groupId),
                other_details: otherDetails || "",
                // ❌ DO NOT send is_active here
            };

            if (editingId) {
                await updateMember({member_id: editingId, payload});
                toast({title: "Member updated successfully"});
            } else {
                await createMember(payload);
                toast({title: "Member created successfully"});
            }

            setOpen(false);
            resetForm();
            refetch();
        } catch (err) {
            toast({
                title: editingId ? "Failed to update member" : "Failed to create member",
                description: err?.response?.data?.detail || err?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    // ✅ Open ConfirmDialog instead of prompt/confirmDelete
    const handleDeactivate = (m) => {
        if (!isSuperAdmin) {
            toast({title: "Only SUPER ADMIN can deactivate members", variant: "destructive"});
            return;
        }
        setDeactivateTarget(m);
        setDeactivateReason("");
        setDeactivateOpen(true);
    };

    const confirmDeactivate = async () => {
        const m = deactivateTarget;
        if (!m) return;

        try {
            await deactivateMember({
                member_id: m.member_id,
                reason: deactivateReason.trim(),
                files: [],
            });
            toast({title: "Member deactivated"});
            setDeactivateOpen(false);
            setDeactivateTarget(null);
            setDeactivateReason("");
            refetch();
        } catch (err) {
            toast({
                title: "Failed to deactivate member",
                description: err?.response?.data?.detail || err?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    // ✅ Reactivate uses ConfirmDialog (UPDATED)
    const handleReactivate = (m) => {
        if (!isSuperAdmin) {
            toast({title: "Only SUPER ADMIN can reactivate members", variant: "destructive"});
            return;
        }
        setReactivateTarget(m);
        setReactivateOpen(true);
    };

    const confirmReactivate = async () => {
        const m = reactivateTarget;
        if (!m) return;

        try {
            await reactivateMember(m.member_id);
            toast({title: "Member reactivated"});
            setReactivateOpen(false);
            setReactivateTarget(null);
            refetch();
        } catch (err) {
            toast({
                title: "Failed to reactivate member",
                description: err?.response?.data?.detail || err?.message || "Unknown error",
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>Member Management</CardTitle>
                    <CardDescription>Create and manage members (borrowers)</CardDescription>
                </div>

                <Button
                    size="lg"
                    disabled={groups.length === 0 || isLoanOfficer}
                    onClick={openCreate}
                    title={isLoanOfficer ? "Add permission restricted for Loan Officer" : "Add Member"}
                >
                    <Plus className="mr-2 h-5 w-5"/>
                    Add Member
                </Button>
            </CardHeader>

            <CardContent className="space-y-4">
                <MembersKpiRow role={role} rows={filteredRows} groups={groups}/>

                {isError && (
                    <div className="text-sm text-destructive">
                        {error?.response?.data?.detail || error?.message || "Failed to load Members"}
                    </div>
                )}

                <MemberFilters
                    q={q}
                    setQ={setQ}
                    onlyActive={onlyActive}
                    setOnlyActive={setOnlyActive}
                    filterRegionId={filterRegionId}
                    setFilterRegionId={setFilterRegionId}
                    filterBranchId={filterBranchId}
                    setFilterBranchId={setFilterBranchId}
                    filterOfficerId={filterOfficerId}
                    setFilterOfficerId={setFilterOfficerId}
                    filterGroupId={filterGroupId}
                    setFilterGroupId={setFilterGroupId}
                    regions={regions}
                    branches={branches}
                    officers={officersList}
                    groups={groups}
                    role={role}
                    isSuperAdmin={isSuperAdmin}
                />

                <MemberTable
                    isLoading={isLoading}
                    rows={filteredRows}
                    onEdit={openEdit}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                    busy={busy}
                    isDeleting={busy}
                    role={role}
                />

                <MemberDialog
                    open={open}
                    onOpenChange={(v) => {
                        setOpen(v);
                        if (!v) resetForm();
                    }}
                    editingId={editingId}
                    saving={saving}
                    groups={groups}
                    officerNameById={maps.officerNameById}
                    groupId={groupId}
                    setGroupId={setGroupId}
                    fullName={fullName}
                    setFullName={setFullName}
                    fatherOrHusbandName={fatherOrHusbandName}
                    setFatherOrHusbandName={setFatherOrHusbandName}
                    motherName={motherName}
                    setMotherName={setMotherName}
                    dob={dob}
                    setDob={setDob}
                    phone={phone}
                    setPhone={setPhone}
                    aadharNo={aadharNo}
                    setAadharNo={setAadharNo}
                    panNo={panNo}
                    setPanNo={setPanNo}
                    voterId={voterId}
                    setVoterId={setVoterId}
                    presentAddress={presentAddress}
                    setPresentAddress={setPresentAddress}
                    permanentAddress={permanentAddress}
                    setPermanentAddress={setPermanentAddress}
                    pincode={pincode}
                    setPincode={setPincode}
                    otherDetails={otherDetails}
                    setOtherDetails={setOtherDetails}
                    photoPreview={photoPreview}
                    handlePhotoUpload={handlePhotoUpload}
                    clearPhoto={clearPhoto}
                    onSubmit={handleSubmit}
                />

                {/* ✅ Confirm Dialog for Deactivation */}
                <ConfirmDialog
                    open={deactivateOpen}
                    onOpenChange={(v) => {
                        setDeactivateOpen(v);
                        if (!v) {
                            setDeactivateTarget(null);
                            setDeactivateReason("");
                        }
                    }}
                    title="Deactivate member?"
                    description={
                        deactivateTarget
                            ? `This will deactivate "${deactivateTarget.full_name}".`
                            : "This action cannot be undone."
                    }
                    confirmLabel="Deactivate"
                    cancelLabel="Cancel"
                    onConfirm={confirmDeactivate}
                    isLoading={busy}
                    confirmDisabled={!deactivateReason.trim()}
                >
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reason (required)</label>
                        <Textarea
                            value={deactivateReason}
                            onChange={(e) => setDeactivateReason(e.target.value)}
                            placeholder="Enter reason for deactivation..."
                            rows={3}
                        />
                    </div>
                </ConfirmDialog>

                {/* ✅ Confirm Dialog for Reactivation (NEW) */}
                <ConfirmDialog
                    open={reactivateOpen}
                    onOpenChange={(v) => {
                        setReactivateOpen(v);
                        if (!v) {
                            setReactivateTarget(null);
                        }
                    }}
                    title="Activate member?"
                    description={
                        reactivateTarget
                            ? `This will activate "${reactivateTarget.full_name}".`
                            : "This action cannot be undone."
                    }
                    confirmLabel="Activate"
                    cancelLabel="Cancel"
                    onConfirm={confirmReactivate}
                    isLoading={busy}
                >
                    <div className="text-sm text-muted-foreground">
                        The member will become active and visible in active lists again.
                    </div>
                </ConfirmDialog>
            </CardContent>
        </Card>
    );
}