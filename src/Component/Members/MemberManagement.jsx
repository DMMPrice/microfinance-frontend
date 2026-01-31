// src/Component/Home/Main Components/Members/MemberManagement.jsx
import React, {useMemo, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Plus} from "lucide-react";
import {useToast} from "@/hooks/use-toast.ts";
import {useMembers} from "@/hooks/useMembers.js";
import {confirmDelete} from "@/Utils/confirmDelete.js";

import MemberFilters from "@/Component/Members/MemberFilters.jsx";
import MemberTable from "@/Component/Members/MemberTable.jsx";
import MemberDialog from "@/Component/Members/MemberDialog.jsx";
import {buildMaps, getMemberInfo, filterMemberRows} from "@/Component/Members/memberUtils.js";


export default function MemberManagement({groups = [], branches = [], officers = [], regions = []}) {
    const {toast} = useToast();


    // ✅ Role-based permission: loan_officer can view table but cannot add members
    const role = useMemo(() => {
        const tryParse = (k) => {
            try {
                const raw = localStorage.getItem(k);
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        };

        // Common keys used across the app
        const ud = tryParse("userData");
        const u = tryParse("user");

        return (ud?.role || u?.role || "").toString().toLowerCase();
    }, []);

    const isLoanOfficer = role === "loan_officer";


    const {
        members = [],
        isLoading,
        isError,
        error,
        createMember,
        isCreating,
        updateMember,
        isUpdating,
        deleteMember,
        isDeleting,
        refetch,
    } = useMembers();

    // modal state
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // filters
    const [q, setQ] = useState("");
    const [filterRegionId, setFilterRegionId] = useState("all");
    const [filterBranchId, setFilterBranchId] = useState("all");
    const [filterOfficerId, setFilterOfficerId] = useState("all");
    const [filterGroupId, setFilterGroupId] = useState("all");
    const [onlyActive, setOnlyActive] = useState(true);

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
    const [isActive, setIsActive] = useState(true);

    const maps = useMemo(
        () => buildMaps({groups, branches, regions, officers}),
        [groups, branches, regions, officers]
    );

    const rows = useMemo(() => {
        return (members || []).map((m) => ({m, info: getMemberInfo(m, maps)}));
    }, [members, maps]);

    const filteredRows = useMemo(() => {
        return filterMemberRows(rows, {
            q,
            onlyActive,
            filterRegionId,
            filterBranchId,
            filterOfficerId,
            filterGroupId,
        });
    }, [rows, q, onlyActive, filterRegionId, filterBranchId, filterOfficerId, filterGroupId]);

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
        setIsActive(true);
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
        setIsActive(Boolean(m.is_active ?? true));

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
                is_active: isActive,
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

    const handleDeactivate = async (m) => {
        const ok = await confirmDelete?.({
            title: "Deactivate member?",
            description: `This will deactivate "${m.full_name}".`,
            confirmText: "Deactivate",
        });

        const fallbackOk =
            ok === undefined ? window.confirm(`Deactivate "${m.full_name}"?`) : ok;

        if (!fallbackOk) return;

        try {
            await deleteMember(m.member_id);
            toast({title: "Member deactivated"});
            refetch();
        } catch (err) {
            toast({
                title: "Failed to delete member",
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
                    officers={officers}
                    groups={groups}
                />

                <MemberTable
                    isLoading={isLoading}
                    rows={filteredRows}
                    onEdit={openEdit}
                    onDeactivate={handleDeactivate}
                    isDeleting={isDeleting}
                />

                {/* Modal */}
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
                    isActive={isActive}
                    setIsActive={setIsActive}
                    onSubmit={handleSubmit}
                />
            </CardContent>
        </Card>
    );
}
