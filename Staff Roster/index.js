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
const getConfig = require("../models/getConfig"); // Import the getConfig function
const { LOGSCLASS, StaffROSter } = require("../functions/logsclass");
const main = require("../main");
const { sendToWebhook } = require("../webhook/index");

// Initialize Configuration
async function initializeConfig() {
    const Config = {
        dirstaffroster: {
            staffgetDirectory: await getConfig("dirstaffroster.staffgetDirectory"),
            staffpostDirectory: await getConfig("dirstaffroster.staffpostDirectory"),
        },
        Toggle: {
            staffrostertoggle: await getConfig("Toggle.staffrostertoggle"),
            Webhook: await getConfig("Toggle.Webhook")
        },
    };
    return Config;
}

// Read CSV File
async function readCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("Error reading CSV file:", err);
                reject(err);
                LOGSCLASS.writeErrorToFile(err);
            } else {
                resolve(data);
            }
        });
    });
}

// Write Data to CSV
async function writeDataToCsv(data, filePath) {
    return new Promise((resolve) => {
        const timestamp = new Date().toISOString();
        const csvRow = `${timestamp},${data.join(",")}\n`;
        fs.appendFileSync(filePath, csvRow);
        resolve();
    });
}

// Create FuzzySet from CSV Data
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
async function logStaffEvent(displayName, userId, eventType) {
    const Config = await initializeConfig();
    const customFilePath = Config.dirstaffroster.staffgetDirectory;
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

        StaffROSter.writedataToFile(dataToWrite);

        main.log(
            `Match found! - ${readableTime} staff roster - ${displayName} (${userId}) eventType: ${eventType}`,
            "info",
            "srlog"
        );

        const message = `${formattedLogMessage} staff roster - ${displayName} (${userId}) eventType: ${eventType}`;
        if (Config.Toggle.Webhook === true) {
            sendToWebhook(message);
        }

        await writeDataToCsv(dataToWrite, Config.dirstaffroster.staffpostDirectory);
    } else {
        main.log("No user found in StaffRoster", "info", "srlog");
    }
}

// Event Functions
async function StaffRosterjoin(cleanedString, cleanUser) {
    const Config = await initializeConfig();

    const displayName = cleanedString;
    const userId = cleanUser;

    if (Config.Toggle.staffrostertoggle === true) {
        await logStaffEvent(displayName, userId, "OnPlayerJoined");
    }
}

async function StaffRosterleft(cleanedString, cleanUser) {
    const Config = await initializeConfig();

    const displayName = cleanedString;
    const userId = cleanUser;

    if (Config.Toggle.staffrostertoggle === true) {
        await logStaffEvent(displayName, userId, "OnPlayerLeft");
    }
}

// Export Functions
module.exports = {
    StaffRosterjoin,
    StaffRosterleft,
};
