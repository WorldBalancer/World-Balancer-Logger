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
const fs = require("fs").promises;
const os = require("os");
const sequelize = require("./Configfiles/configsqlite");
const Config = require("./Configfiles/Config");
const { version, name: appName } = require("./package.json");

const isWindows = process.platform === "win32";

let mainWindow;

// ─────────────────────────────────────
// IPC Handlers
ipcMain.handle("get-user-data-path", () => app.getPath("userData"));
ipcMain.handle("load-config", loadConfig);
ipcMain.handle("save-config", async (_, config) => saveConfigRecursively(config));
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
/**
 *
 *
 * @return {*} 
 */
function getDatabasePath() {
    const baseDir = isWindows
        ? path.join(process.env.APPDATA || "", appName, "config")
        : path.join(os.homedir(), `.${appName}`, "config");
    return path.join(baseDir, "config.sqlite");
}

/**
 *
 *
 * @return {*} 
 */
async function doesDatabaseExist() {
    const dbPath = getDatabasePath();
    try {
        await fs.access(dbPath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────
// Config Loader/Saver
/**
 *
 *
 * @param {*} obj
 * @param {string} [parentKey=""]
 * @param {*} [collected=[]]
 */
async function saveConfigRecursively(obj, parentKey = "", collected = []) {
    for (const [key, value] of Object.entries(obj)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            await saveConfigRecursively(value, currentKey, collected);
        } else {
            collected.push({ keyid: currentKey, value: JSON.stringify(value) });
        }
    }
    if (parentKey === "") await Promise.all(collected.map(e => Config.upsert(e)));
}

/**
 *
 *
 * @return {*} 
 */
async function loadConfig() {
    try {
        const configEntries = await Config.findAll();
        const configObject = {};
        for (const { keyid, value } of configEntries) {
            const keys = keyid.split(".");
            let current = configObject;
            keys.forEach((key, i) => {
                if (i === keys.length - 1) {
                    current[key] = JSON.parse(value);
                } else {
                    current[key] = current[key] || {};
                    current = current[key];
                }
            });
        }
        return configObject;
    } catch (error) {
        console.error("loadConfig():", error);
        return {};
    }
}

/**
 *
 *
 * @param {*} obj
 * @param {string} [parentKey=""]
 * @return {*} 
 */
function flattenKeys(obj, parentKey = "") {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            keys = keys.concat(flattenKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

// ─────────────────────────────────────
// Default config and init
/**
 *
 *
 * @return {*} 
 */
async function getDefaultConfig() {
    const baseDir = path.join(os.homedir(), "AppData", "LocalLow", "VRChat", "VRChat");
    return {
        Directories: { LogDirectory: baseDir },
        dirstaffroster: {
            staffgetDirectory: "ENTERYOURDIRECTORY",
            staffpostDirectory: "ENTERYOURDIRECTORY",
        },
        Webhooks: { Mainlogger: [], Authwebhook: [] },
        Toggle: {
            Mainwebhook: false,
            Authwebhook: false,
            Webhook: false,
            vrcxdata: false,
            isEmbed: false,
            AviStwitch: true,
            TTS: false,
            staffrostertoggle: false,
            WBselfservertoggle: true,
            avilogger: false,
        },
        Userid: {
            discordid: "ENTERYOURDISCORDID"
        }
    };
}

/**
 *
 *
 */
async function setupInitialConfig() {
    const defaultConfig = await getDefaultConfig();
    await saveConfigRecursively(defaultConfig);
}

/**
 *
 *
 * @param {*} defaultConfig
 * @param {*} currentConfig
 * @param {*} existingMap
 * @param {string} [parentKey=""]
 */
async function updateMissingKeys(defaultConfig, currentConfig, existingMap, parentKey = "") {
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
            await updateMissingKeys(defaultValue, currentConfig[key] || {}, existingMap, currentKey);
        } else {
            if (!existingMap.has(currentKey)) {
                await Config.upsert({ keyid: currentKey, value: JSON.stringify(defaultValue) });
            }
        }
    }
}

/**
 *
 *
 * @param {*} defaultConfig
 * @param {*} currentConfig
 */
async function removeUnusedKeys(defaultConfig, currentConfig) {
    const defaultKeys = new Set(flattenKeys(defaultConfig));
    const currentKeys = flattenKeys(currentConfig);
    const toDelete = currentKeys.filter(key => !defaultKeys.has(key));
    await Promise.all(toDelete.map(key => Config.destroy({ where: { keyid: key } })));
}

/**
 *
 *
 * @return {*} 
 */
async function initializeDatabase() {
    const dbExists = await doesDatabaseExist();
    if (!dbExists) {
        console.log("First-time setup: initializing default config.");
        await sequelize.sync();
        await setupInitialConfig();
        return true;
    } else {
        await sequelize.sync({ alter: true });
        const [defaultConfig, currentConfig, configEntries] = await Promise.all([
            getDefaultConfig(),
            loadConfig(),
            Config.findAll()
        ]);
        const configMap = new Set(configEntries.map(e => e.keyid));
        await updateMissingKeys(defaultConfig, currentConfig, configMap);
        await removeUnusedKeys(defaultConfig, currentConfig);
        return false;
    }
}

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
        console.log("Loading screen ready, initializing DB...");
        try {
            const isFirstLaunch = await initializeDatabase();
            console.log("Database init complete, launching main UI...");
            loadMainWindow(isFirstLaunch);
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

module.exports = { log };
