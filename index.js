'use strict';

// Rhea
// Funey, 2020.

try {
    const VERSION = require('./package.json').version;

    // Initialise bot libraries..
    
    const Discord = require("discord.js");
    const client = new Discord.Client();
    
    // Configuration data.
    client.CONFIG = require('./config.json')
    const fs = require('fs');

    const AS = require('./common/Antispam');
    const Antispam = new AS(client, Discord);

    client.antispam = Antispam; // Throw antispam onto a module-accessible scope.
    
    // Initialise Logging/Socketing
    
    function handler(req,res) {
        res.writeHead(500);
        res.end('Not an HTTP server.<br />Rhea Discord Bot Management Websocket');
    }
    
    let LA = require('./common/Logging')
    let Logger = new LA('processor');
    
    if (client.CONFIG.enableWebsocket) {
        var app = require('http').createServer(handler)
        var io = require('socket.io')(app);
    }
    
    // Stuff for JSON serialisation/de-serialisation.
    function replacer(key, value) {
        if (value instanceof RegExp)
          return ("__REGEXP " + value.toString());
        else
          return value;
      }
      
      function reviver(key, value) {
        if (value.toString().indexOf("__REGEXP ") == 0) {
          var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
          return new RegExp(m[1], m[2] || "");
        } else
          return value;
      }

    
    
    // Check if we've got a token.
    
    if (process.env.RHEA_TOKEN === undefined) {
        // No token.
        Logger.error(`You need to specify the Environment Variable "RHEA_TOKEN" in order to start this bot.`);
        
        if (client.CONFIG.enableWebsocket) {
            Logger.log(`Awaiting Management Interface connection...`)
        } else {
            Logger.error(`[FATAL]: Exiting...`)
            process.exit(1);
        }
    
       
    }
    
    // DataStore
    const DataStore = require('./db/sqlite');
    
    // Initialise commands.
    client.Commands = new Set();
    const CommandsDir = fs.readdirSync('./cmds/').filter(file => file.endsWith('.js'));
    
    for (const Files of CommandsDir) {
        let temp = require('./cmds/' + Files);
    
        client.Commands.add(temp)
    }
    
    // Initialise bot.
    client.on('ready', () => {
        Logger.log(`Rhea started, in ${client.guilds.cache.size} guild(s).`);
    })
    
    client.on('message', (message) => {
        if (message.author.bot) return;
    

        // Check the word blacklist.
    
        if (message.guild === null) return; // Potential API issue?
    
        let Store = new DataStore(message.guild.id)

        Store.getObject('regex-role-whitelist').then( (w) => {
            // w[0].value!
            let ok = false;
            //console.log(w)
            let wlarray = JSON.parse(w[0].value, reviver);

            
            //console.log(wlarray

            wlarray["whitelist"].forEach( (roleid) => {
                if (message.member.roles.cache.get(roleid)) {
                    // Got it!
                    ok = true;
                }
            });

            // Check if user is whitelisted.
            if (!ok) {
                // Scathe user.
                Store.getObject('regex-blacklist').then( (v) => {
                    // v[0].value!
        
                    // Parse JSON string.
                    let rgBlacklist = JSON.parse(v[0].value, reviver)
                    let deleted = false;
                    
                    for (const i in rgBlacklist["blacklist"]) {
                        // Iterate through blacklist
                        let regex = rgBlacklist["blacklist"][i]
        
                        // Now that we have our regex we can check it against our string.
                        let searching = message.content.search(regex);
                        //console.log(searching)
                        if (searching > -1) {
                            // Regex blacklist tripped.
                            //console.log('REGEX BLACKLIST TRIPPED')
        
                            message.delete();
                            deleted = true;
                            
                        }
                    }
        
                    if (deleted) {
                        // Add infraction, warn user etc.
                        Logger.log('Regexp blacklist triggered over MESSAGE event, user ' + message.author.id + ' on guild ' + message.guild.id + ".")
            
                        Store.addInfraction(message.author.id, client.user.id, 'warn', '[AUTOMOD] Regex blacklist.').then( (infractionID) => {
                            let WarnEmbed = new Discord.MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('New Infraction')
                            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                            .setDescription('You have received an infraction in ' + message.guild.name + '.')
                            .addField('Type', 'warn', true)
                            .addField('Infraction ID', infractionID, true)
                            .addField('Reason', '[AUTOMOD] Regex blacklist.' , true);
            
                            Store.getObject('infraction-log').then( (v) => {
                                let InfractionEmbed = new Discord.MessageEmbed()
                                    .setColor('#ff0000')
                                    .setTitle('New warning for ' + message.author.tag)
                                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                                    .addField('Punished', message.author.tag + " (" + message.author.id + ")" , true)
                                    .addField('Punisher', client.user.tag + " (" + client.user.id + ")", true)
                                    .addField('Reason', '[AUTOMOD] Regex blacklist.' , true);
                
                                client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                                
                            });
                
                            client.users.cache.get(message.author.id).send(WarnEmbed).then( () => {
                                Logger.log('Infraction alert sent to user ' + message.author.id + ' successfully.')
                            }).catch( (err) => {
                                Logger.error('Failed to send infraction alert to user ' + message.author.id + '.')
                            })
                
                        })
                    }
                })
            }
        }).catch( (err) => {
            Logger.error('Failed to do regexp whitelist.')
            Logger.error(err);
            console.log(err)
        })
    
        Store.getObject('word-blacklist').then ( (blacklistwords) => {
            
            let blacklisted = blacklistwords[0].value.split(',');
            var MessageDeleted = false;
    
            blacklisted.forEach( (blacklistWord) => {
                if (message.content.includes(blacklistWord)) {
                    // Whoops naughty.
                    message.delete();
                    MessageDeleted = true;
                }
            })
    
            if (MessageDeleted) {
    
                // Add infraction.
                Logger.log('Word blacklist triggered over MESSAGE event, user ' + message.author.id + ' on guild ' + message.guild.id + ".")
    
                Store.addInfraction(message.author.id, client.user.id, 'warn', '[AUTOMOD] Word blacklist.').then( (infractionID) => {
                    let WarnEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('New Infraction')
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .setDescription('You have received an infraction in ' + message.guild.name + '.')
                    .addField('Type', 'warn', true)
                    .addField('Infraction ID', infractionID, true)
                    .addField('Reason', '[AUTOMOD] Word blacklist.' , true);
    
                    Store.getObject('infraction-log').then( (v) => {
                        let InfractionEmbed = new Discord.MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('New warning for ' + message.author.tag)
                            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                            .addField('Punished', message.author.tag + " (" + message.author.id + ")" , true)
                            .addField('Punisher', client.user.tag + " (" + client.user.id + ")", true)
                            .addField('Reason', '[AUTOMOD] Word blacklist.' , true);
        
                        client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                        
                    });
        
                    client.users.cache.get(message.author.id).send(WarnEmbed).then( () => {
                        Logger.log('Infraction alert sent to user ' + message.author.id + ' successfully.')
                    }).catch( (err) => {
                        Logger.error('Failed to send infraction alert to user ' + message.author.id + '.')
                    })
        
                })
            }

            // Run the message past the antispammer before doing anything else.
            let check = Antispam.scanner(message);

            if (check) return false; // Don't process this message if the user has been muted.
    
            if (!message.content.startsWith(client.CONFIG.prefix)) return;
    
            Logger.log(`[DEBUG]: Received message.`);
            
            let args = message.content.slice(client.CONFIG.prefix.length).trim().split(/ +/g);
            let command = args.shift().toLowerCase();
            if (!MessageDeleted || command == "wb-change") {
                // Do command handling.
                client.Commands.forEach( (element) => {
                    if (element.commands[command] !== undefined) {
                        // Command exists.
                        Logger.log('Command executed: ' + command)
                        return element.commands[command].exec_function(message, args, Discord, client);
                    }
                })
            }
             
        }).catch ( (err) => {
            Logger.log(err);
            
            // Run the message past the antispammer before doing anything else.
            let check = Antispam.scanner(message);

            if (check) return false; // Don't process this message if the user has been muted.

            if (!message.content.startsWith(client.CONFIG.prefix)) return;
    
            console.log(`[DEBUG]: Received message.`);
        
            let args = message.content.slice(client.CONFIG.prefix.length).trim().split(/ +/g);
            let command = args.shift().toLowerCase();
        
            // Do command handling.
            client.Commands.forEach( (element) => {
                if (element.commands[command] !== undefined) {
                    // Command exists.
                    Logger.log('Command executed: ' + command)
                    return element.commands[command].exec_function(message, args, Discord, client);
                }
            })
        });
    })
    
    client.on('guildMemberUpdate', (olduser, newuser) => {
        if (newuser.guild === null) return;
        let Store = new DataStore(newuser.guild.id)
    
        Logger.log('Guild member object updated on guild ID ' + newuser.guild.id + '.')
        Store.getObject('word-blacklist').then ( (blacklistwords) => {
            let blacklisted = blacklistwords[0].value.split(',');
            var MessageDeleted = false;
    
            blacklisted.forEach( (blacklistWord) => {
                if (newuser.user.tag.includes(blacklistWord)) {
                    // Whoops naughty.
                    //newmsg.delete();
                    MessageDeleted = true;
                }
            })
    
            if (MessageDeleted) {
    
                Logger.log('Word blacklist triggered over GUILD_MEMBER_UPDATE event, user ' + newuser.id + ' on guild ' + newuser.guild.id + ".")
                // Add infraction.
                //var msg = oldmsg;
                Store.addInfraction(newuser.id, client.user.id, 'warn', '[AUTOMOD] Nickname word blacklist.').then( (infractionID) => {
                    let WarnEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('New Infraction')
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .setDescription('You have received an infraction in ' + newuser.guild.name + '.')
                    .addField('Type', 'warn', true)
                    .addField('Infraction ID', infractionID, true)
                    .addField('Reason', '[AUTOMOD] Nickname word blacklist.' , true);
        
    
                    let warnedUser = client.users.cache.get(newuser.id);
                
                    Store.getObject('infraction-log').then( (v) => {
                        let InfractionEmbed = new Discord.MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('New warning for ' + newuser.user.tag)
                            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                            .addField('Punished', newuser.user.tag + " (" + newuser.user.id + ")" , true)
                            .addField('Punisher', client.user.tag + " (" + client.user.id + ")", true)
                            .addField('Reason', '[AUTOMOD] Nickname word blacklist.' , true);
        
                        client.guilds.cache.get(newuser.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                        
                    });
    
                    client.users.cache.get(newuser.id).send(WarnEmbed).then( () => {
                        Logger.log('Infraction alert sent to user ' + newuser.id + ' successfully.')
                    }).catch( (err) => {
                        Logger.error('Failed to send infraction alert to user ' + newuser.id + '.')
                    })
        
                })
            } else {
    
            }
        }).catch ( (err) => {
            Logger.error('Failed to run blacklist check on GUILD_MEMBER_UPDATE event.')
            Logger.error(err)
        });
    })
    
    client.on('messageUpdate', (oldmsg, newmsg) => {
        if (newmsg.guild === null) return;
        let Store = new DataStore(newmsg.guild.id)
    
        Logger.log('Message update event on guild ' + oldmsg.guild.id + '.')
    
        Store.getObject('regex-role-whitelist').then( (w) => {
            // w[0].value!
            let ok = false;
            //console.log(w)
            let wlarray = JSON.parse(w[0].value, reviver);

            
            //console.log(wlarray

            wlarray["whitelist"].forEach( (roleid) => {
                if (newmsg.member.roles.cache.get(roleid)) {
                    // Got it!
                    ok = true;
                }
            });

            // Check if user is whitelisted.
            if (!ok) {
                // Scathe user.
                Store.getObject('regex-blacklist').then( (v) => {
                    // v[0].value!
        
                    // Parse JSON string.
                    let rgBlacklist = JSON.parse(v[0].value, reviver)
                    let deleted = false;
                    
                    for (const i in rgBlacklist["blacklist"]) {
                        // Iterate through blacklist
                        let regex = rgBlacklist["blacklist"][i]
        
                        // Now that we have our regex we can check it against our string.
                        let searching = newmsg.content.search(regex);
                        //console.log(searching)
                        if (searching > -1) {
                            // Regex blacklist tripped.
                            //console.log('REGEX BLACKLIST TRIPPED')
        
                            newmsg.delete();
                            deleted = true;
                            
                        }
                    }
        
                    if (deleted) {
                        // Add infraction, warn user etc.
                        Logger.log('Regexp blacklist triggered over MESSAGE event, user ' + newmsg.author.id + ' on guild ' + newmsg.guild.id + ".")
            
                        Store.addInfraction(newmsg.author.id, client.user.id, 'warn', '[AUTOMOD] Regex blacklist.').then( (infractionID) => {
                            let WarnEmbed = new Discord.MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('New Infraction')
                            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                            .setDescription('You have received an infraction in ' + newmsg.guild.name + '.')
                            .addField('Type', 'warn', true)
                            .addField('Infraction ID', infractionID, true)
                            .addField('Reason', '[AUTOMOD] Regex blacklist.' , true);
            
                            Store.getObject('infraction-log').then( (v) => {
                                let InfractionEmbed = new Discord.MessageEmbed()
                                    .setColor('#ff0000')
                                    .setTitle('New warning for ' + newmsg.author.tag)
                                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                                    .addField('Punished', newmsg.author.tag + " (" + newmsg.author.id + ")" , true)
                                    .addField('Punisher', newmsg.user.tag + " (" + newmsg.user.id + ")", true)
                                    .addField('Reason', '[AUTOMOD] Regex blacklist.' , true);
                
                                client.guilds.cache.get(newmsg.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                                
                            });
                
                            client.users.cache.get(newmsg.author.id).send(WarnEmbed).then( () => {
                                Logger.log('Infraction alert sent to user ' + newmsg.author.id + ' successfully.')
                            }).catch( (err) => {
                                Logger.error('Failed to send infraction alert to user ' + newmsg.author.id + '.')
                            })
                
                        })
                    }
                })
            }
        }).catch( (err) => {
            Logger.error('Failed to do regexp whitelist.')
            Logger.error(err);
            console.log(err)
        })
        
        Store.getObject('message-log').then( (v) => {
            // v[0].value is the ID.
            var channelID = v[0].value.toString();
            
            let JoinEmbed = new Discord.MessageEmbed()
                .setColor('#ffff00')
                .setTitle("Message edited in #" + oldmsg.channel.name)
                .setAuthor(oldmsg.author.tag + " (" + oldmsg.author.id + ")", oldmsg.author.displayAvatarURL())
                .addField('Old Message', oldmsg.content)
                .addField('New Message', newmsg.content)
                .setFooter('Message ID: ' + oldmsg.id)
                .setTimestamp();
            
            client.guilds.cache.get(oldmsg.guild.id).channels.cache.get(channelID).send(JoinEmbed);
        }).catch( (err) => {
            //console.log(err);
        })
    
        Store.getObject('word-blacklist').then ( (blacklistwords) => {
            let blacklisted = blacklistwords[0].value.split(',');
            var MessageDeleted = false;
    
            blacklisted.forEach( (blacklistWord) => {
                if (newmsg.content.includes(blacklistWord)) {
                    // Whoops naughty.
                    newmsg.delete();
                    MessageDeleted = true;
                }
            })
    
            if (MessageDeleted) {
                Logger.log('Word blacklist triggered over MESSAGE_UPDATE event, user ' + newmsg.author.id + ' on guild ' + newmsg.guild.id + ".")
                // Add infraction.
                var msg = oldmsg;
                Store.addInfraction(msg.author.id, client.user.id, 'warn', '[AUTOMOD] Word blacklist.').then( (infractionID) => {
                    let WarnEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('New Infraction')
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .setDescription('You have received an infraction in ' + oldmsg.guild.name + '.')
                    .addField('Type', 'warn', true)
                    .addField('Infraction ID', infractionID, true)
                    .addField('Reason', '[AUTOMOD] Word blacklist.' , true);
        
    
                    let warnedUser = client.users.cache.get(uid);
                
                    Store.getObject('infraction-log').then( (v) => {
                        let InfractionEmbed = new Discord.MessageEmbed()
                            .setColor('#ff0000')
                            .setTitle('New warning for ' + warnedUser.tag)
                            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                            .addField('Punished', warnedUser.tag + " (" + warnedUser.id + ")" , true)
                            .addField('Punisher', client.user.tag + " (" + client.user.id + ")", true)
                            .addField('Reason', '[AUTOMOD] Word blacklist.' , true);
        
                        client.guilds.cache.get(msg.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                        
                    });
    
                    client.users.cache.get(msg.author.id).send(WarnEmbed).then( () => {
                        Logger.log('Infraction alert sent to user ' + msg.author.id + ' successfully.')
                    }).catch( (err) => {
                        Logger.error('Failed to send infraction alert to user ' + msg.author.id + '.')
                    })
        
                })
            } else {
    
            }
        }).catch ( (err) => {
            // Do nothing.
        });
    })
    
    client.on('guildMemberAdd', (member) => {
        // Get the guild's DataStore, get their join-log property.
        let Store = new DataStore(member.guild.id);
    
        Store.getObject('join-log').then( (v) => {
            // v[0].value is the ID.
            var channelID = v[0].value.toString();
    
            const ONE_DAY = 1000 * 60 * 60 * 24;
    
            let createDate = new Date(member.user.createdAt);
    
            let createDays = Math.round(Math.abs(new Date() - createDate) / ONE_DAY);
    
            let JoinEmbed = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setTitle(member.user.tag + " joined.")
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                .setThumbnail(member.user.displayAvatarURL())
                .setDescription('*<@!' + member.user.id + '> joined the server.*')
                .addField('Created', createDate.toUTCString() + "\n(" + createDays + " days ago)" , false);
    
            console.log(channelID);
    
            client.guilds.cache.get(member.guild.id).channels.cache.get(channelID).send(JoinEmbed);
        }).catch( (err) => {
            Logger.error('Error encountered while trying to add to join log for guild ' + member.guild.id)
            Logger.error(err);
        })
    
    })
    
    client.on('guildMemberRemove', (member) => {
        // Get the guild's DataStore, get their join-log property.
        let Store = new DataStore(member.guild.id);
    
        Store.getObject('join-log').then( (v) => {
            // v[0].value is the ID.
            var channelID = v[0].value.toString();
    
            const ONE_DAY = 1000 * 60 * 60 * 24;
    
            let createDate = new Date(member.user.createdAt);
    
            let createDays = Math.round(Math.abs(new Date() - createDate) / ONE_DAY);
    
            let roleList = "";
    
            let i = 0;
    
            let JoinEmbed = new Discord.MessageEmbed()
                .setColor('#0000ff')
                .setTitle(member.user.tag + " left.")
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                .setThumbnail(member.user.displayAvatarURL())
                .setDescription('*<@!' + member.user.id + '> left the server.*')
                //.addField('Created', createDate.toUTCString() + "\n(" + createDays + " days ago)" , false)
                .addField('Roles', member.roles.cache.map(r => `${r}`).join(', '));
    
    
            client.guilds.cache.get(member.guild.id).channels.cache.get(channelID).send(LeaveEmbed).catch(O_o=>{});
        }).catch( (err) => {
            Logger.error('Error encountered while trying to add to join log for guild ' + member.guild.id)
            Logger.error(err);
        })
    
    })
    
    client.on('messageDelete', (msg) => {
    
        if (msg.author.bot) return;
    
        if (msg.guild.id === null) return; // Potential API issue?
    
        let Store = new DataStore(msg.guild.id);
    
        Store.getObject('message-log').then( (v) => {
            // v[0].value is the ID.
            var channelID = v[0].value.toString();
    
            let JoinEmbed = new Discord.MessageEmbed()
                .setColor('#ff0000')
                .setTitle("Message deleted in #" + msg.channel.name)
                .setAuthor(msg.author.tag + " (" + msg.author.id + ")", msg.author.displayAvatarURL())
                .setDescription(msg.content)
                .setFooter('Message ID: ' + msg.id)
                .setTimestamp();
    
            client.guilds.cache.get(msg.guild.id).channels.cache.get(channelID).send(JoinEmbed);
        }).catch( (err) => {
            Logger.error('Error encountered while trying to add to message log for guild ' + msg.guild.id)
            Logger.error(err);
        })
    })
    
    // Login client.
    client.login(process.env.RHEA_TOKEN);
    
    // Start websocket interface.
    
    if (client.CONFIG.enableWebsocket) {
        app.listen(63228, '127.0.0.1', () => {
            console.log(`[DEBUG]: Websocket client for bot management started.`);
        });
        
        
        io.on('connection', async (socket) => {
            if (client.user === null) {
    
                socket.emit('command_output', "[FATAL]: Token environment variable was not specified on launch. Please use the command 'reconnect' in order to start the bot.")
    
                socket.emit('connect_OK', {
                    "clientTag": "NOT CONNECTED",
                    "version": VERSION
                })
    
                
            } else {
                socket.emit('connect_OK', {
                    "clientTag": client.user.tag || "NOT CONNECTED",
                    "version": VERSION
                })
            }
        
            socket.on('command', async (data) => {
                if (data.cmd == "ping") {
                    socket.emit('command_output', 'Pong!');
                    socket.emit('command_done');
                } else if (data.cmd == "reconnect") {
                    let newTok = data.args[0] || process.env.RHEA_TOKEN;
        
                    if (data.args[0]) socket.emit('command_output', "Reconnecting with provided token..."); else socket.emit('command_output', "Reconnecting with environment variable token...");
                    
                    client.destroy();
        
                    client.login(newTok).then( () => {
                        socket.emit('command_output', "Reconnect OK.")
                        socket.emit('command_done');
                    })
                } else if (data.cmd == "get-property") {
                    if (!data.args[0] || data.args[0].length != 18) {
                        socket.emit('command_output', "Usage: get-property <guild-id> <property-name>"); 
                        return socket.emit('command_done');
                    }
    
                    if (!data.args[1]) {
                        socket.emit('command_output', "Usage: get-property <guild-id> <property-name>"); 
                        return socket.emit('command_done');
                    }
    
                    let Store = new DataStore(data.args[0]);
    
                    Store.getObject(data.args[1]).then( (v) => {
                        socket.emit('command_output', data.args[0] + ": " + data.args[1] + " = " + v[0].value);
                        return socket.emit('command_done');
                    }).catch( (err) => {
                        // Error.
                        socket.emit('command_error', "Failed to get property " + data.args[1] + " for guild ID " + data.args[0] + ".");
                        return socket.emit('command_done');
                    })
                } else if (data.cmd == "wipeall-regexp") {
                    if (!data.args[0] || data.args[0].length != 18) {
                        socket.emit('command_output', "Usage: wipeall-regexp <guild-id>"); 
                        return socket.emit('command_done');
                    }
                    
                    let Store = new DataStore(data.args[0]);

                    Store.updateObject('regex-blacklist', JSON.stringify({"blacklist":[]})).then( () => {
                        socket.emit('command_output', "Wiped regexp blacklist of guild" + data.args[0] + '.'); 
                        return socket.emit('command_done');
                    }).catch( () => {
                        socket.emit('command_output', "Failed to wipe regexp blacklist of guild" + data.args[0] + '.'); 
                        return socket.emit('command_done');
                    })
                } else if (data.cmd == "remove-regexp") {
                    if (!data.args[0] || data.args[0].length != 18) {
                        socket.emit('command_output', "Usage: add-regexp <guild-id> <regexp>"); 
                        return socket.emit('command_done');
                    }
    
                    if (!data.args[1]) {
                        socket.emit('command_output', "Usage: add-regexp <guild-id> <regexp>"); 
                        return socket.emit('command_done');
                    }

                    Store.getObject('regex-blacklist').then( () => {
                        // v[0].value!
                        try {
                            let change = JSON.parse(v[0].value, reviver);
                        } catch {
                            let change = {
                                "blacklist": []
                            }
                        }
            
                        var flags = data.args[1].replace(/.*\/([gimy]*)$/, '$1');
                        var pattern = data.args[1].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
                        var regex = new RegExp(pattern, flags);
            
                        // Once parsed, do arrayRemove (thanks zer0!)
                        change = change.filter(function (ele) {
                            return ele != regex;
                        });
            
                        // Write changes.
                        Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                            socket.emit('command_output', "Removed regexp from guild " + data.args[0] + '.'); 
                            return socket.emit('command_done');
                        })
                    })

                } else if (data.cmd == "add-regexp") {
                    if (!data.args[0] || data.args[0].length != 18) {
                        socket.emit('command_output', "Usage: add-regexp <guild-id> <regexp>"); 
                        return socket.emit('command_done');
                    }
    
                    if (!data.args[1]) {
                        socket.emit('command_output', "Usage: add-regexp <guild-id> <regexp>"); 
                        return socket.emit('command_done');
                    }

                    // User is an admin.
                    let Store = new DataStore(data.args[0]);

                    Store.getObject('regex-blacklist').then( (v) => {
                        // v[0].value!
                        try {
                            let change = JSON.parse(v[0].value, reviver);
                        } catch {
                            let change = {
                                "blacklist": []
                            }
                        }
                
    
                        var flags = data.args[1].replace(/.*\/([gimy]*)$/, '$1');
                        var pattern = data.args[1].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
                        var regex = new RegExp(pattern, flags);
    
                        change["blacklist"].push(regex);
    
                        Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                            socket.emit('command_output', "Added new regexp to guild " + data.args[0] + '.'); 
                            return socket.emit('command_done');
                        })
                    }).catch( () => {
                        // Failed to get object, therefore object must not exist so create it.
                        let change = {
                            "blacklist": []
                        }
    
                        var flags = data.args[1].replace(/.*\/([gimy]*)$/, '$1');
                        var pattern = data.args[1].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
                        var regex = new RegExp(pattern, flags);
    
                        change["blacklist"].push(regex);
    
                        Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                            socket.emit('command_output', "Added new regexp to guild " + data.args[0] + '.'); 
                            return socket.emit('command_done');
                        });
                    });
                } else if (data.cmd == "set-property") {
                    if (!data.args[0] || data.args[0].length != 18) {
                        socket.emit('command_output', "Usage: set-property <guild-id> <property-name> <value>"); 
                        return socket.emit('command_done');
                    }
    
                    if (!data.args[1]) {
                        socket.emit('command_output', "Usage: set-property <guild-id> <property-name> <value>"); 
                        return socket.emit('command_done');
                    }
    
                    let Store = new DataStore(data.args[0]);
    
                    Store.updateObject(data.args[1], data.args[2]).then( () => {
                        socket.emit('command_output', data.args[0] + ": " + data.args[1] + " is now set to " + data.args[2]);
                        return socket.emit('command_done');
                    }).catch( (err) => {
                        // Error.
                        socket.emit('command_error', "Failed to set property " + data.args[1] + " to " + data.args[2] + " for guild ID " + data.args[0] + ".");
                        return socket.emit('command_done');
                    })
                    
                } else if (data.cmd == "stop") {
                    socket.emit('command_output', "Stopping...");
                    client.destroy();
                    socket.emit('command_output', "Goodbye.");
                    await io.emit('goodbye');
                    socket.disconnect();
                    process.exit(0);
                } else if (data.cmd == "help") {
                    socket.emit('command_output', "Rhea Help\n---------\n\nhelp - Get this message\nreconnect [token] - reconnect. if token specified, will reconnect using that token.\nping - ping the bot\nstop - stop the bot\ninfo - get connection info\nset-property <guild-id> <property> <value> - set the value of a property of a guild.\nadd-regexp <guild-id> <regexp> - add a regular expression to a guild's regexp blacklist, used for regexps > 2000 chars.\nremove-regexp <guild-id> <regexp> - remove a regexp from a guild's regexp blacklist, used for regexps > 2000 characters\nwipeall-regexp <guild-id> - will wipe all regexp blacklist entries from a guild, used if a guild's blacklist is causing errors.\nget-property <guild-id> <property> - get the value of a property of a guild.\nexit - exit the Rhea CLI")
                    socket.emit('command_done')
                } else if (data.cmd == "info") {
                    if (client.user === null) {
                        socket.emit('command_output', 'Bot is NOT CONNECTED, so no information is available.');
                        socket.emit('command_done');
                    } else {
                        socket.emit('command_output', "Rhea Connection Info")
                        socket.emit('command_output', "--------------------")
                        socket.emit('command_output', "Connected as user " + client.user.tag + " (id: " + client.user.id + ")");
                        socket.emit('command_done');
                    }
                } else {
                    socket.emit('command_error', 'Bad command.');
                    socket.emit('command_done');
                }
        
                
            })
        })
    }
} catch (err) {
    let LA = require('./common/Logging')
    let Logger = new LA('processor-error');

    Logger.error('Failed to load bot or failed during execution.')
    Logger.error(err)
}    
