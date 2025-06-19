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
const main = require("./main");
const { loadConfig } = require("./Configfiles/configManager.js");

// self server worldid, instanceid, instanceInfo
const {
    startServer,
    updateInstanceInfo,
} = require("./website.js")

// webhook send data it
const { sendToWebhook } = require("./webhook/index.js");

// player counter
const { resetCounter, updateCounter } = require("./playercounter/index.js");

// staff rosters
const { StaffRosterjoin, StaffRosterleft } = require("./Staff Roster/index.js")

const { vrcxdata } = require("./vrcx/vrcxdata.js");

const { getDeviceVoices, SayDeviceVoices } = require("./functions/TTS.js");

const extractAndSendNewAvatarIDs = require("./avilogger/amplitudeavid.js");

// Wrap in an IIFE (Immediately Invoked Function Expression) to use await at the top level
(async () => {
    const Config = await loadConfig(); // Fetch config settings from the database

    if (Config.Toggle.WBselfservertoggle === true) {
        startServer()
    }

})().catch((error) => {
    console.error("Error initializing config:", error);
});

// Timer configuration
const TIMER_INTERVAL = 1000; // 1 second
const exavartarids = extractAndSendNewAvatarIDs

// Create a timer to call FetchLists every 20 minutes
let exavartaridshIntervalTimer;

// Initial setup for the timer
/**
 *
 *
 * @return {*} 
 */
async function initializeTimer() {
    const Config = await loadConfig(); // Fetch config settings from the database
    try {
        if (exavartaridshIntervalTimer) {
            clearInterval(exavartaridshIntervalTimer);
        }

        exavartaridshIntervalTimer = setInterval(async () => {
            if (Config.Toggle.avilogger === true) {
                await exavartarids();
            }
        }, TIMER_INTERVAL);

        // Clean up the timer when it's no longer needed
        return () => {
            clearInterval(exavartaridshIntervalTimer);
        };
    } catch (error) {
        console.error(`Error initializing timer: ${error}`)
    }
}

let currentLogFile = null;
let lastReadPosition = 0;

/**
 * Checks for the newest log file in the configured directory.
 * Switches to it if it's different from the currently loaded one.
 */

/**
 *
 *
 * @return {*} 
 */
async function checkForNewFiles() {
    try {
        const Config = await loadConfig();
        const logDirectory = Config.Directories?.LogDirectory;

        if (!logDirectory) {
            const msg = 'Log directory path is missing or null.';
            main.log(msg, "error", "mainlog");
            return;
        }

        const logFileNames = await fs.promises.readdir(logDirectory);
        const newLogFileNames = logFileNames.filter(name =>
            name?.startsWith("output_log")
        ).sort();

        if (newLogFileNames.length === 0) return;

        const latestLogFile = path.join(logDirectory, newLogFileNames.at(-1));

        if (latestLogFile !== currentLogFile) {
            currentLogFile = latestLogFile;
            lastReadPosition = 0;
            main.log(`Switching to new log file: ${currentLogFile}`, "info", "mainlog");
        }
    } catch (err) {
        main.log(`Failed to check for new files: ${err.message}`, "error", "mainlog");
    }
}

/**
 * Reads new log lines from the current log file.
 * 
 * @param {string} currentLogFile - Path to the log file.
 * @param {number} lastReadPosition - Last byte read from the file.
 * @returns {Promise<[string[], number]>} - New log lines and updated read position.
 */
async function readNewLogs(currentLogFile, lastReadPosition) {
    try {
        await fs.promises.access(currentLogFile, fs.constants.R_OK);
        const { size } = await fs.promises.stat(currentLogFile);

        if (size <= lastReadPosition) {
            return [[], lastReadPosition];
        }

        const stream = fs.createReadStream(currentLogFile, {
            encoding: 'utf8',
            start: lastReadPosition,
            end: size - 1,
        });

        let newData = '';
        for await (const chunk of stream) {
            newData += chunk;
        }

        const newLogs = newData.split('\n').filter(Boolean);

        return [newLogs, size];
    } catch (err) {
        main.log(`Error reading log file: ${err.message}`, "error", "mainlog");
        return [[], lastReadPosition];
    }
}

/**
 *
 *
 */
