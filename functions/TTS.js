/*
MIT License

Copyright (c) 2025 World Balancer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
*/

const say = require("say");

const ttsQueue = [];
let isProcessing = false;

/**
 * Retrieves installed voices from the system.
 * @returns {Promise<string[]>}
 */
async function getDeviceVoices() {
    return new Promise((resolve, reject) => {
        say.getInstalledVoices((err, voices) => {
            if (err) {
                return reject(err);
            }
            resolve(voices);
        });
    });
}

/**
 * Adds a TTS request to the queue.
 * @param {string} text - The text to speak.
 * @param {string} model - The voice model to use.
 */
function SayDeviceVoices(text, model) {
    ttsQueue.push({ text: text.trim(), model });
    processQueue();
}

/**
 * Processes the TTS queue sequentially.
 */
async function processQueue() {
    if (isProcessing || ttsQueue.length === 0) return;

    isProcessing = true;
    const { text, model } = ttsQueue.shift();

    try {
        await speakText(text, model);
    } catch (err) {
    } finally {
        isProcessing = false;
        if (ttsQueue.length > 0) {
            processQueue(); // Continue processing
        }
    }
}

/**
 * Speaks text using the specified voice model.
 * @param {string} text
 * @param {string} model
 * @returns {Promise<void>}
 */
function speakText(text, model) {
    return new Promise((resolve, reject) => {
        say.speak(text, model, 0.9, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

module.exports = {
    getDeviceVoices,
    SayDeviceVoices,
};
