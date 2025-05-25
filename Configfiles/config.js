/*
MIT License

Copyright (c) 2025 World Balancer
Permission is hereby granted, free of charge...
*/

const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const Config = require("../models/Config");
const { LOGSCLASS } = require("../functions/logsclass.js");

// Get user-specific app path
const appInstallPath = app.getPath("userData");
const logDir = path.join(appInstallPath, "log");
const configDir = path.join(appInstallPath, "config");

/**
 * Ensure the target directory exists.
 * @param {string} dirPath
 */
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Ensure necessary folders exist
ensureDirectory(logDir);
ensureDirectory(configDir);

/**
 * Fetch all configs from the database and parse them.
 * @returns {Promise<Object>}
 */
async function fetchConfig() {
    try {
        const configs = await Config.findAll();
        const result = {};

        for (const config of configs) {
            const { keyid, value } = config;
            try {
                result[keyid] = JSON.parse(value);
            } catch {
                // Fallback to raw value if parsing fails
                console.warn(`[Config Warning] Failed to parse key "${keyid}". Using raw value.`);
                result[keyid] = value;
            }
        }

        return result;
    } catch (err) {
        const msg = `Error fetching config: ${err.message}`;
        console.error(msg);
        await LOGSCLASS.writeErrorToFile(msg);
        throw err;
    }
}

/**
 * Main entry to initialize configuration.
 * @returns {Promise<{ config: Object }>}
 */
async function initializeConfigAndUser() {
    const config = await fetchConfig();
    return { config };
}

module.exports = {
    initializeConfigAndUser,
    configdir: configDir,
    logpath: logDir,
};