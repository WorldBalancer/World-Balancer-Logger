const main = require("../main.js");
const getConfig = require("../Configfiles/getConfig.js");

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
            Webhook: await getConfig("Toggle.Webhook"),
            avilogger: await getConfig("Toggle.avilogger"),
        },
        Userid: {
            discordid: await getConfig("Userid.discordid")
        },
    };
    return Config;
}

// fuck the log files so many why
const {
    PlayerClass,
    ModClass,
    AVISwitchingClass,
    ModResetShowUserAvatarClass,
    AVISwitchinglogsClass,
    MODLOGCLASS,
} = require("../functions/logsclass.js");

// self server worldid, instanceid, instanceInfo
const {
    updateInstanceInfo,
    startServer,
} = require("../website.js");

// webhook send data it
const { sendToWebhook } = require("../webhook/index.js");

// player counter
const { resetCounter, updateCounter } = require("../playercounter/index.js");

// staff rosters
const { StaffRosterjoin, StaffRosterleft } = require("../Staff Roster/index.js")

// vrcx data
const { vrcxdata } = require("../vrcx/vrcxdata.js");

// tts system
const { getDeviceVoices, SayDeviceVoices } = require("../functions/TTS.js");

// Wrap in an IIFE (Immediately Invoked Function Expression) to use await at the top level
(async () => {
    const Config = await initializeConfig();

    if (Config.Toggle.WBselfservertoggle === true) {
        startServer()
    }

})().catch((error) => {
    console.error("Error initializing config:", error);
});

// Handler: Joining or Creating Room
/**
 *
 *
 * @param {*} log
 */
async function processRoomJoin(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    resetCounter("player");

    if (Config.Toggle.vrcxdata === true) {
        vrcxdata();
    }

    const message = `vrchat log - ${logParts.join(" ")}`;
    main.log(message, "info", "joinleavelog");

    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}


// Handler: Player Joined
/**
 *
 *
 * @param {*} log
 */
async function processPlayerJoined(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
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

    PlayerClass.writeplayerToFile(formattedLogMessage);

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
}


// Handler: Player Left
/**
 *
 *
 * @param {*} log
 */
async function processPlayerLeft(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
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
    const formattedLogMessage = `<t:${Math.round(timestamp)}:f> ${logParts.join(" ")}`;
    PlayerClass.writeplayerToFile(formattedLogMessage);

    const message = `<t:${Math.round(timestamp)}:f> VRChat Log - OnPlayerLeft ${cleanedString} ${cleanUser}`;
    const notimestampmessage = `VRChat Log - OnPlayerLeft ${cleanedString} ${cleanUser}`;

    main.log(notimestampmessage, "info", "joinleavelog");
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(message);
    }
}


// Handler: Instance Closed
/**
 *
 *
 * @param {*} log
 */
async function processInstanceClosed(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Always]"), 1);

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    PlayerClass.writeplayerToFile(formattedLogMessage);
    ModClass.writeModerationToFile(formattedLogMessage);

    main.log(
        logParts.join(" "),
        "info",
        "joinleavelog"
    );

    if (Config.Toggle.Webhook === true) {
        sendToWebhook(formattedLogMessage);
    }
}


// Handler: API Print
/**
 *
 *
 * @param {*} log
 */
async function processAPIPrint(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[API]"), 1);

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    ModClass.writeModerationToFile(formattedLogMessage);
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(formattedLogMessage);
    }
}


// Handler: ModerationManager
/**
 *
 *
 * @param {*} log
 */
