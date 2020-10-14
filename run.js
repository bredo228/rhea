'use strict';

// Alternate run script to catch errors.

let LA = require('./common/Logging');
const Logger = new LA('bootstrapper');

const { exec } = require("child_process");

exec("npm run test", (error, stdout, stderr) => {
    if (error) {
        Logger.error(`${error.message}`);
        return;
    }
    if (stderr) {
        Logger.error(`${stderr}`);
        return;
    }

    Logger.log(`${stdout}`);
});