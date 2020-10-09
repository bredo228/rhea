'use strict';

// Rhea
// Funey, 2020.


const VERSION = require('./package.json').version;

// Initialise bot libraries..

const Discord = require("discord.js");
const client = new Discord.Client();

// Configuration data.
client.CONFIG = require('./config.json')
const fs = require('fs');

// Initialise Logging/Socketing

function handler(req,res) {
    res.writeHead(500);
    res.end('Not an HTTP server.<br />Rhea Discord Bot Management Websocket');
}

if (client.CONFIG.enableWebsocket) {
    var app = require('http').createServer(handler)
    var io = require('socket.io')(app);
}




// Check if we've got a token.

if (process.env.RHEA_TOKEN === undefined) {
    // No token.
    console.warn(`[FATAL]: You need to specify the Environment Variable "RHEA_TOKEN" in order to start this bot.`);
    
    if (client.CONFIG.enableWebsocket) {
        console.warn(`[INFO]: Awaiting Management Interface connection...`)
    } else {
        console.warn(`[FATAL]: Exiting...`)
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
    console.log(`[DEBUG]: Rhea started, in ${client.guilds.size}.`);
})

client.on('message', (message) => {
    if (message.author.bot) return;

    // Check the word blacklist.

    if (message.guild.id === null) return; // Potential API issue?

    let Store = new DataStore(message.guild.id)

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
                    // Do nothing.
                }).catch( (err) => {
                    // Do nothing.
                })
    
            })
        }

        if (!message.content.startsWith(client.CONFIG.prefix)) return;

        console.log(`[DEBUG]: Received message.`);
        
        let args = message.content.slice(client.CONFIG.prefix.length).trim().split(/ +/g);
        let command = args.shift().toLowerCase();
        if (!MessageDeleted || command == "wb-change") {
            // Do command handling.
            client.Commands.forEach( (element) => {
                if (element.commands[command] !== undefined) {
                    // Command exists.
                    return element.commands[command].exec_function(message, args, Discord, client);
                }
            })
        }
         
    }).catch ( (err) => {
        console.log(err)
        if (!message.content.startsWith(client.CONFIG.prefix)) return;

        console.log(`[DEBUG]: Received message.`);
    
        let args = message.content.slice(client.CONFIG.prefix.length).trim().split(/ +/g);
        let command = args.shift().toLowerCase();
    
        // Do command handling.
        client.Commands.forEach( (element) => {
            if (element.commands[command] !== undefined) {
                // Command exists.
                return element.commands[command].exec_function(message, args, Discord, client);
            }
        })
    });
})

client.on('messageUpdate', (oldmsg, newmsg) => {
    if (newmsg.guild === null) return;
    let Store = new DataStore(newmsg.guild.id)


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
        console.log(err);
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
                    // Do nothing.
                }).catch( (err) => {
                    // Do nothing.
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
        console.log(err);
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
        console.log(err);
    })

})

client.on('messageDelete', (msg) => {

    if (message.author.bot) return;

    if (message.guild.id === null) return; // Potential API issue?

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
        console.log(err);
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
    
            } else if (data.cmd == "stop") {
                socket.emit('command_output', "Stopping...");
                client.destroy();
                socket.emit('command_output', "Goodbye.");
                await io.emit('goodbye');
                socket.disconnect();
                process.exit(0);
            } else if (data.cmd == "help") {
                socket.emit('command_output', "Rhea Help\n---------\n\nhelp - Get this message\nreconnect [token] - reconnect. if token specified, will reconnect using that token.\nping - ping the bot\nstop - stop the bot\ninfo - get connection info\nexit - exit the Rhea CLI")
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
