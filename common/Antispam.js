'use strict';

// Anti Spam Module
// Funey, 2020

var Messages = new Set();
let LA = require('../common/Logging')
let Logger = new LA('antispam');

var Holding = this.getHolding();


module.exports.scanner = async function(message) {
    // Generate unique "nonce" to scan for this message.

    var msgNonce = Math.floor(Math.random() * 100) + 1;

    // Add this message to the Message set.
    Messages.add(message.guild.id + "_" + message.author.id + "_" + msgNonce);

    // Remove after pre-defined time period.
    setTimeout( () => {
        Messages.delete(message.guild.id + "_" + message.author.id + "_" + msgNonce)
    }, 250);

    // Check if user needs to be ratelimited.
    if ( this.checkState(message.guild.id, message.author.id) ) {
        // User requires ratelimiting.
    }
}

// Check spam state.
module.exports.checkState = async function(guildId, userId) {
    // false if not spamming, true if spamming.
    let spamCount = 0;

    Messages.forEach( (setMsg) => {
        let tmp = setMsg.split('_');

        if (tmp[0] == guildId && tmp[1] == userId) {
            spamCount++;
        }
    });


    // Check if we're above limit, if so the user is spamming and we want to let the caller know.
    if (spamCount > 6) return true;
    else return false;

}

// Mute user for predefined time-period.
module.exports.muteUser = async function(guildId, userId, modId, time, reason) {
    // guildId = guild ID user has to be muted in.
    // userId = user ID of user to mute
    // time = time user has to be muted for, defaults to ONE HOUR.
    // reason = reason user has been muted, defaults to NO REASON SPECIFIED.

    if (!isNaN(guildId)) throw new Error("No guild ID specified.");
    if (!isNaN(modId)) throw new Error("No moderator ID specified.");
    if (!isNaN(userId)) throw new Error("No user ID specified.");

    time = time || 3600000; // Specified time, or 1 hour.
    reason = reason || "No reason specified."; // Specified reason, or "No reason specified".

    // Do mute.

    Holding.push({
        guildId: guildId,
        userId: userId,
        time: time,
        reason: reason,
        modId: modId
    });

    // Write changes to Holding DB.
    this.writeHolding();

    // Let user know they've been muted and such
    console.log('User muted ig')

}

// Get mutes in holding DB, only usually called upon bot start.
module.exports.getHolding = function() {
    // Make sure the filename gets set to something if it wasn't declared.
    FileName = FileName || "rhea_mutedb.json";

    Logger.log('Reading Holding Database from file "' + FileName + '"...')
    let configDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (fs.existsSync(path.join(configDir, "/" + FileName))) {
        Logger.log('Holding DB file "' + FileName + '" exists. Returning.')
        return require(path.join(configDir, "/" + FileName))
    } else {
        Logger.log('Holding DB file "' + FileName + '" does not exist, therefore database is empty.')
        return {};
    }
}

// Write holding DB to a file for persistent databasing.
module.exports.writeHolding = function () {
    // Make sure the filename gets set to something if it wasn't declared.
    FileName = FileName || "rhea_mutedb.json";

    Logger.log('Writing Holding Database to file "' + FileName + '"...')
    let configDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (fs.existsSync(path.join(configDir, "/" + FileName))) {
        Logger.log('Holding DB file "' + FileName + '" exists. Returning.')
        fs.writeFileSync(path.join(configDir, "/" + FileName), JSON.stringify(Holding))
        return true;
    } else {
        Logger.log('Holding DB file "' + FileName + '" does not exist, writing anyway.')
        fs.writeFileSync(path.join(configDir, "/" + FileName), JSON.stringify(Holding))
        return true;
    }
}

// Unmute user.
module.exports.unmute = function(guildId, userId, reason) {
    // guildId = guild ID user has to be unmuted in.
    // userId = user ID of user to unmute
    // reason = reason user has been unmuted, defaults to NO REASON SPECIFIED.

    if (!isNaN(guildId)) throw new Error("No guild ID specified.");
    if (!isNaN(userId)) throw new Error("No user ID specified.");  

    reason = reason || "No reason specified."; // Specified reason or "no reason specified."

    console.log('Unmuted - I like ya cut G.')
}

setInterval( async () => {
    // Do database runthrough every 5 seconds, not every 1 second as that'd chew up valuable CPU time.
    for (const i in Holding) {
        Holding[i].time = Holding[i].time - 5; // Remove Five seconds from their time.

        // Check if they can be unmuted - if so, remove them.
        if (Holding[i].time <= 0) {
            // User can be unmuted.

            // Remove them from holding.
            Holding[i].splice(i, 1);
            this.unmuteUser(Holding[i].guildId, Holding[i].userId)
        }
    }

    // Save disk space, write when all changes are known to have been made.
    this.writeHolding();


}, 5000)