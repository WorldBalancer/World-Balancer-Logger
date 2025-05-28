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
const { loadConfig } = require("../Configfiles/configManager.js");
const main = require("../main.js");

const ENDPOINT = "https://avatar.worldbalancer.com/v1/vrchat/avatars/store/putavatarEx";

/**
 * Processes a single avatar log line (only once per avatar)
 * @param {string} log
 * @returns {Promise<object|undefined>}
 */
async function processAvatarid(log) {
    const Config = await loadConfig();
    if (Config?.Toggle?.avilogger === false) return;

    const discordId = Config?.Userid?.discordid;
    if (!discordId) return;

    const avatarIdMatch = log.match(/avtr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!avatarIdMatch) return;

    const avatarId = avatarIdMatch[0];

    const payload = { id: avatarId, userid: discordId };

    try {
        const response = await axios.post(ENDPOINT, payload, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "World Balancer/2.0.0 contact@worldbalancer.com"
            },
        });

        return {
            success: true,
            avatarId,
            discordId,
            apiResponse: response.data,
        };

    } catch (error) {
        if (error.response) {
            main.log(
                `API Error Response: ${JSON.stringify(error.response.data)}`,
                "error",
                "main"
            );
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