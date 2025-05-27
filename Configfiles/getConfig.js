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

const Config = require('./Config.js');
const { LOGSCLASS } = require('../functions/logsclass.js');

/**
 *
 *
 * @param {*} key
 * @return {*} 
 */
async function getConfig(key) {
    if (typeof key !== "string") {
        LOGSCLASS?.writeErrorToFile?.(`Invalid config key type: ${typeof key}`);
        return null;
    }

    try {
        const config = await Config.findOne({ where: { keyid: key } });
        if (!config) return null;

        try {
            return JSON.parse(config.value);
        } catch (parseError) {
            LOGSCLASS?.writeErrorToFile?.(`Failed to parse config for key "${key}": ${parseError.message}`);
            return null;
        }
    } catch (dbError) {
        LOGSCLASS?.writeErrorToFile?.(`Database error in getConfig("${key}"): ${dbError.message}`);
        return null;
    }
}

module.exports = getConfig;
