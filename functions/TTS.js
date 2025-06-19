/*
MIT License

Copyright (c) 2025 VRCLogger (Project DarkStar)

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
        console.error(err)
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
