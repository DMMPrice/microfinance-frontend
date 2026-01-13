// src/hooks/useRegions.js
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {api} from "@/lib/http.js";
import {useMemo} from "react";

const REGIONS_KEY = ["regions"];

export function useRegions() {
    const queryClient = useQueryClient();

    // GET /regions
    const {
        data: regions = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: REGIONS_KEY,
        queryFn: async () => {
            const res = await api.get("/regions/");
            return res.data; // list[{region_id, region_name, ...}]
        },
        refetchOnWindowFocus: false,
    });

    // ✅ map for quick lookup
    const regionById = useMemo(() => {
        const map = {};
        for (const r of regions || []) {
            const id = r.region_id ?? r.id;
            if (id != null) map[id] = r;
        }
        return map;
    }, [regions]);

    const getRegionName = (regionId) => {
        if (regionId == null) return "";
        const r = regionById[regionId];
        return r?.region_name || r?.name || "";
    };

    // POST /regions
    const createRegionMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/regions", payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: REGIONS_KEY});
        },
    });

    // PUT /regions/{region_id}
    const updateRegionMutation = useMutation({
        mutationFn: async ({region_id, ...payload}) => {
            const res = await api.put(`/regions/${region_id}`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: REGIONS_KEY});
        },
    });

    // DELETE /regions/{region_id}
    const deleteRegionMutation = useMutation({
        mutationFn: async (region_id) => {
            const res = await api.delete(`/regions/${region_id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: REGIONS_KEY});
        },
    });

    return {
        regions,
        regionById,
        getRegionName,

        isLoading,
        isError,
        error,
        refetch,

        createRegion: createRegionMutation.mutateAsync,
        updateRegion: updateRegionMutation.mutateAsync,
        deleteRegion: deleteRegionMutation.mutateAsync,

        isCreating: createRegionMutation.isPending,
        isUpdating: updateRegionMutation.isPending,
        isDeleting: deleteRegionMutation.isPending,
    };
}
