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
const os = require("os");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { loadConfig } = require("../Configfiles/configManager.js");
const main = require("../main.js");
const pkgjn = require("../package.json");

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

const ENDPOINT = "https://avatar.worldbalancer.com/v1/vrchat/avatars/store/putavatarEx";

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


// Save current set of avatar IDs
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
        main.log(`Failed to save processedAvatars.json: ${err.message}`, "error", "mainlog");
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

    try {
        const data = await fsp.readFile(filePath, "utf8");

        const discordId = Config?.Userid?.discordid;
        if (!discordId) {
            main.log("Discord ID not found in config.", "info", "mainlog");
            return;
        }

        const avatarIdMatches = data.match(/avtr_[\w-]+/g);
        if (!avatarIdMatches || avatarIdMatches.length === 0) return;

        // 🔧 Deduplicate avatar IDs from file
        const uniqueAvatars = [...new Set(avatarIdMatches)];

        let updated = false;

        for (const avatarId of uniqueAvatars) {
            if (processedAvatars.has(avatarId)) continue;

            const payload = {
                id: avatarId,
                userid: discordId
            };

            try {
                const response = await axios.post(ENDPOINT, payload, {
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "World Balancer/2.0.4 contact@worldbalancer.com"
                    },
                    timeout: 5000
                });

                if (response.status === 200) {
                    processedAvatars.add(avatarId);
                    updated = true;
                    main.log(`Avatar ID ${avatarId} sent successfully.`, "info", "mainlog");
                } else {
                    main.log(`Unexpected API status ${response.status} for ${avatarId}`, "info", "mainlog");
                }

            } catch (error) {
                if (error.response) {
                    main.log(`API Error (${error.response.status}) for ${avatarId}: ${JSON.stringify(error.response.data)}`, "error", "mainlog");
                } else {
                    main.log(`Request Failed for ${avatarId}: ${error.message}`, "error", "mainlog");
                }
            }
        }

        if (updated) {
            saveProcessedAvatars(processedAvatars);
        }

    } catch (err) {
        main.log(`Failed to read amplitude.cache: ${err.message}`, "error", "mainlog");
    }
}

module.exports = extractAndSendNewAvatarIDs;
