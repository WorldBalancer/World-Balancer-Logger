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

const main = require("../main.js");
const { sendToWebhook } = require("../webhook/index.js");
const { LOGSCLASS } = require("../functions/logsclass.js");
const getConfig = require("../models/getConfig.js"); // Import the getConfig function

async function initializeConfig() {
    const Config = {
        Toggle: {
            Webhook: await getConfig("Toggle.Webhook")
        },
    };
    return Config;
}

// Initialize counters
let counters = {
    player: {
        size: 0,
        limit: 100, // Add a limit to the counter
    },
};

// Constants for statuses
const STATUS = {
    JOIN: "join",
    LEFT: "left",
    RESET: "reset",
};

// Utility function to validate counter type
const isValidCounterType = (type) => counters.hasOwnProperty(type);

// Utility function to validate status
const isValidStatus = (status) => Object.values(STATUS).includes(status);

// Function to dynamically add a counter
const addCounter = (type, limit = 100) => {
    if (counters[type]) {
        return handleError(`Counter type '${type}' already exists.`);
    }
    counters[type] = { size: 0, limit };
    return true;
};

// Function to dynamically remove a counter
const removeCounter = (type) => {
    if (!isValidCounterType(type)) {
        return handleError(`No counter found for type: ${type}`);
    }
    delete counters[type];
    return true;
};

// Function to update a counter
const updateCounter = (type, status) => {
    if (!isValidCounterType(type)) {
        return handleError(`No counter found for type: ${type}`);
    }

    if (!isValidStatus(status)) {
        return handleError(`Invalid status: ${status}`);
    }

    const counter = counters[type];

    switch (status) {
        case STATUS.JOIN:
            if (counter.size >= counter.limit) {
                return handleError(
                    `Counter for type '${type}' has reached its limit of ${counter.limit}.`
                );
            }
            counter.size++;
            break;
        case STATUS.LEFT:
            // Ensure the counter does not go below 0
            if (counter.size > 0) {
                counter.size--;
            }
            break;
        case STATUS.RESET:
            counter.size = 0;
            break;
        default:
            return handleError(`Unhandled status: ${status}`);
    }

    logCounter(type, status);
    return true;
};

// Function to reset a counter
const resetCounter = (type) => {
    if (!isValidCounterType(type)) {
        return handleError(`No counter found for type: ${type}`);
    }

    counters[type].size = 0;
    logCounter(type, STATUS.RESET);
    return true;
};

// Function to set a new limit for a counter
const setLimit = (type, newLimit) => {
    if (!isValidCounterType(type)) {
        return handleError(`No counter found for type: ${type}`);
    }
    if (newLimit <= 0) {
        return handleError("Limit must be greater than zero.");
    }
    counters[type].limit = newLimit;
    return true;
};

// Function to log counter changes
const logCounter = async (type, status) => {
    const Config = await initializeConfig(); // Fetch config settings from the database
    const counterData = counters[type];
    const message = `${capitalize(type)} Counters: ${status} ${JSON.stringify(
        counterData
    )}`;

    main.log(message, "info", "playercounterslog");
    if (Config.Toggle.Webhook == true) {
        sendToWebhook(message);
    }
};

// Utility function to handle errors
const handleError = (errorMessage) => {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] ${errorMessage}`;
    console.error(fullMessage);
    LOGSCLASS.writeErrorToFile(fullMessage);
    return false;
};

// Utility function to capitalize a string
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

module.exports = {
    resetCounter,
    updateCounter,
    addCounter,
    removeCounter,
    setLimit,
};
