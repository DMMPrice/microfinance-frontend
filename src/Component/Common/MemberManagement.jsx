// src/Component/dashboard/Common/MemberManagement.jsx
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
    DialogTrigger,
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
import {Textarea} from "@/components/ui/textarea";
import {Switch} from "@/components/ui/switch";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Plus, Trash2, Loader2, Pencil, Image as ImageIcon, X} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

import {useMembers} from "@/hooks/useMembers.js";

export default function MemberManagement({
                                             groups = [],
                                             branches = [],
                                             officers = [],
                                             regions = [],
                                         }) {
    const {toast} = useToast();

    const {
        members,
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

    const [open, setOpen] = useState(false);

    // edit mode
    const [editingId, setEditingId] = useState(null);

    // form state
    const [groupId, setGroupId] = useState("");
    const [fullName, setFullName] = useState("");
    const [fatherOrHusbandName, setFatherOrHusbandName] = useState("");
    const [motherName, setMotherName] = useState("");
    const [dob, setDob] = useState(""); // YYYY-MM-DD
    const [phone, setPhone] = useState("");
    const [aadharNo, setAadharNo] = useState("");
    const [panNo, setPanNo] = useState("");
    const [voterId, setVoterId] = useState("");
    const [presentAddress, setPresentAddress] = useState("");
    const [permanentAddress, setPermanentAddress] = useState("");
    const [pincode, setPincode] = useState("");
    const [otherDetails, setOtherDetails] = useState("");
    const [photoB64, setPhotoB64] = useState("");
    const [photoPreview, setPhotoPreview] = useState(""); // dataURL for preview
    const [isActive, setIsActive] = useState(true);

    const groupById = useMemo(() => {
        const map = new Map();
        groups.forEach((g) => map.set(String(g.id ?? g.group_id), g));
        return map;
    }, [groups]);

    const officerNameById = useMemo(() => {
        const map = new Map();
        officers.forEach((o) => map.set(String(o.id ?? o.user_id ?? o.lo_id), o.name));
        return map;
    }, [officers]);

    const getMemberInfo = (member) => {
        const group = groupById.get(String(member.group_id));

        const officerName =
            officerNameById.get(String(group?.loanOfficerId ?? group?.lo_id)) || "Unknown";

        const branch =
            branches.find(
                (b) =>
                    String(b.id ?? b.branch_id) ===
                    String(group?.branchId ?? group?.branch_id)
            ) || null;

        const region =
            regions.find(
                (r) =>
                    String(r.id ?? r.region_id) ===
                    String(branch?.regionId ?? branch?.region_id)
            ) || null;

        return {
            group: group?.name || group?.group_name || "Unknown",
            officer: officerName,
            branch: branch?.name || branch?.branch_name || "Unknown",
            region: region?.name || region?.region_name || "Unknown",
        };
    };

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

    // ✅ Upload -> base64 (strip prefix)
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

    const handleDelete = async (memberId) => {
        try {
            await deleteMember(memberId);
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

    const saving = isCreating || isUpdating;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Member Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Create and manage members (borrowers)
                    </p>
                </div>

                <Dialog
                    open={open}
                    onOpenChange={(v) => {
                        setOpen(v);
                        if (!v) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={groups.length === 0} onClick={openCreate}>
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Member
                        </Button>
                    </DialogTrigger>

                    {/* ✅ padding + margin fixes:
                        - remove extra empty space around dialog by using p-0
                        - add proper header padding
                        - ScrollArea has pr-3 so scrollbar doesn't overlap content
                        - sticky footer has px-6 + shadow */}
                    <DialogContent className="w-[95vw] max-w-3xl p-0 overflow-hidden">
                        <DialogHeader className="px-6 pt-6 pb-2">
                            <DialogTitle>
                                {editingId ? "Edit Member" : "Create New Member"}
                            </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="max-h-[72vh] px-6 pr-3 pb-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Group */}
                                <div className="space-y-2">
                                    <Label>Assign to Group</Label>
                                    <Select value={groupId} onValueChange={setGroupId} required>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select group"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groups.map((group) => {
                                                const gid = String(group.id ?? group.group_id);
                                                const loId = String(group.loanOfficerId ?? group.lo_id);
                                                const loName = officerNameById.get(loId) || "Unknown";
                                                return (
                                                    <SelectItem key={gid} value={gid}>
                                                        {(group.name || group.group_name || `Group ${gid}`)} ({loName})
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Main fields grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            className="h-11"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="e.g., John Doe"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input
                                            className="h-11"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+91 98xxxxxx"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Father / Husband Name</Label>
                                        <Input
                                            className="h-11"
                                            value={fatherOrHusbandName}
                                            onChange={(e) => setFatherOrHusbandName(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mother Name</Label>
                                        <Input
                                            className="h-11"
                                            value={motherName}
                                            onChange={(e) => setMotherName(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>DOB</Label>
                                        <Input
                                            className="h-11"
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Pincode</Label>
                                        <Input
                                            className="h-11"
                                            value={pincode}
                                            onChange={(e) => setPincode(e.target.value)}
                                            placeholder="e.g., 700893"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Aadhaar No</Label>
                                        <Input
                                            className="h-11"
                                            value={aadharNo}
                                            onChange={(e) => setAadharNo(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>PAN No</Label>
                                        <Input
                                            className="h-11"
                                            value={panNo}
                                            onChange={(e) => setPanNo(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Voter ID</Label>
                                        <Input
                                            className="h-11"
                                            value={voterId}
                                            onChange={(e) => setVoterId(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    {/* ✅ Photo Upload (base64) */}
                                    <div className="space-y-2">
                                        <Label>Photo</Label>

                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="h-11"
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                            />
                                            {photoPreview ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-11"
                                                    onClick={clearPhoto}
                                                >
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            ) : (
                                                <Button type="button" variant="outline" className="h-11" disabled>
                                                    <ImageIcon className="h-4 w-4"/>
                                                </Button>
                                            )}
                                        </div>

                                        {photoPreview && (
                                            <div className="mt-2 flex items-center gap-3 rounded-lg border p-2">
                                                <img
                                                    src={photoPreview}
                                                    alt="preview"
                                                    className="h-14 w-14 rounded-md object-cover"
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    Saved as base64 (photo_b64)
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Full width addresses */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Present Address</Label>
                                        <Textarea
                                            className="min-h-[90px] resize-none"
                                            value={presentAddress}
                                            onChange={(e) => setPresentAddress(e.target.value)}
                                            placeholder="Present address"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Permanent Address</Label>
                                        <Textarea
                                            className="min-h-[90px] resize-none"
                                            value={permanentAddress}
                                            onChange={(e) => setPermanentAddress(e.target.value)}
                                            placeholder="Permanent address"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Other Details</Label>
                                        <Textarea
                                            className="min-h-[90px] resize-none"
                                            value={otherDetails}
                                            onChange={(e) => setOtherDetails(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    {/* Active */}
                                    <div
                                        className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <p className="text-sm font-medium">Active</p>
                                            <p className="text-xs text-muted-foreground">
                                                If off, member won’t show in list
                                            </p>
                                        </div>
                                        <Switch checked={isActive} onCheckedChange={setIsActive}/>
                                    </div>
                                </div>

                                {/* ✅ Footer CTA (no overlap + good padding) */}
                                <div className="sticky bottom-0 bg-background pt-2 pb-2">
                                    <div className="px-0">
                                        <Button type="submit" className="w-full h-11" disabled={saving}>
                                            {saving ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                                    {editingId ? "Updating..." : "Creating..."}
                                                </span>
                                            ) : (
                                                editingId ? "Update Member" : "Create Member"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Errors */}
            {isError && (
                <Card>
                    <CardContent className="py-6 text-sm text-destructive">
                        {error?.response?.data?.detail || error?.message || "Failed to load members"}
                    </CardContent>
                </Card>
            )}

            {/* Loading */}
            {isLoading && (
                <Card>
                    <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2"/>
                        Loading members...
                    </CardContent>
                </Card>
            )}

            {/* List */}
            {!isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((m) => {
                        const info = getMemberInfo(m);

                        const hasPhoto = Boolean(m.photo_b64);
                        const photoSrc = hasPhoto ? `data:image/*;base64,${m.photo_b64}` : "";

                        return (
                            <Card key={m.member_id}>
                                <CardHeader>
                                    <CardTitle className="flex items-start justify-between gap-3">
                                        <span>{m.full_name}</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEdit(m)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4"/>
                                            Edit
                                        </Button>
                                    </CardTitle>

                                    <CardDescription>
                                        Phone: {m.phone}
                                        <br/>
                                        Group: {info.group}
                                        <br/>
                                        Officer: {info.officer}
                                        <br/>
                                        Branch: {info.branch} | Region: {info.region}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                    {hasPhoto && (
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={photoSrc}
                                                alt="member"
                                                className="h-12 w-12 rounded-md object-cover border"
                                            />
                                            <div className="text-xs text-muted-foreground">
                                                Photo attached
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground">
                                        {m.dob ? <>DOB: {m.dob}<br/></> : null}
                                        {m.aadhar_no ? <>Aadhaar: {m.aadhar_no}<br/></> : null}
                                        {m.pan_no ? <>PAN: {m.pan_no}<br/></> : null}
                                        {m.voter_id ? <>Voter: {m.voter_id}<br/></> : null}
                                    </div>

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={isDeleting}
                                        onClick={() => handleDelete(m.member_id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        Deactivate
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Empty states */}
            {!isLoading && members.length === 0 && groups.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground mb-4">No members created yet</p>
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create First Member
                        </Button>
                    </CardContent>
                </Card>
            )}

            {groups.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <p className="text-muted-foreground">
                            Create groups first to add members
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
