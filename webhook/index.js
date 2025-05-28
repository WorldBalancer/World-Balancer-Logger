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

const { LOGSCLASS } = require("../functions/logsclass.js");
const axios = require("axios");
const { initializeConfig, loadConfig } = require("../Configfiles/configManager.js");

/**
 *
 *
 * @param {*} [token=null]
 * @return {*} 
 */
function getBaseHeaders(token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

/**
 *
 *
 * @param {*} logEntry
 * @param {*} isEmbed
 * @return {*} 
 */
function createPayload(logEntry, isEmbed) {
    return isEmbed
        ? {
            embeds: [
                {
                    title: "VRChat Log",
                    description: logEntry,
                    color: 0x0017ff,
                    timestamp: new Date().toISOString(),
                },
            ],
        }
        : { content: logEntry };
}

/**
 *
 *
 * @param {*} url
 * @param {*} data
 * @param {*} headers
 */
async function postToWebhook(url, data, headers) {
    try {
        await axios.request({
            url,
            method: "POST",
            data,
            headers,
            timeout: 30000,
        });
    } catch (error) {
        if (error.response?.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
            LOGSCLASS.writeErrorToFile(`Error sending to webhook ${url}: ${error.message}`);
        }
    }
}

/**
 *
 *
 * @param {*} logEntry
 */
async function sendToWebhook(logEntry) {


    const config = await loadConfig(); // Load the config
    const isEmbed = config.Toggle.isEmbed;
    const payload = createPayload(logEntry, isEmbed);

    const targets = config.Toggle.Authwebhook
        ? config.Webhooks.Authwebhook.map(({ url, token }) => ({
            url,
            headers: getBaseHeaders(token),
        }))
        : config.Webhooks.Mainlogger.map((url) => ({
            url,
            headers: getBaseHeaders(),
        }));

    for (const { url, headers } of targets) {
        await postToWebhook(url, payload, headers);
    }
}

module.exports = {
    sendToWebhook,
};