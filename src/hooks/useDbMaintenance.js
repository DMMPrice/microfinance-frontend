// src/hooks/useDbMaintenance.js
import {useMutation} from "@tanstack/react-query";
import {api} from "@/lib/http"; // your axios instance

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
    // 1) BACKUP
    const backupMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/db/backup", null, {responseType: "blob"});

            const filename =
                getFilenameFromDisposition(res.headers?.["content-disposition"]) ||
                `db_backup_${Date.now()}.sql`;

            const blob = new Blob([res.data], {type: "application/sql"});
            downloadBlob(blob, filename);

            return {filename};
        },
    });

    // 2) RESTORE (now needs creds + file)
    const restoreMutation = useMutation({
        mutationFn: async ({file, creds}) => {
            if (!file) throw new Error("No file selected");
            const name = file?.name || "";
            if (!name.toLowerCase().endsWith(".sql")) {
                throw new Error("Please upload a .sql file");
            }

            const {
                db_host,
                db_port,
                db_name,
                db_user,
                db_pass,
            } = creds || {};

            if (!db_host || !db_name || !db_user || !db_pass) {
                throw new Error("Restore credentials are required (Host, DB, User, Password).");
            }

            const formData = new FormData();
            formData.append("db_host", String(db_host).trim());
            formData.append("db_port", String(db_port || 5432));
            formData.append("db_name", String(db_name).trim());
            formData.append("db_user", String(db_user).trim());
            formData.append("db_pass", String(db_pass)); // don't trim passwords
            formData.append("sql_file", file);

            const res = await api.post("/db/restore", formData, {
                headers: {"Content-Type": "multipart/form-data"},
            });

            return res.data; // {message, target}
        },
    });

    // 3) CLONE-TO
    const cloneToMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post("/db/clone-to", payload);
            return res.data;
        },
    });

    return {
        backup: backupMutation.mutateAsync,
        isBackingUp: backupMutation.isPending,
        backupError: backupMutation.error,

        restore: restoreMutation.mutateAsync,
        isRestoring: restoreMutation.isPending,
        restoreError: restoreMutation.error,

        cloneTo: cloneToMutation.mutateAsync,
        isCloning: cloneToMutation.isPending,
        cloneError: cloneToMutation.error,
    };
}
