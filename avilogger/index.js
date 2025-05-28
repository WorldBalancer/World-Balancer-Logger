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
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { loadConfig } = require("../Configfiles/configManager.js");

const PROCESSED_FILE = path.join(__dirname, "processedAvatars.json");
const processedAvatars = loadProcessedAvatars();

function loadProcessedAvatars() {
    if (!fs.existsSync(PROCESSED_FILE)) return new Set();

    try {
        const data = fs.readFileSync(PROCESSED_FILE, "utf8");
        const ids = JSON.parse(data);
        return new Set(ids);
    } catch (err) {
        console.error("Failed to load processed avatar IDs:", err);
        return new Set();
    }
}

function saveProcessedAvatars(set) {
    const array = Array.from(set);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(array, null, 2));
}

async function processAvatarid(log, retryCount = 0) {
    const Config = await loadConfig(); // Fetch config settings from the database
    if (Config.Toggle.avilogger === true) return;

    const MAX_RETRIES = 2;
    const RATE_LIMIT_DELAY = 60000;
    const ENDPOINT = `https://avatar.worldbalancer.com/v5/vrchat/avatars/htfdcel/store/putavatarExternal`;

    const discordId = Config.Userid.discordid;
    if (!discordId) throw new Error("Discord ID not configured");

    const avatarIdMatch = log.match(/avtr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!avatarIdMatch) {
        console.log("No valid avatar ID found in the log.");
        return;
    }

    const fullAvatarId = avatarIdMatch[0];

    if (processedAvatars.has(fullAvatarId)) {
        console.log(`Skipping duplicate avatar ID: ${fullAvatarId}`);
        return;
    }

    const postData = { id: fullAvatarId, userid: discordId };

    try {
        const response = await axios.post(ENDPOINT, postData, {
            headers: {
                "Content-Type": "application/json",
            }
        });

        const responseData = response.data;

        processedAvatars.add(fullAvatarId);
        saveProcessedAvatars(processedAvatars);

        const result = {
            success: true,
            avatarId: fullAvatarId,
            discordId,
            apiResponse: responseData,
            retries: retryCount,
        };

        console.log(`Avatar ID: ${result.avatarId} API Response: ${JSON.stringify(result.apiResponse)}`);
        return result;

    } catch (error) {
        console.error("POST failed:", error.message);

        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying in ${RATE_LIMIT_DELAY / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            return processAvatarid(log, retryCount + 1);
        }

        throw error;
    }
}

module.exports = processAvatarid;