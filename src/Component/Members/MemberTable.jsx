// src/Component/Home/Main Components/Members/MemberTable.jsx
import React, {useMemo} from "react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Pencil, Trash2} from "lucide-react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

function getInitials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "MB";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MemberTable({
    isLoading,
    rows = [],
    onEdit,
    onDeactivate,
    isDeleting,
}) {
    const data = Array.isArray(rows) ? rows : [];

    const columns = useMemo(
        () => [
            {
                key: "borrower",
                header: "Borrower Name",
                tdClassName: "text-left whitespace-normal",
                sortValue: (row) => row?.m?.full_name || "",
                cell: (row) => {
                    const m = row?.m || {};
                    const hasPhoto = Boolean(
                        m.photo_b64 && String(m.photo_b64).trim().length > 0
                    );
                    const avatarSrc = hasPhoto
                        ? `data:image/*;base64,${m.photo_b64}`
                        : "";

                    return (
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage
                                    src={avatarSrc}
                                    alt={m.full_name || "member"}
                                />
                                <AvatarFallback className="text-xs">
                                    {getInitials(m.full_name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="leading-tight">
                                <div className="font-medium">{m.full_name || "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                    {m.dob ? `DOB: ${m.dob}` : "—"}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: "phone",
                header: "Phone",
                sortValue: (row) => row?.m?.phone || "",
                cell: (row) => row?.m?.phone || "—",
            },
            {
                key: "group",
                header: "Group",
                sortValue: (row) => row?.info?.group || "",
                cell: (row) => row?.info?.group || "—",
            },
            {
                key: "officer",
                header: "Officer",
                sortValue: (row) => row?.info?.officer || "",
                cell: (row) => row?.info?.officer || "—",
            },
            {
                key: "branch",
                header: "Branch",
                sortValue: (row) => row?.info?.branch || "",
                cell: (row) => row?.info?.branch || "—",
            },
            {
                key: "region",
                header: "Region",
                sortValue: (row) => row?.info?.region || "",
                cell: (row) => row?.info?.region || "—",
            },
            {
                key: "status",
                header: "Status",
                sortValue: (row) => (row?.m?.is_active ?? true) ? 1 : 0,
                cell: (row) => {
                    const active = Boolean(row?.m?.is_active ?? true);
                    return active ? (
                        <Badge variant="secondary">Active</Badge>
                    ) : (
                        <Badge variant="destructive">Inactive</Badge>
                    );
                },
            },
            {
                key: "actions",
                header: "Actions",
                tdClassName: "text-right whitespace-nowrap",
                hideable: false,
                sortValue: () => "", // no-op
                cell: (row) => {
                    const m = row?.m || {};
                    return (
                        <div className="inline-flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit?.(m)}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Button>

                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={Boolean(isDeleting)}
                                onClick={() => onDeactivate?.(m)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [onEdit, onDeactivate, isDeleting]
    );

    return (
        <AdvancedTable
            title={null}
            description={null}
            data={data}
            columns={columns}
            isLoading={Boolean(isLoading)}
            errorText={""}
            emptyText="No members found."
            // ✅ Pagination enabled
            enablePagination={true}
            initialPageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
            // ✅ Search is handled by MemberFilters (external)
            enableSearch={false}
            enableColumnToggle={true}
            stickyHeader={true}
            rowKey={(row) => row?.m?.member_id}
        />
    );
}
