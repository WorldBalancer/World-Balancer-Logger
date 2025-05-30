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

const fetch = require("node-fetch");
const main = require("../main.js");
const { loadConfig } = require("../Configfiles/configManager.js");

/**
 *
 *
 * @return {*} 
 */
async function vrcxdata() {


    const config = await loadConfig(); // Load the config // Fetch config settings from the database

    if (!config.vrcx || !config.Toggle.vrcxdata) {
        return; // No need to fetch data from vrcx if it's not enabled in the configuration
    }

    const apiUrl = "http://127.0.0.1:22500/vrcx/data/getall";
    const headers = {
        Accept: "application/json",
    };

    try {
        const response = await fetch(apiUrl, { method: "GET", headers });
        if (!response.ok) {
            if (response.status === 404) {
                main.log(
                    "vrcx - Warning is the vrcx running?",
                    "info",
                    "joinleavelog"
                );
                return; // or send a message to the webhook saying the user is not found
            } else {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }
        }

        const vrcxData = await response.json();
        if (vrcxData.error) {
            main.log(
                `vrcx data - ${JSON.stringify(vrcxData, null, 2)}`,
                "info",
                "joinleavelog"
            );
            return;
        }
    } catch (error) {
        console.error(error);
        return;
    }
}

module.exports = {
    vrcxdata,
};