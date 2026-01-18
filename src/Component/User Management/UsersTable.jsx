import React, {useMemo} from "react";
import {Button} from "@/components/ui/button";
import {Pencil, Trash2} from "lucide-react";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";

export default function UsersTable({
                                       users = [],
                                       isLoading = false,
                                       ROLE_OPTIONS = [],
                                       getRegionName,
                                       getBranchName,
                                       regionsLoading = false,
                                       branchesLoading = false,
                                       onEdit,
                                       onDelete,
                                       headerRight = null,     // ✅ NEW
                                       title = "Users Management", // ✅ NEW
                                       description = "",       // ✅ NEW
                                   }) {
    const columns = useMemo(() => {
        return [
            {key: "user_id", header: "User ID", sortValue: (r) => r.user_id},
            {key: "username", header: "Username", sortValue: (r) => r.username},

            {
                key: "role",
                header: "Role",
                sortValue: (r) => (r.employee?.role_id ?? r.role_id ?? ""),
                cell: (r) => {
                    const roleId = r.employee?.role_id ?? r.role_id;
                    const roleLabel =
                        ROLE_OPTIONS.find((x) => x.id === Number(roleId))?.label ?? "-";
                    return <span className="capitalize">{roleLabel.replaceAll("_", " ")}</span>;
                },
            },

            {
                key: "region",
                header: "Region",
                sortValue: (r) => (r.employee?.region_id ?? r.region_id ?? 0),
                cell: (r) =>
                    regionsLoading ? "..." : getRegionName(r.employee?.region_id ?? r.region_id),
            },

            {
                key: "branch",
                header: "Branch",
                sortValue: (r) => (r.employee?.branch_id ?? r.branch_id ?? 0),
                cell: (r) =>
                    branchesLoading ? "..." : getBranchName(r.employee?.branch_id ?? r.branch_id),
            },

            {
                key: "active",
                header: "Active",
                sortValue: (r) => ((r.is_active ?? r.employee?.is_active) ? 1 : 0),
                cell: (r) => ((r.is_active ?? r.employee?.is_active) ? "Yes" : "No"),
            },

            {
                key: "actions",
                header: "Actions",
                hideable: false,
                cell: (r) => (
                    <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit?.(r)}>
                            <Pencil className="h-4 w-4 mr-1"/>
                            Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete?.(r.user_id)}>
                            <Trash2 className="h-4 w-4 mr-1"/>
                            Delete
                        </Button>
                    </div>
                ),
            },
        ];
    }, [ROLE_OPTIONS, getRegionName, getBranchName, regionsLoading, branchesLoading, onEdit, onDelete]);

    return (
        <AdvancedTable
            title={title}                 // ✅ now it shows inside table card
            description={description}
            headerRight={headerRight}     // ✅ buttons go on same header row
            data={users}
            columns={columns}
            isLoading={isLoading}
            emptyText="No users found."
            initialPageSize={10}
            searchPlaceholder="Search users..."
            searchKeys={["user_id", "username", "role", "region", "branch"]}
        />
    );
}
