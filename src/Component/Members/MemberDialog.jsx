// src/Component/Home/Main Components/Members/MemberDialog.jsx
import React, {useEffect, useMemo, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Loader2, Image as ImageIcon, X, Download} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import SearchableSelect from "@/Utils/SearchableSelect.jsx";

import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {useGroups} from "@/hooks/useGroups.js";
import {getProfileData} from "@/hooks/useApi.js";

function SectionTitle({title, desc}) {
    return (
        <div className="space-y-1">
            <div className="text-sm font-semibold">{title}</div>
            {desc ? <div className="text-xs text-muted-foreground">{desc}</div> : null}
        </div>
    );
}

function safeFileName(name) {
    const n = String(name || "member")
        .replace(/[^\w\- ]+/g, "")
        .trim()
        .replace(/\s+/g, "_");
    return n || "member";
}

// ✅ normalize meeting day (supports string/number/object)
function normDay(v) {
    if (v == null) return "";
    if (typeof v === "object") return normDay(v?.name ?? v?.day ?? v?.label ?? "");
    if (typeof v === "number") {
        const map0 = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return map0[v] || "";
    }
    const s = String(v).trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function groupLabelWithMeetingDay(group) {
    // group API: group_name, meeting_day, group_id
    const name = group?.name ?? group?.group_name ?? "";
    const md =
        group?.meeting_day ??
        group?.meetingDay ??
        group?.meeting_day_name ??
        group?.meetingDayName ??
        "";
    const mdStr = normDay(md);
    return mdStr ? `${name} (${mdStr})` : name;
}

// ✅ PDF generator
function downloadMemberPDF({
                               title = "Borrower Profile",
                               fullName,
                               phone,
                               dob,
                               fatherOrHusbandName,
                               motherName,
                               pincode,
                               aadharNo,
                               panNo,
                               voterId,
                               groupLabel,
                               presentAddress,
                               permanentAddress,
                               otherDetails,
                               isActive,
                               photoPreview,
                           }) {
    const doc = new jsPDF({unit: "mm", format: "a4"});
    const left = 14;

    doc.setFontSize(16);
    doc.text(title, left, 16);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, 22);

    const rows = [
        ["Full Name", fullName || "-"],
        ["Phone", phone || "-"],
        ["DOB", dob || "-"],
        ["Father/Husband Name", fatherOrHusbandName || "-"],
        ["Mother Name", motherName || "-"],
        ["Pincode", pincode || "-"],
        ["Aadhaar No", aadharNo || "-"],
        ["PAN No", panNo || "-"],
        ["Voter ID", voterId || "-"],
        ["Group", groupLabel || "-"],
        ["Active", isActive ? "Yes" : "No"],
        ["Present Address", presentAddress || "-"],
        ["Permanent Address", permanentAddress || "-"],
        ["Other Details", otherDetails || "-"],
    ];

    autoTable(doc, {
        startY: 28,
        head: [["Field", "Value"]],
        body: rows,
        styles: {fontSize: 10, cellPadding: 3, valign: "top"},
        headStyles: {fontSize: 10},
        columnStyles: {
            0: {cellWidth: 55},
            1: {cellWidth: 130},
        },
    });

    if (photoPreview) {
        const y = (doc.lastAutoTable?.finalY || 28) + 10;
        doc.setFontSize(12);
        doc.text("Photo", left, y);

        try {
            doc.addImage(photoPreview, "JPEG", left, y + 4, 40, 40);
        } catch {
            try {
                doc.addImage(photoPreview, "PNG", left, y + 4, 40, 40);
            } catch {
                // ignore
            }
        }
    }

    doc.save(`Borrower_${safeFileName(fullName)}.pdf`);
}

