'use strict';

// Logging Module for Rhea
// Funey, 2020.

const fs = require('fs');
const path = require('path')

module.exports = function(moduleName) {

    // Initialise filename, change this to support Linux.
    const location = path.join(__dirname, "../logs/")
    const fileName = "rhea_" + moduleName + "_" + Date.now() + ".txt";

    this.warn = function(text) {
        console.log(`[${moduleName}] [WARN] ${text}`)

        fs.appendFile(location + fileName, '[' + moduleName +'] [WARN] ' + text + '\n', function (err) {
            if (err) return console.log(err);
        });
    }

    this.log = function(text) {
        console.log(`[${moduleName}] [LOG] ${text}`)

        fs.appendFile(location + fileName, '[' + moduleName +'] [LOG] ' + text + '\n', function (err) {
            if (err) return console.log(err);
        });
    } 

    this.error = function(text) {
        console.log(`[${moduleName}] [ERROR] ${text}`)
        fs.appendFile(location + fileName, '[' + moduleName +'] [ERROR] ' + text + '\n', function (err) {
            if (err) return console.log(err);
        });
    }

    this.log('Logging initialised for module ' + moduleName + '.')
}