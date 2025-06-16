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

const { contextBridge, ipcRenderer } = require("electron");

// Replace version info in DOM (for Electron, Node, Chrome)
window.addEventListener("DOMContentLoaded", () => {
    /**
     *
     *
     * @param {*} selector
     * @param {*} text
     */
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const dependency of ["chrome", "node", "electron"]) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
});

// Expose safe API to renderer
contextBridge.exposeInMainWorld("api", {
    // Load config from main process
    loadConfig: () => ipcRenderer.invoke("load-config"),

    // Save config to main process
    saveConfig: (config) => ipcRenderer.invoke("save-config", config),

    // Optionally add more secure channels below
    // Example: Send a log message to main process
    sendLogMessage: (type, message) => ipcRenderer.send("send-log", { type, message }),

    // Example: Listen for real-time log updates
    onLogUpdate: (callback) => {
        ipcRenderer.on("log-update", (event, data) => callback(data));
    },
});
