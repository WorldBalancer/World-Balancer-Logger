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

/**
 *
 *
 * @class LOGSCLASS
 */
class LOGSCLASS {
    /**
     *
     *
     * @static
     * @param {*} error
     * @memberof LOGSCLASS
     */
    static async writeErrorToFile(error) {
        const { logpath } = require("../Configfiles/Config.js");
        const errorlog = path.join(logpath, "error.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(errorlog, `${timestamp} - ${error}\n`);
    }
}

/**
 *
 *
 * @class ModClass
 */
class ModClass {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof ModClass
     */
    static async writeModerationToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const Moderationlog = path.join(logpath, "Moderation_new.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            Moderationlog,
            `${timestamp} - ${formattedLogMessage}\n`
        );
    }
}

/**
 *
 *
 * @class ModResetShowUserAvatarClass
 */
class ModResetShowUserAvatarClass {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof ModResetShowUserAvatarClass
     */
    static async writeModerationResetShowUserAvatarToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const Moderationlog = path.join(
            logpath,
            "Moderation_ResetShowUserAvatar.log"
        );
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            Moderationlog,
            `${timestamp} - ${formattedLogMessage}\n`
        );
    }
}

/**
 *
 *
 * @class AVISwitchingClass
 */
class AVISwitchingClass {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof AVISwitchingClass
     */
    static async writeModerationToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const AviSwitchinglog = path.join(logpath, "AviSwitching.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            AviSwitchinglog,
            `${timestamp} - ${formattedLogMessage}\n`
        );
    }
}

/**
 *
 *
 * @class AVISwitchinglogsClass
 */
class AVISwitchinglogsClass {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof AVISwitchinglogsClass
     */
    static async writeModerationToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const AviSwitchingdatalog = path.join(
            logpath,
            "AviSwitchingdatalogs.log"
        );
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            AviSwitchingdatalog,
            `${timestamp} - ${formattedLogMessage}\n`
        );
    }
}

/**
 *
 *
 * @class PlayerClass
 */
class PlayerClass {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof PlayerClass
     */
    static async writeplayerToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const playerlog = path.join(logpath, "player.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(playerlog, `${timestamp} - ${formattedLogMessage}\n`);
    }
}

/**
 *
 *
 * @class MODLOGCLASS
 */
class MODLOGCLASS {
    /**
     *
     *
     * @static
     * @param {*} formattedLogMessage
     * @memberof MODLOGCLASS
     */
    static async writeModerationlogToFile(formattedLogMessage) {
        const { logpath } = require("../Configfiles/Config.js");
        const modlogdata = path.join(logpath, "modata.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(
            modlogdata,
            `${timestamp} - ${formattedLogMessage}\n`
        );
    }
}

/**
 *
 *
 * @class StaffROSter
 */
class StaffROSter {
    /**
     *
     *
     * @static
     * @param {*} dataToWrite
     * @memberof StaffROSter
     */
    static async writedataToFile(dataToWrite) {
        const { logpath } = require("../Configfiles/Config.js");
        const staffrosterlog = path.join(logpath, "staffroster.log");
        const timestamp = new Date().toISOString();
        fs.appendFileSync(staffrosterlog, `${timestamp} - ${dataToWrite}\n`);
    }
}

module.exports = {
    LOGSCLASS,
    PlayerClass,
    ModClass,
    AVISwitchingClass,
    ModResetShowUserAvatarClass,
    AVISwitchinglogsClass,
    MODLOGCLASS,
    StaffROSter,
};
