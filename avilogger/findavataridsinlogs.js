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

const fs = require('fs');
const path = require('path');
const os = require('os');
const pkgjn = require("../package.json");
const processAvatarid = require("./index.js");

// Log directory
const LOG_DIR = path.join(os.homedir(), 'AppData', 'LocalLow', 'VRChat', 'VRChat');

// Avatar ID regex
const AVTR_REGEX = /avtr_\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g;

// Processed avatars file location
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
        console.log(`Failed to load processedAvatars.json: ${err.message}`);
        return new Set();
    }
}

const processedAvatars = loadProcessedAvatars();

/**
 *
 *
 */
async function findAvatarIdsInLogs() {
    const foundIds = new Set();

    try {
        const files = await fs.promises.readdir(LOG_DIR);

        for (const file of files) {
            if (!file.endsWith('.log') && !file.endsWith('.txt') && !file.endsWith('.json')) continue;

            const filePath = path.join(LOG_DIR, file);
            const content = await fs.promises.readFile(filePath, 'utf8');

            const matches = content.match(AVTR_REGEX);
            if (matches) {
                matches.forEach(avatarIds => {
                    if (!foundIds.has(avatarIds)) {
                        foundIds.add(avatarIds);
                    }
                });
            }
        }

        for (const avatarIds of foundIds) {
            if (processedAvatars.has(avatarIds)) {
                continue;
            }
            processAvatarid(avatarIds)

        }

    } catch (err) {
        console.error("Error reading log files:", err);
    }
}

module.exports = findAvatarIdsInLogs;
