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

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

let io; // Declare io globally

// Initialize instanceInfo with default values
let instanceInfo = {
    worldId: "default_world",
    instanceId: "0000",
    userId: "unknown_user",
    region: "us",
    type: "public",
    groupType: "none",
    groupId: "none",
};

// Function to push instance data to clients
function pushWebsite() {
    try {
        if (!io) {
            return;
        }

        let string = `#${instanceInfo.instanceId}; ${instanceInfo.worldId}`;

        switch (instanceInfo.type) {
            case "public":
                string += "; Public";
                break;
            case "group":
                string += `; ${instanceInfo.groupType.toUpperCase()} by ${instanceInfo.groupId}`;
                break;
            case "hidden":
            case "private":
                string += `; ${instanceInfo.type.toUpperCase()} by ${instanceInfo.userId}`;
                break;
            default:
                break;
        }

        io.emit('update', { subtitle: string });

    } catch (error) {
        errsleepy = `ERROR in pushWebsite(): ${error}`;
    }
}

// Function to update instanceInfo dynamically
function updateInstanceInfo(newInfo) {
    instanceInfo = { ...instanceInfo, ...newInfo }; // Merge new data with existing
    pushWebsite();
}

// Start the web server
function startServer() {
    const app = express();
    const server = http.createServer(app);
    io = new Server(server);

    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public/worldinfo.html'));
    });

    io.on('connection', (socket) => {

        try {
            pushWebsite(); // Send initial data when a user connects
        } catch (error) {
            console.error(error)
        }

        socket.on('disconnect', () => {
            // empty because no specific disconnect handling required
        });
    });

    const PORT = 3055;
    server.listen(PORT, () => {
        // empty because no action needed when server starts listening
    });

    // ———————————————[Error Handling]———————————————
    process.on("uncaughtException", () => {
        setTimeout(() => process.exit(1), 100);
    });

    process.on("unhandledRejection", () => {
        // empty because unhandled rejections are intentionally ignored
    });
}

// Export functions
module.exports = { pushWebsite, startServer, updateInstanceInfo };
