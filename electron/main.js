// electron/main.js
import {app, BrowserWindow, dialog, Menu} from "electron";
import pkg from "electron-updater";
import path from "node:path";
import {fileURLToPath} from "node:url";

const {autoUpdater} = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow;
let lastManualCheck = false; // did user explicitly click "Check for updates"?

/* -------------------- Window Creation -------------------- */

function createWindow() {
    const iconPath = isDev
        ? path.join(process.cwd(), "public", "icon.png") // during `npm run dev`
        : path.join(app.getAppPath(), "dist", "icon.png"); // inside asar after build

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.cjs"),
        },
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    } else {
        const appPath = app.getAppPath();
        const indexPath = path.join(appPath, "dist", "index.html");
        mainWindow.loadFile(indexPath);
    }
}

/* -------------------- Menu with native update check -------------------- */

function buildMenu() {
    const isMac = process.platform === "darwin";

    const template = [
        ...(isMac
            ? [
                {
                    label: app.name,
                    submenu: [
                        {role: "about"},
                        {type: "separator"},
                        {role: "services"},
                        {type: "separator"},
                        {role: "hide"},
                        {role: "hideOthers"},
                        {role: "unhide"},
                        {type: "separator"},
                        {role: "quit"},
                    ],
                },
            ]
            : []),

        {
            label: "App",
            submenu: [
                {role: "reload"},
                {role: "toggleDevTools"},
                {type: "separator"},
                isMac ? {role: "close"} : {role: "quit"},
            ],
        },

        {
            label: "Help",
            submenu: [
                {
                    label: "Check for updates…",
                    click: () => {
                        if (isDev) {
                            dialog.showMessageBox({
                                type: "info",
                                title: "Updates",
                                message:
                                    "Auto-update is disabled in development builds.",
                            });
                            return;
                        }
                        lastManualCheck = true;
                        autoUpdater.checkForUpdates();
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/* -------------------- Auto-update setup -------------------- */

function initAutoUpdates() {
    if (isDev) {
        console.log("[autoUpdater] Skipping auto-update in development.");
        return;
    }

    autoUpdater.autoDownload = true;

    autoUpdater.on("checking-for-update", () => {
        console.log("[autoUpdater] Checking for updates...");
        if (lastManualCheck) {
            dialog.showMessageBox({
                type: "info",
                title: "Updates",
                message: "Checking for updates…",
            });
        }
    });

    autoUpdater.on("update-available", (info) => {
        console.log("[autoUpdater] Update available:", info.version);
        if (lastManualCheck) {
            dialog.showMessageBox({
                type: "info",
                title: "Update available",
                message: `Version ${info.version} is available.\n\nThe update will be downloaded in the background.`,
            });
        }
    });

    autoUpdater.on("update-not-available", (info) => {
        console.log("[autoUpdater] No updates available.");
        if (lastManualCheck) {
            dialog.showMessageBox({
                type: "info",
                title: "No updates",
                message:
                    "You are already using the latest version of PMS Dashboard.",
            });
        }
        lastManualCheck = false;
    });

    autoUpdater.on("error", (err) => {
        const msg = err == null ? "unknown" : (err.stack || err).toString();
        console.error("[autoUpdater] Error:", msg);

        if (lastManualCheck) {
            dialog.showErrorBox(
                "Update Error",
                `There was a problem checking for updates.\n\n${msg}`
            );
        }
        lastManualCheck = false;
    });

    autoUpdater.on("download-progress", (progressObj) => {
        const pct = progressObj.percent || 0;
        const speedKbps = Math.round(
            (progressObj.bytesPerSecond || 0) / 1024
        );
        console.log(
            "[autoUpdater] progress",
            `${speedKbps} KB/s, ${pct.toFixed(1)}% (${progressObj.transferred}/${progressObj.total})`
        );
        // No UI here – just log.
    });

    autoUpdater.on("update-downloaded", (info) => {
        console.log("[autoUpdater] Update downloaded:", info.version);

        const result = dialog.showMessageBoxSync({
            type: "question",
            title: "Update ready",
            message:
                "A new version of PMS Dashboard has been downloaded.\n\nDo you want to install it now and restart?",
            buttons: ["Install and Restart", "Later"],
            defaultId: 0,
            cancelId: 1,
        });

        if (result === 0) {
            autoUpdater.quitAndInstall();
        } else {
            // user chose "Later"
            lastManualCheck = false;
        }
    });

    // Silent check on startup (will only show dialog if update is downloaded)
    autoUpdater.checkForUpdatesAndNotify();
}

/* -------------------- App lifecycle -------------------- */

app.whenReady().then(() => {
    createWindow();
    buildMenu();
    initAutoUpdates();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