async function processModerationManager(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    ModClass.writeModerationToFile(formattedLogMessage);

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

        MODLOGCLASS.writeModerationlogToFile(formattedLogMessage)

    }

    // Use regex to extract the username (supports names with or without ~)
    const usernamewarn = logString.match(/([\w~]+) has been warned/);

    if (usernamewarn) {
        const username = usernamewarn[1]; // Corrected index to capture the username

        const timestamp = Math.round(Date.now() / 1000);
        const formattedLogMessage = `<t:${timestamp}:f> ${username} has been warned`;

        MODLOGCLASS.writeModerationlogToFile(formattedLogMessage);

    }

    const usernamemicoff = logString.match(/Microphone has been turned off for (\S+)/);
    if (usernamemicoff) {
        const username = usernamemicoff[0]; // Extracted username

        const timestamp = Date.now() / 1000;
        formattedLogMessage = `<t:${Math.round(
            timestamp
        )}:f> ${username} Microphone has been turned off for`;

        MODLOGCLASS.writeModerationlogToFile(formattedLogMessage);
    }
}


// Handler: Player Destroy
/**
 *
 *
 * @param {*} log
 */
async function processPlayerDestroy(log) {
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    updateCounter("player", "left");

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    PlayerClass.writeplayerToFile(formattedLogMessage)
}


// Handler: Player Left Room
/**
 *
 *
 * @param {*} log
 */
async function processPlayerLeftRoom(log) {
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    formattedLogMessage = `${logParts.join(" ")}`;

    PlayerClass.writeplayerToFile(formattedLogMessage)
}


// Handler: initialized Player
/**
 *
 *
 * @param {*} log
 */
async function processInitializedPlayer(log) {
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    updateCounter("player", "join");

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    PlayerClass.writeplayerToFile(formattedLogMessage);
}


// Handler: Udon Exception
/**
 *
 *
 * @param {*} log
 */
async function processUdonException(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    main.log(logParts.join(" "), "info", "modlog");
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}


// Handler:  Moderation Reset Avatar
/**
 *
 *
 * @param {*} log
 */
async function processModerationResetAvatar(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> ${logParts.join(" ")}`;

    ModResetShowUserAvatarClass.writeModerationResetShowUserAvatarToFile(
        formattedLogMessage
    );
    main.log(logParts.join(" "), "info", "modlog");
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}


// Handler:  USHarpVideo
/**
 *
 *
 * @param {*} log
 */
async function processUSharpVideo(log) {
    const Config = await initializeConfig();
    // Clean out the long 'resolved to' URL if present
    const cleanedLog = log.replace(/resolved to\s+['"]https?:\/\/[^\s'"]+['"]/, "resolved to");

    const logParts = cleanedLog
        .split(" ")
        .filter((part) => part !== "");

    main.log(logParts.join(" "), "info", "modlog");
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}

// Handler:  VideoPlayerback
/**
 *
 *
 * @param {*} log
 */
async function processVideoPlayback(log) {
    const Config = await initializeConfig();
    // Clean out the long 'resolved to' URL if present
    const cleanedLog = log.replace(/resolved to\s+['"]https?:\/\/[^\s'"]+['"]/, "resolved to");

    const logParts = cleanedLog
        .split(" ")
        .filter((part) => part !== "");

    main.log(logParts.join(" "), "info", "modlog");

    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}

// Handler:  Kick Message
/**
 *
 *
 * @param {*} log
 */
async function processKickMessage(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");

    main.log(
        logParts.join(" "),
        "info",
        "joinleavelog"
    );
    if (Config.Toggle.Webhook === true) {
        sendToWebhook(logParts.join(" "));
    }
}

// Handler:  Avatar Switch
/**
 *
 *
 * @param {*} log
 */
async function processAvatarSwitch(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
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
        AVISwitchingClass.writeModerationToFile(
            formattedLogMessage
        );
        if (Config.Toggle.AviStwitch === true) {
            main.log(
                `vrchat log - user ${username} switching to ${avatarneedName}`,
                "info",
                "vrchatswitchavilog"
            );
        }
    } else {
        // Log more details for debugging
        const timestamp = Date.now();
        const formattedLogMessage = `<t:${Math.round(
            timestamp / 1000
        )}:f> Invalid log format or missing data: ${logParts}`;

        // Process and write the log
        AVISwitchinglogsClass.writeModerationToFile(
            formattedLogMessage
        );
        main.log(
            "Invalid log format or missing data",
            "warn",
            "vrchatswitchavilog"
        );
    }
}

// Handler:  Stickers Manager
/**
 *
 *
 * @param {*} log
 */
async function processStickersManager(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf(""), 1);

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> vrchat logs - StickersManager ${logParts.join(
        " "
    )}`;

    ModClass.writeModerationToFile(formattedLogMessage);

    if (Config.Toggle.Webhook === true) {
        sendToWebhook(formattedLogMessage);
    }
}

