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
const { app } = require("electron");

// Cross-platform user data directory
const appInstallPath = app.getPath("userData");
const logpath = path.join(appInstallPath, "log");
const configDir = path.join(appInstallPath, "config");
const getConfig = require("./Configfiles/getConfig.js");

let errsleepy = "";

/**
 *
 *
 * @return {*} 
 */
async function initializeConfig() {
    const Config = {
        Directories: {
            LogDirectory: await getConfig("Directories.LogDirectory"),
        },
        Toggle: {
            vrcxdata: await getConfig("Toggle.vrcxdata"),
            AviStwitch: await getConfig("Toggle.AviStwitch"),
            TTS: await getConfig("Toggle.TTS"),
            WBselfservertoggle: await getConfig("Toggle.WBselfservertoggle"),
            Webhook: await getConfig("Toggle.Webhook")
        },
    };
    return Config;
}

if (!fs.existsSync(logpath)) {
    fs.mkdirSync(logpath, { recursive: true });
}

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// fuck the log files so many why
const {
    LOGSCLASS,
} = require("./functions/logsclass.js");

let currentLogFile = null;
let lastReadPosition = 0;

/**
 *
 *
 * @return {*} 
 */
async function checkForNewFiles() {
    const Config = await initializeConfig();
    const logDirectory = Config.Directories?.LogDirectory;

    if (!logDirectory) {
        errsleepy = "Log directory path is missing or null.";
        LOGSCLASS.writeErrorToFile(errsleepy);
        return;
    }

    let logFileNames;
    try {
        logFileNames = await fs.promises.readdir(logDirectory);
    } catch (err) {
        console.error(`Failed to read directory: ${logDirectory}`, err);
        errsleepy = `Failed to read directory: ${logDirectory} ${err}`;
        LOGSCLASS.writeErrorToFile(errsleepy);
        main.log(errsleepy, "info", "mainlog");
        return;
    }

    const newLogFileNames = logFileNames.filter((fileName) =>
        fileName?.startsWith("output_log")
    );

    newLogFileNames.sort();

    if (newLogFileNames.length > 0) {
        const latestLogFile = path.join(
            logDirectory,
            newLogFileNames[newLogFileNames.length - 1]
        );
        if (latestLogFile !== currentLogFile) {
            currentLogFile = latestLogFile;
            lastReadPosition = 0;
            main.log(
                `Switching to new log file: ${currentLogFile}`,
                "info",
                "mainlog"
            );
        }
    }
}

/**
 *
 *
 * @param {*} currentLogFile
 * @param {*} lastReadPosition
 * @return {*} 
 */
async function readNewLogs(currentLogFile, lastReadPosition) {
    try {
        const fileData = await fs.promises.readFile(currentLogFile, "utf8");

        if (!fileData) {
            return [[], 0]; // Return an empty array and 0 as the last read position
        }

        const newData = fileData.slice(lastReadPosition);
        const newLogs = newData.split("\n").filter(Boolean); // Remove empty strings
        const newLastReadPosition = fileData.length;

        return [newLogs, newLastReadPosition]; // Return an array with newLogs and newLastReadPosition
    } catch (err) {
        errsleepy = `Error reading log file: ${err}`;
        LOGSCLASS.writeErrorToFile(errsleepy);
        throw err; // Rethrow the error to propagate it up the call stack
    }
}

const {
    processRoomJoin,
    processPlayerJoined,
    processPlayerLeft,
    processInstanceClosed,
    processAPIPrint,
    processModerationManager,
    processPlayerDestroy,
    processPlayerLeftRoom,
    processInitializedPlayer,
    processUdonException,
    processModerationResetAvatar,
    processUSharpVideo,
    processVideoPlayback,
    processKickMessage,
    processAvatarSwitch,
    processStickersManager,
    processAPIAnalysis,
    processDestinationSet,
} = require("./process/index.js")
/**
 *
 *
 */
