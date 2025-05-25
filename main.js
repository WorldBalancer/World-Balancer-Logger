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
const sequelize = require("./models/configsqlite");
const Config = require("./models/Config");
const getConfig = require("./models/getConfig");
const { version, name: appName } = require("./package.json");

const isWindows = process.platform === "win32";

// IPC: Get user data path
ipcMain.handle("get-user-data-path", () => app.getPath("userData"));

// Determine SQLite database path
function getDatabasePath() {
    const baseDir = isWindows
        ? path.join(process.env.APPDATA || "", appName, "config")
        : path.join(os.homedir(), `.${appName}`, "config");
    return path.join(baseDir, "config.sqlite");
}

// Check if database file exists
async function doesDatabaseExist() {
    const dbPath = getDatabasePath();
    try {
        await fs.access(dbPath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// Recursively save config
async function saveConfigRecursively(obj, parentKey = "") {
    for (const [key, value] of Object.entries(obj)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            await saveConfigRecursively(value, currentKey);
        } else {
            await Config.upsert({ keyid: currentKey, value: JSON.stringify(value) });
        }
    }
}

// Load full config from DB and rebuild nested object
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

// Flatten nested object keys (dot notation)
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

// Default config structure
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
        },
    };
}

// Save default config on first launch
async function setupInitialConfig() {
    const defaultConfig = await getDefaultConfig();
    await saveConfigRecursively(defaultConfig);
}

// Update config with missing keys
async function updateMissingKeys(defaultConfig, currentConfig, parentKey = "") {
    for (const [key, defaultValue] of Object.entries(defaultConfig)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
            await updateMissingKeys(defaultValue, currentConfig[key] || {}, currentKey);
        } else {
            const existingValue = await getConfig(currentKey);
            if (existingValue === null) {
                console.log(`Adding missing key: ${currentKey}`);
                await Config.upsert({ keyid: currentKey, value: JSON.stringify(defaultValue) });
            }
        }
    }
}

// Remove unused config keys
async function removeUnusedKeys() {
    const currentConfig = await loadConfig();
    const defaultConfig = await getDefaultConfig();
    const defaultKeys = new Set(flattenKeys(defaultConfig));
    const currentKeys = flattenKeys(currentConfig);

    for (const key of currentKeys) {
        if (!defaultKeys.has(key)) {
            console.log(`Removing unused key: ${key}`);
            await Config.destroy({ where: { keyid: key } });
        }
    }
}

// Ensure config is updated
async function migrateConfig() {
    const currentConfig = await loadConfig();
    const defaultConfig = await getDefaultConfig();
    await updateMissingKeys(defaultConfig, currentConfig);
    await removeUnusedKeys();
}

// Full DB initialization logic
async function initializeDatabase() {
    try {
        const dbExists = await doesDatabaseExist();
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        if (!dbExists) {
            console.log("Creating new config...");
            await setupInitialConfig();
        } else {
            console.log("Migrating existing config...");
            await migrateConfig();
        }
    } catch (error) {
        console.error("initializeDatabase():", error);
    }
}

// Electron window creation
function createWindow(callback) {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.loadFile(path.join(__dirname, "index.html"));
    win.webContents.once("did-finish-load", () => {
        win.webContents.send("app-version", version);
        callback(win);
    });
}

// Buffered logging
let logQueue = [];
function log(message, level = "info", type = "mainlog") {
    const windows = BrowserWindow.getAllWindows();
    const logData = {
        type,
        message: `${message}`,
        level
    };

    if (windows.length > 0) {
        windows[0].webContents.executeJavaScript(`
            window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(logData)} }));
        `);
    } else {
        logQueue.push(logData);
    }
}

// IPC Handlers
ipcMain.handle("load-config", loadConfig);
ipcMain.handle("save-config", async (_, config) => saveConfigRecursively(config));
ipcMain.handle("get-app-version", () => version);

// App lifecycle
app.on("ready", async () => {
    await initializeDatabase();
    createWindow(win => {
        logQueue.forEach(entry => log(entry.message, entry.level, entry.type));
        logQueue = [];
    });
});

app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await initializeDatabase();
        createWindow(win => {
            logQueue.forEach(entry => log(entry.message, entry.level, entry.type));
            logQueue = [];
        });
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

module.exports = { log };