// Handler:  API Analysis
/**
 *
 *
 * @param {*} log
 */
async function processAPIAnalysis(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf(""), 1);

    const timestamp = Date.now() / 1000;
    formattedLogMessage = `<t:${Math.round(
        timestamp
    )}:f> vrchat logs - API Analysis Requested ${logParts.join(
        " "
    )}`;

    ModClass.writeModerationToFile(formattedLogMessage);

    if (Config.Toggle.Webhook === true) {
        sendToWebhook(formattedLogMessage);
    }
}

// Handler:  DestinationSet
/**
 *
 *
 * @param {*} log
 */
async function processDestinationSet(log) {
    const Config = await initializeConfig();
    const logParts = log.split(" ").filter(part => part !== "");
    logParts.splice(logParts.indexOf("[Behaviour]"), 1);

    const destinationPart = logParts.find((part) =>
        part.startsWith("wrld_")
    );

    if (destinationPart) {
        const subparts = destinationPart.split(":");
        if (subparts.length > 1) {
            const worldId = subparts[0].trim(); // Trim any leading or trailing whitespaces
            let instanceInfo = subparts[1].trim();

            // Remove the query parameters from instanceInfo
            const queryIndex =
                instanceInfo.indexOf("?");
            if (queryIndex !== -1) {
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
                "Error: Unable to extract world ID and instance info",
                "info",
                "joinleavelog"
            );
        }
    }
}

/**
 *
 *
 * @param {*} log
 * @return {*} 
 */
async function processAvatarid(log) {
    const Config = await initializeConfig();
    if (Config.Toggle.avilogger === true) {
        // Configuration constants
        const retryCount = 0
        const MAX_RETRIES = 3;
        const RATE_LIMIT_DELAY = 60000;
        const BASE_API_URL = 'https://avatar.worldbalancer.com/v5/vrchat';
        const ENDPOINT = `${BASE_API_URL}/avatars/htfdcel/store/putavatarExternal`;

        // Use discordId from config
        const discordId = Config.Userid.discordid; // Note: case-sensitive match to your config

        // Validate configuration
        if (!discordId) {
            throw new Error('Discord ID not configured');
        }

        // Extract the full avatar ID with avtr_ prefix
        const avatarIdMatch = log.match(/avatars\/(avtr_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (!avatarIdMatch) {
            throw new Error("No valid avatar ID found in the log");
        }

        const fullAvatarId = avatarIdMatch[1]; // This now includes "avtr_" prefix
        const postData = {
            id: fullAvatarId, // Using the full ID with prefix
            discordId: discordId
        };

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            // Handle response
            if (!response.status === "404") {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed: ${response.status}`, {
                    cause: errorData
                });
            }

            const responseData = await response.json();

            const result = {
                success: true,
                avatarId: fullAvatarId,
                discordId: discordId,
                apiResponse: responseData,
                retries: retryCount,
            };

            // Detailed console output
            console.log("✅ Avatar Processing Successful", {
                "Avatar ID": result.avatarId,
                "Discord ID": result.discordId,
                "API Response": result.apiResponse,
                "Retry Attempts": result.retries,
            });

            return result;

        } catch (error) {
            console.error(`Error processing avatar (attempt ${retryCount + 1}):`, error.message);
            if (retryCount < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                return processAvatarid(log, discordId, retryCount + 1);
            }
            throw error;
        }
    }
}

// Export Functions
module.exports = {
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
    processAvatarid,
    processStickersManager,
    processAPIAnalysis,
    processDestinationSet,
};
