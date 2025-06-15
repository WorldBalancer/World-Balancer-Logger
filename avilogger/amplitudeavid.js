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

const os = require("os");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { loadConfig } = require("../Configfiles/configManager.js");
const main = require("../main.js");
const pkgjn = require("../package.json");
const processAvatarid = require("./index.js");

// Path to amplitude.cache (Temp\VRChat\VRChat)
const filePath = path.join(
    os.homedir(),
    "AppData",
    "Local",
    "Temp",
    "VRChat",
    "VRChat",
    "amplitude.cache"
);

// Path to store processed avatars (AppData/Roaming or ~/.appname)
const configDir = os.platform() === "win32"
    ? path.join(os.homedir(), "AppData", "Roaming", pkgjn.name, "localconfig")
    : path.join(os.homedir(), `.${pkgjn.name.toLowerCase()}`, "localconfig");

const PROCESSED_FILE = path.join(configDir, "processedAvatars.json");


// Load previously processed avatar IDs
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
        main.log(`Failed to load processedAvatars.json: ${err.message}`, "info", "mainlog");
        return new Set();
    }
}

const processedAvatars = loadProcessedAvatars();

/**
 *
 *
 * @return {*} 
 */
async function extractAndSendNewAvatarIDs() {
    const Config = await loadConfig();

    // Load user ID from config
    const discordId = Config?.Userid?.discordid;
    if (!discordId) {
        main.log("Discord ID not found in config.", "info", "mainlog");
        return;
    }

    try {
        const data = await fsp.readFile(filePath, "utf8");
        const avatarIdMatches = data.match(/avtr_[\w-]+/g);
        if (!avatarIdMatches || avatarIdMatches.length === 0) {
            return;
        }

        // Deduplicate avatar IDs
        const uniqueIds = new Set(avatarIdMatches);

        for (const avatarIds of uniqueIds) {
            // Skip if already processed
            if (processedAvatars.has(avatarIds)) {
                continue;
            }

            try {
                processAvatarid(avatarIds)
            } catch (error) {
                main.log(`${error.message}`, "error", "mainlog");
            }
        }


    } catch (err) {
        main.log(`Failed to read amplitude.cache: ${err.message}`, "error", "mainlog");
    }
}

module.exports = extractAndSendNewAvatarIDs;