async function monitorAndSend() {
    try {
        while (true) {
            await checkForNewFiles();
            if (!currentLogFile) {
                main.log("No log file selected. Waiting for a new log file...", "info", "mainlog");
                await delay(1000);
                continue;
            }

            const currentSize = fs.statSync(currentLogFile).size;
            if (currentSize <= lastReadPosition) {
                await delay(1000);
                continue;
            }

            const [newLogs, newLastReadPosition] = await readNewLogs(currentLogFile, lastReadPosition);

            for (const log of newLogs) {
                try {
                    if (log.length > 10000) {
                        logTooLong(log);
                        continue;
                    }

                    if (log.includes("Joining or Creating Room")) {
                        await processRoomJoin(log);
                    } else if (log.includes("[Always] Instance closed:")) {
                        await processInstanceClosed(log);
                    } else if (log.includes("[API] Requesting Get prints")) {
                        await processAPIPrint(log);
                    } else if (log.includes("ModerationManager")) {
                        await processModerationManager(log);
                    } else if (log.includes("[Behaviour] OnPlayerJoined")) {
                        await processPlayerJoined(log);
                    } else if (log.includes("[Behaviour] OnPlayerLeft")) {
                        await processPlayerLeft(log,);
                    } else if (log.includes("[Behaviour] Destroying")) {
                        await processPlayerDestroy(log);
                    } else if (log.includes("[Behaviour] OnPlayerLeftRoom")) {
                        await processPlayerLeftRoom(log);
                    } else if (log.includes("[Behaviour] Initialized player")) {
                        await processInitializedPlayer(log);
                    } else if (log.includes("VRC.Udon.VM.UdonVMException")) {
                        await processUdonException(log,);
                    } else if (log.includes("[Behaviour] Event: Moderation_ResetShowUserAvatarToDefault")) {
                        await processModerationResetAvatar(log);
                    } else if (log.includes("USharpVideo")) {
                        await processUSharpVideo(log);
                    } else if (log.includes("Video Playback")) {
                        await processVideoPlayback(log);
                    } else if (log.includes("[Behaviour] Received executive message: You have been kicked from the instance")) {
                        await processKickMessage(log);
                    } else if (log.includes("Switching ")) {
                        await processAvatarSwitch(log);
                    } else if (log.includes("[StickersManager] ")) {
                        await processStickersManager(log);
                    } else if (log.includes("[API] Requesting Get analysis")) {
                        await processAPIAnalysis(log);
                    } else if (log.includes("[Behaviour] Destination set: ")) {
                        await processDestinationSet(log);
                    }
                } catch (logError) {
                    const err = `Error processing log: ${log}\n${logError}`;
                    LOGSCLASS.writeErrorToFile(err);
                    main.log(err, "warn", "mainlog");
                }
            }

            lastReadPosition = newLastReadPosition;
            await delay(1000);
        }
    } catch (error) {
        const err = `Error in monitorAndSend loop: ${error.message}`;
        LOGSCLASS.writeErrorToFile(err);
        main.log(err, "error", "mainlog");
    }
}

/**
 *
 *
 * @param {*} ms
 * @return {*} 
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *
 *
 * @param {*} log
 */
function logTooLong(log) {
    const message = `Log entry too long, skipping: ${log.length} only dev test`;
    main.log(message, "warn", "mainlog");
    LOGSCLASS.writeErrorToFile(message);
}

monitorAndSend();

// ———————————————[Error Handling]———————————————
process.on("uncaughtException", (err, origin) => {
    LOGSCLASS.writeErrorToFile(
        `Uncaught Exception at: ${new Date().toISOString()}
        Error: ${err.message}
        Stack: ${err.stack}
        Origin: ${origin}`
    );
    setTimeout(() => process.exit(1), 100);
});

process.on("unhandledRejection", (reason, promise) => {
    LOGSCLASS.writeErrorToFile(
        `Unhandled Rejection at: ${new Date().toISOString()}
        Reason: ${reason}
        Promise: ${promise}`
    );
});