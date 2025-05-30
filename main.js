/*
MIT License

Copyright (c) 2025 World Balancer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { loadConfig, saveConfig, initializeConfig } = require("./Configfiles/configManager.js");
const { version } = require("./package.json");


let mainWindow;

// ─────────────────────────────────────
// IPC Handlers
ipcMain.handle("get-user-data-path", () => app.getPath("userData"));
ipcMain.handle("load-config", async () => {
    try {
        const config = await loadConfig();
        return config;
    } catch (err) {
        console.error("Failed to load config:", err);
        return {};
    }
});

ipcMain.handle("save-config", async (event, config) => {
    try {
        await saveConfig(config);
        return { success: true };
    } catch (err) {
        console.error("Failed to save config:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle("get-app-version", () => version);

// ─────────────────────────────────────
// Log dispatching
/** @type {*} */
let logQueue = [];
/**
 *
 *
 * @param {*} message
 * @param {string} [level="info"]
 * @param {string} [type="mainlog"]
 */
function log(message, level = "info", type = "mainlog") {
    const windows = BrowserWindow.getAllWindows();
    const logData = { type, message: `${message}`, level };
    if (windows.length > 0) {
        windows[0].webContents.executeJavaScript(`
            window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(logData)} }));
        `);
    } else {
        logQueue.push(logData);
    }
}

// ─────────────────────────────────────
// Config DB path

(async () => {
    await initializeConfig(); // ensures config is up-to-date
})();

// ─────────────────────────────────────
// Window setup
/**
 *
 *
 */
function createLoadingWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: true,
    });

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.webContents.removeAllListeners("did-stop-loading");

    mainWindow.loadFile(path.join(__dirname, "loading.html"));
}

/**
 *
 *
 * @param {*} isFirstLaunch
 */
function loadMainWindow(isFirstLaunch) {
    mainWindow.loadFile(path.join(__dirname, "index.html")).then(() => {
        mainWindow.webContents.send("app-version", version);
        if (isFirstLaunch) {
            log("Welcome! First time setup complete.", "info");
        }
        logQueue.forEach(entry => log(entry.message, entry.level, entry.type));
        logQueue = [];
        //mainWindow.webContents.openDevTools(); // Optional
    });
}

// ─────────────────────────────────────
// App lifecycle
app.on("ready", () => {
    createLoadingWindow();
    mainWindow.webContents.once("did-finish-load", async () => {
        try {
            loadMainWindow();
        } catch (err) {
            console.error("Database init failed:", err);
            log(`Database setup error: ${err.message}`, "error");
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createLoadingWindow();
    }
});

const origOn = require("events").EventEmitter.prototype.on;
require("events").EventEmitter.prototype.on = function (event, fn) {
    if (event === "did-stop-loading") {
        //console.trace("Adding did-stop-loading listener");
    }
    return origOn.call(this, event, fn);
};

function maybeForceGC() {
    if (global.gc) {
        console.log("Forcing garbage collection...");
        global.gc();
    } else {
        console.log("Manual GC not exposed; cannot force collection.");
    }
}

setInterval(maybeForceGC, 5 * 60 * 1000);

module.exports = { log };
