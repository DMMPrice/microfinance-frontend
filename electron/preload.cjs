// electron/preload.cjs
const {contextBridge} = require("electron");

// You can remove this entirely if you never use window.electronUpdates.
// For safety, we expose a no-op API so calls won't crash.
contextBridge.exposeInMainWorld("electronUpdates", {
    onStatus(callback) {
        // No update status events now – return an unsubscribe no-op
        return () => {
        };
    },

    async checkForUpdates() {
        console.warn(
            "[electronUpdates] checkForUpdates called in renderer; updates are handled via the Help → 'Check for updates…' menu."
        );
        return {ok: false, reason: "handled-in-main"};
    },

    async restartNow() {
        console.warn(
            "[electronUpdates] restartNow called in renderer; updates are handled via native dialogs."
        );
        return {ok: false, reason: "handled-in-main"};
    },
});
