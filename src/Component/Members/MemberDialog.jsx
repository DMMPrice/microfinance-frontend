// src/Component/Home/Main Components/Members/MemberDialog.jsx
import React from "react";
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
                               photoPreview, // dataURL
                           }) {
    const doc = new jsPDF({unit: "mm", format: "a4"});
    const left = 14;

    // Header
    doc.setFontSize(16);
    doc.text(title, left, 16);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, 22);

    // Main table
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

    // Photo (optional)
    if (photoPreview) {
        const y = (doc.lastAutoTable?.finalY || 28) + 10;
        doc.setFontSize(12);
        doc.text("Photo", left, y);

        try {
            // try jpeg
            doc.addImage(photoPreview, "JPEG", left, y + 4, 40, 40);
        } catch (e) {
            try {
                // fallback png
                doc.addImage(photoPreview, "PNG", left, y + 4, 40, 40);
            } catch (err) {
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

                                         groups = [],
                                         officerNameById,

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
    const handleDownloadPDF = () => {
        // Build Group label (GroupName (LoanOfficerName))
        const g = groups.find((x) => String(x.id ?? x.group_id) === String(groupId));
        const gid = String(g?.id ?? g?.group_id ?? "");
        const loId = String(g?.loanOfficerId ?? g?.lo_id ?? "");
        const loName = officerNameById?.get(loId) || "Unknown";
        const groupLabel = g ? `${g.name || g.group_name || `Group ${gid}`} (${loName})` : "-";

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

    const groupOptions = groups.map((group) => {
        const gid = String(group.id ?? group.group_id);
        const loId = String(group.loanOfficerId ?? group.lo_id);
        const loName = officerNameById?.get(loId) || "Unknown";

        return {
            value: gid,
            label: `${group.name || group.group_name || `Group ${gid}`} (${loName})`,
            keywords: `${gid} ${loName}`,
        };
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-4xl p-0 overflow-hidden">
                {/* Header + Actions */}
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

                        {/* ✅ Download + Active */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10"
                                onClick={handleDownloadPDF}
                            >
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
                        {/* Group */}
                        <div className="space-y-2">
                            <Label>Assign to Group</Label>

                                <SearchableSelect
                                    value={groupId}
                                    onValueChange={setGroupId}
                                    options={groupOptions}
                                    placeholder="Select group"
                                    searchPlaceholder="Search group or loan officer..."
                                    className="h-11"
                                />
                            </div>

                        <Separator/>

                        {/* BASIC INFO */}
                        <div className="space-y-4">
                            <SectionTitle
                                title="Basic Information"
                                desc="Primary borrower details used for identification."
                            />

                            {/* Row 1: Name | Phone | DOB */}
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

                            {/* Row 2: Father/Husband | Mother | Pincode */}
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
                            <SectionTitle
                                title="Address"
                                desc="Keep address complete for field verification."
                            />

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
                                {/* Photo */}
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

                                {/* Other Details */}
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

                        {/* Sticky Footer */}
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
