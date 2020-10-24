'use strict';

// Anti Spam Module
// Funey, 2020

var Messages = new Set();
let LA = require('../common/Logging')
let Logger = new LA('antispam');

const CONFIG = require('../config.json');
const fs = require('fs');
const path = require('path');
const Database = require('../db/sqlite')

var Holding = {
    "mutes": []
}


// Get mutes in holding DB, only usually called upon bot start.
var getHolding = function() {
    // Make sure the filename gets set to something if it wasn't declared.
    let FileName = "rhea_mutedb.json";
    
    Logger.log('Reading Holding Database from file "' + FileName + '"...')
    let configDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (fs.existsSync(path.join(configDir, "/" + FileName))) {
        Logger.log('Holding DB file "' + FileName + '" exists. Returning.')
        return require(path.join(configDir, "/" + FileName))
    } else {
        Logger.log('Holding DB file "' + FileName + '" does not exist, therefore database is empty.')
        fs.writeFileSync(path.join(configDir, "/" + FileName), JSON.stringify(Holding))
        return {};
    }
}
    
// Write holding DB to a file for persistent databasing.
var writeHolding = function () {
    // Make sure the filename gets set to something if it wasn't declared.
    let FileName = "rhea_mutedb.json";

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

function millisecondsToStr (milliseconds) {
    let moment = require('moment');
    //milliseconds = Date.now() + milliseconds;
    return moment.utc(moment.duration(milliseconds).as('milliseconds')).format('HH:mm:ss') + " (HH:MM:SS)"
}


module.exports = function(client, Discord) {
    //Holding = getHolding();
    
    
    
    this.scanner = function(message) {
        // Generate unique "nonce" to scan for this message.
        //console.log(Holding)

        // Don't double-mute or nothin'
        if (this.isMuted(message.guild.id, message.author.id)) return;
    
        var msgNonce = Math.floor(Math.random() * 100) + 1;
    
        // Add this message to the Message set.
        Messages.add(message.guild.id + "_" + message.author.id + "_" + msgNonce);
    
        // Remove after pre-defined time period.
        setTimeout( () => {
            Messages.delete(message.guild.id + "_" + message.author.id + "_" + msgNonce)
        }, 2000);
    
        //console.log(message.guild.id)
    
        // Check if user needs to be ratelimited.
        let b = this.checkState(message.guild.id, message.author.id) 
        //console.log(b);
        if ( b ) {
            // User requires ratelimiting.
            this.muteUser(message.guild.id, message.author.id, client.user.id, 20000, "[AUTOMOD] Antispam");
            return true;
        } else {
            return false;
        }
    }
    
    // Check spam state.
    this.checkState = function(guildId, userId) {
        // false if not spamming, true if spamming.
        let spamCount = 0;
    
        Messages.forEach( (setMsg) => {
            let tmp = setMsg.split('_');
    
            if (tmp[0] == guildId && tmp[1] == userId) {
                spamCount++;
            }
        });
    
    
        // Check if we're above limit, if so the user is spamming and we want to let the caller know.
        //console.log('Spam count ' + spamCount)
        if (spamCount > 6) return true;
        else return false;
    
    }
    
    // Mute user for predefined time-period.
    this.muteUser = async function(guildId, userId, modId, time, reason) {
        // guildId = guild ID user has to be muted in.
        // userId = user ID of user to mute
        // time = time user has to be muted for, defaults to ONE HOUR.
        // reason = reason user has been muted, defaults to NO REASON SPECIFIED.
    
        //if (!isNaN(guildId)) throw new Error("No guild ID specified.");
        //if (!isNaN(modId)) throw new Error("No moderator ID specified.");
        //if (!isNaN(userId)) throw new Error("No user ID specified.");
    
        time = time || 3600000; // Specified time, or 1 hour.
        reason = reason || "No reason specified."; // Specified reason, or "No reason specified".
        modId = modId || client.user.id;
    
        // Do mute.
    
        Holding["mutes"].push({
            guildId: guildId,
            userId: userId,
            time: time,
            reason: reason,
            modId: modId
        });
    
        // Write changes to Holding DB.
        writeHolding();
    
        // Add role to user.
        let Store = new Database(guildId);
    
        Store.getObject('mute-role').then( (v) => {
            // v[0].value!!!!
            
            try {
                let guild = client.guilds.cache.get(guildId);
                let member = guild.members.cache.get(userId);
                let mod = guild.members.cache.get(modId);

                let role = guild.roles.cache.get(v[0].value);

                member.roles.add(role).catch(console.error);


            } catch (err) {
                // Role doesn't exist or things died.
                // Either which way, panic!!!!!!!!!!
                Logger.error('Failed to give member mute role, error below.')
                Logger.error(err)
            }
        });

        Store.addInfraction(userId, client.user.id, 'mute', reason).then( (infractionID) => {
            let guild = client.guilds.cache.get(guildId);
            let member = guild.members.cache.get(userId);
            let mod = guild.members.cache.get(modId);

            let WarnEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle('New Infraction')
            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
            .setDescription('You have received an infraction in ' + guild.name + '.')
            .addField('Type', 'mute', true)
            .addField('Infraction ID', infractionID, true)
            .addField('Reason', reason , true)
            .addField('Length', millisecondsToStr(time));

            Store.getObject('infraction-log').then( (v) => {
                let InfractionEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('New mute for ' + member.user.tag)
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punished', member.user.tag + " (" + member.user.id + ")" , true)
                    .addField('Punisher', mod.user.tag + " (" + mod.user.id + ")", true)
                    .addField('Reason', reason , true)
                    .addField('Length', millisecondsToStr(time));

                client.guilds.cache.get(guildId).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                
            });

            client.users.cache.get(userId).send(WarnEmbed).then( () => {
                Logger.log('Infraction alert sent to user ' + userId + ' successfully.')
            }).catch( (err) => {
                Logger.error('Failed to send infraction alert to user ' + userId + '.')
            })

        })
    
        // Let user know they've been muted and such
        Logger.log(`Muted ${userId} in ${guildId} with reason ${reason}. Length of mute: ${time}ms`)
    
    }
    
    // Unmute user.
    this.unmuteUser = function(guildId, userId, reason) {
        // guildId = guild ID user has to be unmuted in.
        // userId = user ID of user to unmute
        // reason = reason user has been unmuted, defaults to NO REASON SPECIFIED.
    
        //if (!isNaN(guildId)) throw new Error("No guild ID specified.");
        //if (!isNaN(userId)) throw new Error("No user ID specified.");  
    
        reason = reason || "No reason specified."; // Specified reason or "no reason specified."
    
        // Add role to user.
        let Store = new Database(guildId);

        Store.getObject('mute-role').then( (v) => {
            // v[0].value!!!!
            
            try {
                let guild = client.guilds.cache.get(guildId);
                let member = guild.members.cache.get(userId);
    
                let role = guild.roles.cache.get(v[0].value);

                member.roles.remove(role).catch(console.error);


            } catch (err) {
                // Role doesn't exist or things died.
                // Either which way, panic!!!!!!!!!!
                Logger.error('Failed to remove member mute role, error below.')
                Logger.error(err)
            }
        });

        let guild = client.guilds.cache.get(guildId);
        let member = guild.members.cache.get(userId);

        let WarnEmbed = new Discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle('Punishment Update')
        .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
        .setDescription('You have been unmuted in ' + guild.name + '.')
        .addField('Type', 'mute', true)
        .addField('Reason', reason , true);

        Store.getObject('infraction-log').then( (v) => {
            let InfractionEmbed = new Discord.MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Unmuted ' + member.user.tag)
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                .addField('User', member.user.tag + " (" + member.user.id + ")" , true)
                .addField('Unmuter', client.user.tag + " (" + client.user.id + ")", true)
                .addField('Reason', reason , true);

            client.guilds.cache.get(guildId).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
            
        });

        client.users.cache.get(userId).send(WarnEmbed).then( () => {
            Logger.log('Infraction alert sent to user ' + userId + ' successfully.')
        }).catch( (err) => {
            Logger.error('Failed to send infraction alert to user ' + userId + '.')
        })


        Logger.log(`Unmuting ${userId} in ${guildId} with reason ${reason}.`)
    }
    
    this.isMuted = function(guildId, userId) {
        let found = false
        for (const i in Holding["mutes"]) {
            if ( Holding["mutes"][i].guildId == guildId && Holding["mutes"][i].userId == userId) {
                found = true;
            }
        }
    
        return found;
    }
    
    
    setInterval( async () => {
        // Do database runthrough every 5 seconds, not every 1 second as that'd chew up valuable CPU time.
        
        for (const i in Holding["mutes"]) {
            Holding["mutes"][i].time = Holding["mutes"][i].time - 5000; // Remove Five seconds from their time.
            // Check if they can be unmuted - if so, remove them.
            if (Holding["mutes"][i].time <= 0) {
    
                // User can be unmuted.
                this.unmuteUser(Holding["mutes"][i].guildId, Holding["mutes"][i].userId, '[AUTOMOD] Automated unmute.')
                // Remove them from holding.
                Holding["mutes"].splice(i, 1);
                
            }
        }
    
        //console.log(Holding["mutes"])
        // Save disk space, write when all changes are known to have been made.
        writeHolding();
    
    
    }, 5000)
}
