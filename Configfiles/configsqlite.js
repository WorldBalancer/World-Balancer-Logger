const path = require("path");
const pkgjn = require("../package.json");  // adjust path!

const { Sequelize } = require("sequelize");

const storagePath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    "AppData",
    "Roaming",
    pkgjn.name,
    "config",
    "config.sqlite"
);

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: storagePath,
    logging: false,
});

(async () => {
    try {
        sequelize.authenticate();
        sequelize.sync();
    } catch (e) {
        console.error("Unable to connect:", e);
    }
})();

module.exports = sequelize;