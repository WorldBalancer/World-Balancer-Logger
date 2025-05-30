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

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { loadConfig } = require("../Configfiles/configManager.js");
const main = require("../main.js");
const pkgjn = require("../package.json");

const ENDPOINT = "https://avatar.worldbalancer.com/v1/vrchat/avatars/store/putavatarEx";

// Determine path to local config directory and processedAvatars.json
const configDir = os.platform() === "win32"
    ? path.join(os.homedir(), "AppData", "Roaming", pkgjn.name, "localconfig")
    : path.join(os.homedir(), `.${pkgjn.name.toLowerCase()}`, "localconfig");

const PROCESSED_FILE = path.join(configDir, "processedAvatars.json");

// Load processed avatars from file
/**
 *
 *
 * @return {*} 
 */
function loadProcessedAvatars() {
    if (!fs.existsSync(PROCESSED_FILE)) return new Set();
    try {
        const data = fs.readFileSync(PROCESSED_FILE, "utf8");
        const ids = JSON.parse(data);
        return new Set(Array.isArray(ids) ? ids : []);
    } catch (err) {
        main.log(`Failed to load processedAvatars.json: ${err.message}`, "warn", "main");
        return new Set();
    }
}

// Save processed avatars to file
/**
 *
 *
 * @param {*} set
 */
function saveProcessedAvatars(set) {
    try {
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(PROCESSED_FILE, JSON.stringify(Array.from(set), null, 2));
    } catch (err) {
        main.log(`Failed to save processedAvatars.json: ${err.message}`, "error", "main");
    }
}

const processedAvatars = loadProcessedAvatars();

/**
 * Processes a single avatar log line (only once per avatar)
 * @param {string} log
 * @returns {Promise<object|undefined>}
 */
async function processAvatarid(log) {
    const Config = await loadConfig();
    if (Config?.Toggle?.avilogger === false) return;

    const discordId = Config?.Userid?.discordid;
    if (!discordId) {
        main.log("Discord ID not found in config.", "warn", "main");
        return;
    }

    const avatarIdMatch = log.match(/avtr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!avatarIdMatch) return;

    const avatarId = avatarIdMatch[0];

    if (processedAvatars.has(avatarId)) {
        return;
    }

    const payload = { id: avatarId, userid: discordId };

    try {
        const response = await axios.post(ENDPOINT, payload, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "World Balancer/2.0.1 contact@worldbalancer.com"
            },
            timeout: 5000
        });

        if (response.status === 200) {

            processedAvatars.add(avatarId);
            saveProcessedAvatars(processedAvatars);
        } else {
            main.log(`Unexpected API status ${response.status} for ${avatarId}`, "warn", "main");
        }

        return {
            success: true,
            avatarId,
            discordId,
            apiResponse: response.data,
        };

    } catch (error) {
        if (error.response) {
            main.log(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`, "error", "main");
        } else {
            main.log(`Request Failed: ${error.message}`, "error", "main");
        }

        return {
            success: false,
            avatarId,
            discordId,
            error: error.message,
        };
    }
}

module.exports = processAvatarid;