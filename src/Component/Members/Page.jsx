import MemberManagement from "@/Component/Members/MemberManagement.jsx";
import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";
import {getUserCtx} from "@/lib/http.js";

export default function Page() {
    const ctx = getUserCtx();
    const role = String(ctx?.role ?? "").trim().toLowerCase();

    const {groups = [], isLoading: groupsLoading} = useGroups();
    const {branches = [], isLoading: branchesLoading} = useBranches();
    const {regions = [], isLoading: regionsLoading} = useRegions();
    const {loanOfficers = [], isLoading: officersLoading} = useLoanOfficers();

    // Build a simple "officers" array in the shape MemberManagement expects: { id, name }
    let officers = (loanOfficers || []).map((lo) => ({
        id: lo.lo_id,
        name: lo.employee?.full_name || `Loan Officer ${lo.lo_id}`,
    }));

    // ✅ Branch Manager should only see officers that belong to their branch scope
    // (derive from already-scoped groups list)
    const isBranchManager = ["branch_manager", "branch manager", "bm"].includes(role);
    if (isBranchManager) {
        const allowedOfficerIds = new Set(
            (groups || [])
                .map((g) => String(g.lo_id ?? g.loanOfficerId ?? g.loan_officer_id ?? g.loId ?? ""))
                .filter(Boolean)
        );
        officers = officers.filter((o) => allowedOfficerIds.has(String(o.id)));
    }

    // Optional: also scope regions list if profile has regionId
    const scopedRegions = (() => {
        const regionId = ctx?.regionId ?? ctx?.profileData?.region_id ?? null;
        const isRM = ["regional_manager", "regional manager", "rm"].includes(role);
        if ((isRM || isBranchManager) && regionId != null) {
            return (regions || []).filter((r) => String(r.id ?? r.region_id) === String(regionId));
        }
        return regions;
    })();

    const loading = groupsLoading || branchesLoading || regionsLoading || officersLoading;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Borrowers</h1>
                <p className="text-muted-foreground">Create and manage borrower profiles (members)</p>
            </div>

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading master data...</div>
            ) : (
                <MemberManagement
                    groups={groups}
                    branches={branches}
                    regions={scopedRegions}
                    officers={officers}
                />
            )}
        </div>
    );
}
