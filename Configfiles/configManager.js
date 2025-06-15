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

const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const pkgjn = require("../package.json"); // Adjust path if needed

// Define config path
const configFilePath = path.join(
    os.platform() === "win32"
        ? path.join(os.homedir(), "AppData", "Roaming", pkgjn.name, "localconfig")
        : path.join(os.homedir(), `.${pkgjn.name.toLowerCase()}`, "localconfig"),
    "config.json"
);

// Ensure directory exists
/**
 *
 *
 */
async function ensureConfigDir() {
    const dir = path.dirname(configFilePath);
    await fs.mkdir(dir, { recursive: true });
}

// Default config
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

// Helpers
/**
 *
 *
 * @return {*} 
 */
async function configExists() {
    try {
        await fs.access(configFilePath);
        return true;
    } catch {
        return false;
    }
}

/**
 *
 *
 * @return {*} 
 */
async function loadConfig() {
    try {
        const data = await fs.readFile(configFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

/**
 *
 *
 * @param {*} config
 */
async function saveConfig(config) {
    await ensureConfigDir();
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 4));
}

// Flatten nested object keys
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

// Nested key access
/**
 *
 *
 * @param {*} obj
 * @param {*} path
 * @return {*} 
 */
function getValueByPath(obj, path) {
    return path.split(".").reduce((o, k) => (o || {})[k], obj);
}

/**
 *
 *
 * @param {*} obj
 * @param {*} path
 * @param {*} value
 */
function setValueByPath(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    keys.slice(0, -1).forEach(k => {
        if (!current[k]) current[k] = {};
        current = current[k];
    });
    current[keys[keys.length - 1]] = value;
}

// Only add new keys, and remove old ones
/**
 *
 *
 * @return {*} 
 */
async function initializeConfig() {
    const exists = await configExists();
    const defaultConfig = await getDefaultConfig();

    if (!exists) {
        await saveConfig(defaultConfig);
        return true;
    }

    const currentConfig = await loadConfig();
    const defaultKeys = flattenKeys(defaultConfig);

    // Add missing keys
    for (const key of defaultKeys) {
        if (getValueByPath(currentConfig, key) === undefined) {
            const defaultValue = getValueByPath(defaultConfig, key);
            setValueByPath(currentConfig, key, defaultValue);
        }
    }

    // Remove unknown keys
    const currentKeys = flattenKeys(currentConfig);
    for (const key of currentKeys) {
        if (!defaultKeys.includes(key)) {
            setValueByPath(currentConfig, key);
        }
    }

    await saveConfig(currentConfig);
    return false;
}

module.exports = {
    loadConfig,
    saveConfig,
    initializeConfig
};
