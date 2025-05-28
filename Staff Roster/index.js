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
const FuzzySet = require("fuzzyset");
const { loadConfig } = require("../Configfiles/configManager.js");
const main = require("../main.js");
const { sendToWebhook } = require("../webhook/index.js");

// Read CSV File
/**
 *
 *
 * @param {*} filePath
 * @return {*} 
 */
async function readCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("Error reading CSV file:", err);
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

// Write Data to CSV
/**
 *
 *
 * @param {*} data
 * @param {*} filePath
 * @return {*} 
 */
async function writeDataToCsv(data, filePath) {
    return new Promise((resolve) => {
        const timestamp = new Date().toISOString();
        const csvRow = `${timestamp},${data.join(",")}\n`;
        fs.appendFileSync(filePath, csvRow);
        resolve();
    });
}

// Create FuzzySet from CSV Data
/**
 *
 *
 * @param {*} filePath
 * @return {*} 
 */
async function getFuzzySet(filePath) {
    const csvData = await readCsvFile(filePath);

    const ids = csvData
        .split("\n")
        .map((row) => row.split(",")[2]?.trim()) // Extract the 3rd column (User ID)
        .filter(Boolean); // Remove undefined/null values

    const useridFuzzySet = new FuzzySet();
    ids.forEach((id) => {
        useridFuzzySet.add(id);
    });

    return useridFuzzySet;
}

// Log Staff Event
/**
 *
 *
 * @param {*} displayName
 * @param {*} userId
 * @param {*} eventType
 */
async function logStaffEvent(displayName, userId, eventType) {
    

const config = await loadConfig(); // Load the config
    const customFilePath = config.dirstaffroster.staffgetDirectory;
    const useridFuzzySet = await getFuzzySet(customFilePath);
    const result = useridFuzzySet.get(String(userId), null, 0.8); // Lowered threshold


    if (result) {
        const timestamp = Math.round(Date.now() / 1000);
        const formattedLogMessage = `<t:${timestamp}:f>`;
        const readableTime = new Date(timestamp * 1000).toLocaleString(); // Uses user's local timezone

        const dataToWrite = [
            `${result[0][1]}`, // Matched user ID
            eventType,
            formattedLogMessage,
            displayName,
        ];

        main.log(
            `Match found! - ${readableTime} staff roster - ${displayName} (${userId}) eventType: ${eventType}`,
            "info",
            "srlog"
        );

        const message = `${formattedLogMessage} staff roster - ${displayName} (${userId}) eventType: ${eventType}`;
        if (config.Toggle.Webhook === true) {
            sendToWebhook(message);
        }

        await writeDataToCsv(dataToWrite, config.dirstaffroster.staffpostDirectory);
    } else {
        main.log("No user found in StaffRoster", "info", "srlog");
    }
}

// Event Functions
/**
 *
 *
 * @param {*} cleanedString
 * @param {*} cleanUser
 */
async function StaffRosterjoin(cleanedString, cleanUser) {
    

const config = await loadConfig(); // Load the config

    const displayName = cleanedString;
    const userId = cleanUser;

    if (config.Toggle.staffrostertoggle === true) {
        await logStaffEvent(displayName, userId, "OnPlayerJoined");
    }
}

/**
 *
 *
 * @param {*} cleanedString
 * @param {*} cleanUser
 */
async function StaffRosterleft(cleanedString, cleanUser) {
    

const config = await loadConfig(); // Load the config

    const displayName = cleanedString;
    const userId = cleanUser;

    if (config.Toggle.staffrostertoggle === true) {
        await logStaffEvent(displayName, userId, "OnPlayerLeft");
    }
}

// Export Functions
module.exports = {
    StaffRosterjoin,
    StaffRosterleft,
};
