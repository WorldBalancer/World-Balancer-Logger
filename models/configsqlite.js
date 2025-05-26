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

const { Sequelize } = require("sequelize");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pkg = require("../package.json");

// Determine cross-platform user data directory
/**
 *
 *
 * @return {*} 
 */
function getUserDataPath() {
    const platform = process.platform;
    const home = os.homedir();

    if (platform === "win32") {
        return path.join(home, "AppData", "Roaming", pkg.name, "config");
    } else if (platform === "darwin") {
        return path.join(home, "Library", "Application Support", pkg.name, "config");
    } else {
        // Linux or others
        return path.join(home, ".config", pkg.name, "config");
    }
}

const dbDir = getUserDataPath();
const dbPath = path.join(dbDir, "config.sqlite");

// Ensure the directory exists
fs.mkdirSync(dbDir, { recursive: true });

// Initialize Sequelize
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
});

module.exports = sequelize;