export default function MemberDialog({
                                         open,
                                         onOpenChange,
                                         editingId,
                                         saving,

                                         // ⛔ we won't use parent "groups" now for selection.
                                         // We will load groups dynamically after LO selection.
                                         // (Keep prop for compatibility if you want)
                                         groups = [],

                                         groupId,
                                         setGroupId,

                                         fullName,
                                         setFullName,
                                         fatherOrHusbandName,
                                         setFatherOrHusbandName,
                                         motherName,
                                         setMotherName,
                                         dob,
                                         setDob,
                                         phone,
                                         setPhone,
                                         aadharNo,
                                         setAadharNo,
                                         panNo,
                                         setPanNo,
                                         voterId,
                                         setVoterId,
                                         presentAddress,
                                         setPresentAddress,
                                         permanentAddress,
                                         setPermanentAddress,
                                         pincode,
                                         setPincode,
                                         otherDetails,
                                         setOtherDetails,
                                         photoPreview,
                                         handlePhotoUpload,
                                         clearPhoto,
                                         isActive,
                                         setIsActive,
                                         onSubmit,
                                     }) {
    // ✅ profileData from useApi helper (localStorage)
    const profile = useMemo(() => getProfileData(), []);
    const profileBranchId = profile?.branch_id ?? null;

    // ✅ Loan officers from hook
    const {loanOfficers = [], isLoading: loLoading} = useLoanOfficers();

    // ✅ Selected Loan Officer (lo_id)
    const [selectedLoId, setSelectedLoId] = useState("");

    // ✅ when dialog opens, reset if creating new
    useEffect(() => {
        if (!open) return;
        if (!editingId) {
            setSelectedLoId("");
            setGroupId("");
        }
    }, [open, editingId, setGroupId]);

    // ✅ Filter LO branch-wise (BM sees their branch)
    const filteredLoanOfficers = useMemo(() => {
        if (!profileBranchId) return loanOfficers;
        return loanOfficers.filter((lo) => String(lo?.employee?.branch_id) === String(profileBranchId));
    }, [loanOfficers, profileBranchId]);

    // ✅ Build LO dropdown options from actual response shape
    const loanOfficerOptions = useMemo(() => {
        return filteredLoanOfficers.map((lo) => {
            const loId = String(lo?.lo_id ?? "");
            const emp = lo?.employee ?? {};
            const user = emp?.user ?? {};
            const full = emp?.full_name ?? "";
            const username = user?.username ?? "";
            const email = user?.email ?? "";

            const label = full
                ? `${full}${username ? ` (${username})` : ""}`
                : username || email || `LO ${loId}`;

            const keywords = `${loId} ${full} ${username} ${email}`.trim();

            return {value: loId, label, keywords};
        });
    }, [filteredLoanOfficers]);

    // ✅ Load groups only after LO selection
    // useGroups supports params lo_id + branch_id (and auto-applies branch_id for BM)
    const {
        groups: apiGroups = [],
        isLoading: groupsLoading,
    } = useGroups(
        selectedLoId
            ? {branch_id: profileBranchId ?? undefined, lo_id: selectedLoId}
            : {branch_id: profileBranchId ?? undefined}
    );

    // ✅ Only show groups of selected LO (backend already filters, still safe)
    const groupsForSelectedLo = useMemo(() => {
        if (!selectedLoId) return [];
        return (apiGroups || []).filter((g) => String(g?.lo_id) === String(selectedLoId));
    }, [apiGroups, selectedLoId]);

    const groupOptions = useMemo(() => {
        return groupsForSelectedLo.map((g) => {
            const gid = String(g?.group_id ?? g?.id ?? "");
            const label = groupLabelWithMeetingDay(g) || `Group ${gid}`;
            return {
                value: gid,
                label,
                keywords: `${gid} ${label} ${g?.meeting_day ?? ""}`.trim(),
            };
        });
    }, [groupsForSelectedLo]);

    const selectedGroupObj = useMemo(() => {
        return groupsForSelectedLo.find((g) => String(g?.group_id ?? g?.id) === String(groupId)) || null;
    }, [groupsForSelectedLo, groupId]);

    const handleDownloadPDF = () => {
        const groupLabel = selectedGroupObj ? groupLabelWithMeetingDay(selectedGroupObj) : "-";

        downloadMemberPDF({
            title: "Borrower Profile",
            fullName,
            phone,
            dob,
            fatherOrHusbandName,
            motherName,
            pincode,
            aadharNo,
            panNo,
            voterId,
            groupLabel,
            presentAddress,
            permanentAddress,
            otherDetails,
            isActive,
            photoPreview,
        });
    };

    // ✅ LO change => reset group
    const onLoanOfficerChange = (loId) => {
        setSelectedLoId(loId || "");
        setGroupId(""); // must pick group again
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-lg">
                                {editingId ? "Edit Member" : "Create New Member"}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                Fill borrower details carefully. Fields are arranged like a standard form.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" className="h-10" onClick={handleDownloadPDF}>
                                <Download className="mr-2 h-4 w-4"/>
                                Download PDF
                            </Button>

                            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                                <div className="leading-tight">
                                    <div className="text-sm font-medium">Active</div>
                                    <div className="text-[11px] text-muted-foreground">Show in list</div>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive}/>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[72vh] px-6 pr-3 pb-6">
                    <form onSubmit={onSubmit} className="space-y-6">
                        {/* ✅ LO + Group (LO first, then group filtered by LO) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Loan Officer</Label>
                                <SearchableSelect
                                    value={selectedLoId}
                                    onValueChange={onLoanOfficerChange}
                                    options={loanOfficerOptions}
                                    placeholder={loLoading ? "Loading..." : "Select loan officer"}
                                    searchPlaceholder="Search officer name / username / email..."
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Assign to Group</Label>
                                <SearchableSelect
                                    value={groupId}
                                    onValueChange={setGroupId}
                                    options={groupOptions}
                                    placeholder={
                                        !selectedLoId
                                            ? "Select loan officer first"
                                            : groupsLoading
                                                ? "Loading groups..."
                                                : "Select group"
                                    }
                                    searchPlaceholder="Search group / meeting day..."
                                    className="h-11"
                                    disabled={!selectedLoId}
                                />
                                {!selectedLoId ? (
                                    <div className="text-[11px] text-muted-foreground">
                                        Please select a Loan Officer to load groups.
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <Separator/>

                        {/* BASIC INFO */}
                        <div className="space-y-4">
                            <SectionTitle
                                title="Basic Information"
                                desc="Primary borrower details used for identification."
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2 md:col-span-1">
                                    <Label>Full Name</Label>
                                    <Input
                                        className="h-11"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="e.g., John Doe"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-1">
                                    <Label>Phone</Label>
                                    <Input
                                        className="h-11"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91 98xxxxxx"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-1">
                                    <Label>Date of Birth</Label>
                                    <Input
                                        className="h-11"
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <Label>Pincode</Label>
                                    <Input
                                        className="h-11"
                                        value={pincode}
                                        onChange={(e) => setPincode(e.target.value)}
                                        placeholder="e.g., 700893"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator/>

                        {/* ID DETAILS */}
                        <div className="space-y-4">
                            <SectionTitle
                                title="Identity Details"
                                desc="Government ID numbers (optional but recommended)."
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            </div>
                        </div>

                        <Separator/>

                        {/* ADDRESS */}
                        <div className="space-y-4">
                            <SectionTitle title="Address" desc="Keep address complete for field verification."/>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Present Address</Label>
                                    <Textarea
                                        className="min-h-[110px] resize-none"
                                        value={presentAddress}
                                        onChange={(e) => setPresentAddress(e.target.value)}
                                        placeholder="House no, street, locality..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Permanent Address</Label>
                                    <Textarea
                                        className="min-h-[110px] resize-none"
                                        value={permanentAddress}
                                        onChange={(e) => setPermanentAddress(e.target.value)}
                                        placeholder="House no, street, locality..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator/>

                        {/* PHOTO + OTHER */}
                        <div className="space-y-4">
                            <SectionTitle
                                title="Photo & Notes"
                                desc="Upload borrower photo and any additional information."
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Photo</Label>
                                    <div className="flex items-center gap-2">
                                        <Input className="h-11" type="file" accept="image/*"
                                               onChange={handlePhotoUpload}/>
                                        {photoPreview ? (
                                            <Button type="button" variant="outline" className="h-11"
                                                    onClick={clearPhoto}>
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
                                            <img src={photoPreview} alt="preview"
                                                 className="h-14 w-14 rounded-md object-cover"/>
                                            <div className="text-xs text-muted-foreground">Saved as base64 (photo_b64)
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Other Details</Label>
                                    <Textarea
                                        className="min-h-[110px] resize-none"
                                        value={otherDetails}
                                        onChange={(e) => setOtherDetails(e.target.value)}
                                        placeholder="Optional notes..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-background pt-2 pb-2">
                            <Button type="submit" className="w-full h-11" disabled={saving}>
                                {saving ? (
                                    <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                                        {editingId ? "Updating..." : "Creating..."}
                  </span>
                                ) : editingId ? (
                                    "Update Member"
                                ) : (
                                    "Create Member"
                                )}
                            </Button>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
