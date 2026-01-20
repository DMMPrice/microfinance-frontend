// src/hooks/useDbMaintenance.js
import {useMutation} from "@tanstack/react-query";
import {api} from "@/lib/http"; // use your axios instance

function getFilenameFromDisposition(disposition) {
    if (!disposition) return null;
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return match?.[1] || null;
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

export function useDbMaintenance() {
    // -------------------------
    // 1) BACKUP (download .sql)
    // -------------------------
    const backupMutation = useMutation({
        mutationFn: async () => {
            // IMPORTANT: responseType blob
            const res = await api.post("/db/backup", null, {responseType: "blob"});

            const filename =
                getFilenameFromDisposition(res.headers?.["content-disposition"]) ||
                `db_backup_${Date.now()}.sql`;

            const blob = new Blob([res.data], {type: "application/sql"});
            downloadBlob(blob, filename);

            return {filename};
        },
    });

    // -------------------------
    // 2) RESTORE (upload .sql)
    // -------------------------
    const restoreMutation = useMutation({
        mutationFn: async (file) => {
            if (!file) throw new Error("No file selected");
            const name = file?.name || "";
            if (!name.toLowerCase().endsWith(".sql")) {
                throw new Error("Please upload a .sql file");
            }

            const formData = new FormData();
            // backend expects: sql_file: UploadFile = File(...)
            formData.append("sql_file", file);

            const res = await api.post("/db/restore", formData, {
                headers: {"Content-Type": "multipart/form-data"},
            });

            return res.data; // {message, database}
        },
    });

    // -------------------------
    // 3) CLONE-TO
    // -------------------------
    const cloneToMutation = useMutation({
        mutationFn: async (payload) => {
            // payload:
            // {
            //   dest_host, dest_port, dest_dbname, dest_user, dest_pass, clean
            // }
            const res = await api.post("/db/clone-to", payload);
            return res.data;
        },
    });

    return {
        // backup
        backup: backupMutation.mutateAsync,
        isBackingUp: backupMutation.isPending,
        backupError: backupMutation.error,

        // restore
        restore: restoreMutation.mutateAsync,
        isRestoring: restoreMutation.isPending,
        restoreError: restoreMutation.error,

        // clone-to
        cloneTo: cloneToMutation.mutateAsync,
        isCloning: cloneToMutation.isPending,
        cloneError: cloneToMutation.error,
    };
}