async function monitorAndSend() {
    const Config = await loadConfig(); // Fetch config settings from the database
    while (true) {
        try {
            // Check for new files in each loop iteration
            await checkForNewFiles();
            if (currentLogFile) {
                const { size: currentSize } = await fs.promises.stat(currentLogFile);
                if (currentSize > lastReadPosition) {
                    const [newLogs, newLastReadPosition] = await readNewLogs(
                        currentLogFile,
                        lastReadPosition
                    );

                    lastReadPosition = newLastReadPosition;

                    for (const log of newLogs) {
                        // Check log length before processing
                        if (log.length > 10000) { // Adjust the limit as necessary
                            main.log(`Log entry too long, skipping: ${log.length} only dev test`, "warn", "mainlog");
                            continue; // Skip processing this log entry
                        }
                        if (log.includes("Joining or Creating Room")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Behaviour]"), 1);

                            resetCounter("player");

                            if (Config.Toggle.vrcxdata === true) {
                                vrcxdata();
                            }

                            main.log(
                                `vrchat log - ${logParts.join(" ")}`,
                                "info",
                                "joinleavelog"
                            );
                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(logParts.join(" "));
                            }
                        } else if (log.includes("[Always] Instance closed:")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Always]"), 1);

                            const timestamp = Date.now() / 1000;
                            formattedLogMessage = `<t:${Math.round(
                                timestamp
                            )}:f> ${logParts.join(" ")}`;

                            main.log(
                                logParts.join(" "),
                                "info",
                                "joinleavelog"
                            );

                        } else if (log.includes("[ModerationManager]")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");

                            const timestamp = Date.now() / 1000;
                            formattedLogMessage = `<t:${Math.round(
                                timestamp
                            )}:f> ${logParts.join(" ")}`;

                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(logParts.join(" "));
                            }

                            main.log(logParts.join(" "), "info", "modlog");

                            const matchResult = logParts
                                .join(" ")
                                .match(
                                    /A vote kick has been initiated against [^,]+/
                                );
                            if (matchResult) {
                                if (Config.Toggle.TTS === true) {
                                    getDeviceVoices().then((list11) => {
                                        SayDeviceVoices(
                                            `${matchResult[0]}`,
                                            list11[0]
                                        );
                                    });
                                }
                            }

                            const logString = logParts.join(" ");

                            // Use regex to extract the username
                            const usernamekick = logString.match(/([\w~]+) has been kicked/);
                            if (usernamekick) {
                                const username = usernamekick[1]; // The username is captured in the first group

                                const timestamp = Date.now() / 1000;
                                formattedLogMessage = `<t:${Math.round(
                                    timestamp
                                )}:f> ${username} has been kicked`;

                                main.log(formattedLogMessage, "info", "modlog");
                            }

                            // Use regex to extract the username (supports names with or without ~)
                            const usernamewarn = logString.match(/([\w~]+) has been warned/);

                            if (usernamewarn) {
                                const username = usernamewarn[1]; // Corrected index to capture the username

                                const timestamp = Math.round(Date.now() / 1000);
                                const formattedLogMessage = `<t:${timestamp}:f> ${username} has been warned`;

                                main.log(formattedLogMessage, "info", "modlog");
                            }

                            const usernamemicoff = logString.match(/Microphone has been turned off for (\S+)/);
                            if (usernamemicoff) {
                                const username = usernamemicoff[0]; // Extracted username

                                const timestamp = Date.now() / 1000;
                                formattedLogMessage = `<t:${Math.round(
                                    timestamp
                                )}:f> ${username} Microphone has been turned off for`;

                                main.log(formattedLogMessage, "info", "modlog");

                            }

                        } else if (log.includes("[Behaviour] OnPlayerJoined")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Behaviour]"), 1);

                            const userIdPattern = /\(usr_[\w-]+\)/; // Pattern to match user ID
                            const userIdIndex = logParts.findIndex(part => userIdPattern.test(part));

                            let displayName = null; // Declare displayName once

                            // Check if logParts has enough elements
                            if (logParts && logParts.length > 5) {
                                // Extract display name based on the userIdIndex
                                if (userIdIndex > 5) { // Ensure there are enough parts before the user ID
                                    displayName = logParts.slice(5, userIdIndex).join(" ").trim(); // Extract display name
                                } else if (userIdIndex === 5) {
                                    displayName = logParts.slice(5, userIdIndex).join(" ").trim(); // Handle case where display name is just before user ID
                                } else {
                                    displayName = logParts.slice(5).join(" ").trim(); // Fallback if userIdIndex is not found
                                }
                            }

                            const cleanedString = displayName || ""; // Default to empty string if null

                            const userid = userIdIndex >= 0 ? logParts[userIdIndex] : null; // Get user ID from logParts
                            const cleanUser = userid ? userid.replace(/[()]/g, "") : null; // Clean user ID

                            StaffRosterjoin(cleanedString, cleanUser);

                            const timestamp = Date.now() / 1000;
                            formattedLogMessage = `<t:${Math.round(
                                timestamp
                            )}:f> ${logParts.join(" ")}`;

                            const message = `<t:${Math.round(
                                timestamp
                            )}:f> VRChat Log - OnPlayerJoined ${cleanedString} ${cleanUser} `;

                            const notimestampmessage = `VRChat Log - OnPlayerJoined ${cleanedString} ${cleanUser} `;

                            main.log(
                                notimestampmessage,
                                "info",
                                "joinleavelog"
                            );
                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(message);
                            }
                        } else if (log.includes("[Behaviour] OnPlayerLeft")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Behaviour]"), 1);
                            const userIdPattern = /\(usr_[\w-]+\)/; // Pattern to match user ID
                            const userIdIndex = logParts.findIndex(part => userIdPattern.test(part));

                            let displayName = null; // Declare displayName once
                            let userid = null; // Declare userid once

                            // Check if logParts has enough elements
                            if (logParts && logParts.length > 5) {
                                // Extract display name based on the userIdIndex
                                if (userIdIndex > 5) { // Ensure there are enough parts before the user ID
                                    displayName = logParts.slice(5, userIdIndex).join(" ").trim(); // Extract display name
                                } else if (userIdIndex === 5) {
                                    displayName = logParts.slice(5, userIdIndex).join(" ").trim(); // This will be empty
                                } else {
                                    displayName = logParts.slice(5).join(" ").trim(); // Fallback if userIdIndex is not found
                                }
                            }

                            // If userIdIndex is found, get the user ID
                            if (userIdIndex >= 0) {
                                userid = logParts[userIdIndex]; // Get user ID from logParts
                            }

                            const cleanUser = userid ? userid.replace(/[()]/g, "") : "usr_88b4166c-cc39-4636-aed9-b4bb294ed90c"; // Clean user ID or default to "unknown"
                            const cleanedString = displayName || "unknown"; // Default to "unknown" if null

                            StaffRosterleft(cleanedString, cleanUser);

                            const timestamp = Date.now() / 1000;

                            const message = `<t:${Math.round(timestamp)}:f> VRChat Log - OnPlayerLeft ${cleanedString} ${cleanUser}`;
                            const notimestampmessage = `VRChat Log - OnPlayerLeft ${cleanedString} ${cleanUser}`;

                            main.log(notimestampmessage, "info", "joinleavelog");
                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(message);
                            }
                        } else if (log.includes("[Behaviour] Destroying")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Behaviour]"), 1);


                            updateCounter("player", "left");

                            const timestamp = Date.now() / 1000;
                            formattedLogMessage = `<t:${Math.round(
                                timestamp
                            )}:f> ${logParts.join(" ")}`;

                        } else if (log.includes("[Behaviour] Initialized player")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf("[Behaviour]"), 1);

                            updateCounter("player", "join");

                            const timestamp = Date.now() / 1000;
                            formattedLogMessage = `<t:${Math.round(
                                timestamp
                            )}:f> ${logParts.join(" ")}`;

                        } else if (log.includes("USharpVideo")) {
                            // Clean out the long 'resolved to' URL if present
                            const cleanedLog = log.replace(/resolved to\s+['"]https?:\/\/[^\s'"]+['"]/, "resolved to");

                            const logParts = cleanedLog
                                .split(" ")
                                .filter((part) => part !== "");

                            main.log(logParts.join(" "), "info", "modlog");
                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(logParts.join(" "));
                            }
                        } else if (log.includes("Video Playback")) {
                            // Clean out the long 'resolved to' URL if present
                            const cleanedLog = log.replace(/resolved to\s+['"]https?:\/\/[^\s'"]+['"]/, "resolved to");

                            const logParts = cleanedLog
                                .split(" ")
                                .filter((part) => part !== "");

                            main.log(logParts.join(" "), "info", "modlog");

                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(logParts.join(" "));
                            }
                        } else if (
                            log.includes(
                                "[Behaviour] Received executive message: You have been kicked from the instance"
                            )
                        ) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            main.log(
                                logParts.join(" "),
                                "info",
                                "joinleavelog"
                            );
                            if (Config.Toggle.Webhook === true) {
                                sendToWebhook(logParts.join(" "));
                            }
                        } else if (log.includes("Switching ")) {
                            const logParts = log
                                .split(" ")
                                .filter((part) => part !== "");
                            logParts.splice(logParts.indexOf(""), 1);

                            const matchResult = logParts
                                .join(" ")
                                .match(/avatar (.*)/);
                            const matchResult2 = logParts
                                .join(" ")
                                .match(/Switching (.*?) to/);

                            if (matchResult && matchResult2) {
                                const avatarneedName = matchResult[1];
                                const username = matchResult2[1];

                                const timestamp = Date.now() / 1000;
                                formattedLogMessage = `<t:${Math.round(
                                    timestamp
                                )}:f> vrchat log - user ${username} switching to ${avatarneedName}`;

                                if (Config.Toggle.Webhook === true) {
                                    sendToWebhook(formattedLogMessage);
                                }
                                if (Config.Toggle.AviStwitch === true) {
                                    main.log(
                                        `vrchat log - user ${username} switching to ${avatarneedName}`,
                                        "info",
                                        "vrchatswitchavilog"
                                    );
                                }
                            } else {
                                main.log(
                                    "Invalid log format or missing data",
                                    "warn",
                                    "vrchatswitchavilog"
                                );
                            }
                        } else if (
                            log.includes("[Behaviour] Destination set: ")
                        ) {
                            try {
                                const logParts = log
                                    .split(" ")
                                    .filter((part) => part !== "");
                                logParts.splice(
                                    logParts.indexOf("[Behaviour]"),
                                    1
                                );

                                const destinationPart = logParts.find((part) =>
                                    part.startsWith("wrld_")
                                );

                                if (destinationPart) {
                                    const subparts = destinationPart.split(":");
                                    if (subparts.length > 1) {
                                        const worldId = subparts[0].trim(); // Trim any leading or trailing whitespaces
                                        const instanceInfo = subparts[1].trim();

                                        // Remove the query parameters from instanceInfo
                                        const queryIndex =
                                            instanceInfo.indexOf("?");
                                        if (queryIndex !== -1) {
                                            // skipcq: JS-0230
                                            instanceInfo =
                                                instanceInfo.substring(
                                                    0,
                                                    queryIndex
                                                );
                                        }

                                        // Extract the number from instanceInfo
                                        const instanceId = instanceInfo.split("~")[0]; // Get the part before the first '~'
                                        // Extract the group ID from instanceInfo
                                        const groupIdMatch = instanceInfo.match(/group\(([^)]+)\)/);
                                        const groupId = groupIdMatch ? groupIdMatch[1] : null; // Get the group ID from the match

                                        const newInfo = {
                                            worldId: worldId,
                                            groupId: groupId,
                                            instanceId: instanceId
                                        };

                                        if (Config.Toggle.WBselfservertoggle === true) {
                                            updateInstanceInfo(newInfo);
                                        }

                                        main.log(
                                            `vrchat log - You have joined ID: ${worldId}`,
                                            "info",
                                            "joinleavelog"
                                        );
                                        main.log(
                                            `vrchat log - You have joined Instance Info: ${instanceInfo}`,
                                            "info",
                                            "joinleavelog"
                                        );
                                        main.log(
                                            `vrchat log - You have joined Instance id: ${instanceId}`,
                                            "info",
                                            "joinleavelog"
                                        );

                                        const timestamp = Date.now() / 1000;
                                        formattedLogMessage = `<t:${Math.round(
                                            timestamp
                                        )}:f> You have joined [WORLD URL](https://vrchat.com/home/launch?worldId=${worldId}&instanceId=${instanceInfo})`;
                                        if (Config.Toggle.Webhook === true) {
                                            sendToWebhook(formattedLogMessage);
                                        }
                                    } else {
                                        main.log(
                                            'Error: Unable to extract world ID and instance info',
                                            "info",
                                            "joinleavelog"
                                        );
                                    }
                                }
                            } catch (error) {
                                console.error(error)
                            }
                        }
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 600)); // Sleep to avoid CPU overuse
        } catch (error) {
            main.log(`error stack of monitor of vrchat: ${error.message}`, "info", "mainlog");
        }
    }
}

monitorAndSend();
initializeTimer();

// ———————————————[Error Handling]———————————————
process.on("uncaughtException", () => {
    setTimeout(() => process.exit(1), 100);
});

process.on("unhandledRejection", () => {
    // empty because ignoring
});
