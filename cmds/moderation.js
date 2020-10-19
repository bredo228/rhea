'use strict';

const DataStore = require('../db/sqlite');
let LA = require('../common/Logging')
let Logger = new LA('moderation');

const moment = require('moment');

function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return mention;
	}
}


module.exports = {
    'name': 'Moderation',
    'description': 'Moderation commands.',
    'commands': {}
}

module.exports.commands['warn'] = {
    'pretty_name': 'warn <user-id> <reason>',
    'description': 'Warn a user.',
    'exec_function': function(message, args, Discord, client) {
        // Check if user ID is present.
        if (args[0] === undefined) return message.channel.send('**ERROR: Need to specify user ID.**');
        if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Insufficient permissions.')

        var uid = args[0]

        if (args[0].length != 18) {
            //console.log("poo")
            uid = getUserFromMention(args[0]);
        }

        var VerifyUserExists = client.users.cache.some(user => user.id === uid);

        if (!VerifyUserExists) {
            // User doesn't exist.
            return message.channel.send('**FAIL**: User is not a member of this guild.')
        }

        var user = message.guild.member(uid);

        //console.log(message.member)
        if (message.author.id != message.guild.owner.id) {
            if (message.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) {
                // Oop.
                return message.channel.send('**FAIL**: Cannot kick as user has higher role than you.')
            }
        } 

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        Store.addInfraction(uid, message.author.id, "warn", reasonMsg).then( (infractionID) => {
            message.channel.send(`**SUCCESS:** User ${uid} warned successfully.`)

            let warnedUser = client.users.cache.get(uid);

            let WarnEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle('New Infraction')
            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
            .setDescription('You have received an infraction in ' + message.guild.name + '.')
            .addField('Type', 'warn', true)
            .addField('Infraction ID', infractionID, true)
            .addField('Reason', reasonMsg , true);

            Store.getObject('infraction-log').then( (v) => {
                let InfractionEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('New warning for ' + warnedUser.tag)
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punished', warnedUser.tag + " (" + warnedUser.id + ")" , true)
                    .addField('Punisher', message.author.tag + " (" + message.author.id + ")", true)
                    .addField('Reason', reasonMsg , true);

                client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                
            });

            
            warnedUser.send(WarnEmbed).then( () => {
                Logger.log('Sent infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
            }).catch( (err) => {
                Logger.error('Failed to send infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
            })
        }).catch( (err) => {
            message.channel.send(`**FAIL**: Something broke. Check logs.`);
            Logger.error('Failed to add infraction for user ' + uid + ' in guild ' + message.guild.id + '.')
            Logger.error(err);
        })
    }
}

module.exports.commands['search'] = {
    'pretty_name': 'search <user-id>',
    'description': "Get a list of a user's infractions.",
    'exec_function': async function(message, args, Discord, client) {
        if (args[0] === undefined) return message.channel.send('**ERROR: Need to specify user ID.**');
        if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Insufficient permissions.')

        var uid = args[0];

        if (args[0].length != 18) {
            uid = getUserFromMention(args[0]);
        }

        // Open DataStore and get infractions by User Id.

        let Store = new DataStore(message.guild.id);

        Store.getInfractionsByUser(uid).then( (infractions) => {
            // Create embed.
            let EmbedMsg = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setTitle('Infractions for User ID ' + uid)
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture);

            //let i = 0;
            var spliceLimit = 0;
            var infractions2 = infractions;

            if (spliceLimit != infractions.length) {
                infractions.splice(spliceLimit).every( (infraction, index) => {
                    EmbedMsg.addField(infraction.infractionID + " - type: " + infraction.type, infraction.reason);
                    
                    //console.log(infraction)
                    //console.log(index)
                    if (index == 5 || spliceLimit == infractions.length) {
                        // Exit cause I is greater than limit.
                        //console.log(`[DEBUG]: i > limit`)
                        return false;
                    } else return true;
                });
            } else {
                spliceLimit = spliceLimit - 1;
                infractions.splice(spliceLimit).every( (infraction, index) => {
                    EmbedMsg.addField(infraction.infractionID + " - type: " + infraction.type, infraction.reason);
                    
                    //console.log(infraction)
                    //console.log(index)
                    if (index == 5 || spliceLimit == infractions.length) {
                        // Exit cause I is greater than limit.
                        //console.log(`[DEBUG]: i > limit`)
                        return false;
                    } else return true;
                });
            }

            
            let Msg = message.channel.send(EmbedMsg).then( (msg) => {
                let filter = (reaction, user) => {
                    return ['❌', '⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
                };

                function populateReact() {
                    msg.react('❌')
                        .then( () => msg.react('⬅️'))
                        .then( () => msg.react('➡️'))
                        .catch( () => msg.channel.send('**FAIL**: Failed to post one or more reactions - you may have issues navigating the infractions list.'));
                        
                    let collector = msg.createReactionCollector(filter, {time: 60000});

                    collector.on('collect', (reaction) => {

                        //console.log(`[DEBUG]: Received react ${reaction.emoji.name}`)

                        if (reaction.emoji.name === '❌') {
                            collector.stop();
                        } else if (reaction.emoji.name === '⬅️') {
                            if (spliceLimit == 0) {
                                // Oops, can't go left!
                                reaction.users.remove(reaction.users.cache.filter(u => u === message.author).first());
                            } else {
                                // Can go left!
                                spliceLimit--;
                                // Reload.
                                reaction.users.remove(reaction.users.cache.filter(u => u === message.author).first());
                                //populateReact();
                                EmbedMsg = new Discord.MessageEmbed()
                                    .setColor('#00ff00')
                                    .setTitle('Infractions for User ID ' + uid)
                                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture);

                                Store.getInfractionsByUser(uid).then( (infractions) => {
                                    infractions.splice(spliceLimit).every( (infraction, index) => {
                                        EmbedMsg.addField(infraction.infractionID + " - type: " + infraction.type, infraction.reason);
                                            
                                        //console.log(infraction)
                                        //console.log(index)
                                        if (index == 5 || spliceLimit == infractions.length) {
                                            // Exit cause I is greater than limit.
                                            //console.log(`[DEBUG]: i > limit`)
                                            return false;
                                        } else return true;
                                    });
    
                                    msg.edit(EmbedMsg)
                                });

                            }
                        } else if (reaction.emoji.name === '➡️') {
                            if (spliceLimit == 5) {
                                // Oops, can't go right!
                                //console.log(`[DEBUG]: Can't go right on infraction log.`)
                                reaction.users.remove(reaction.users.cache.filter(u => u === message.author).first());
                                //populateReact();
                            } else {
                                // Can go left!
                                spliceLimit = spliceLimit + 1;
                                //console.log(spliceLimit)
                                // Reload.
                                reaction.users.remove(reaction.users.cache.filter(u => u === message.author).first());
                                //populateReact();

                                EmbedMsg = new Discord.MessageEmbed()
                                    .setColor('#00ff00')
                                    .setTitle('Infractions for User ID ' + uid)
                                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture);
                                
                                Store.getInfractionsByUser(uid).then( (infractions) => {
                                    if (spliceLimit != infractions.length) {
                                        infractions.splice(spliceLimit).every( (infraction, index) => {
                                            EmbedMsg.addField(infraction.infractionID + " - type: " + infraction.type, infraction.reason);
                                            
                                            //console.log(infraction)
                                            //console.log(index)
                                            if (index == 6) {
                                                // Exit cause I is greater than limit.
                                                //console.log(`[DEBUG]: i > limit`)
                                                return false;
                                            } else return true;
                                        });
                                    } else {
                                        spliceLimit = spliceLimit - 1;
                                        infractions.splice(spliceLimit).every( (infraction, index) => {
                                            EmbedMsg.addField(infraction.infractionID + " - type: " + infraction.type, infraction.reason);
                                            
                                            //console.log(infraction)
                                            //console.log(index)
                                            if (index == 6 || spliceLimit == infractions.length) {
                                                // Exit cause I is greater than limit.
                                                //console.log(`[DEBUG]: i > limit`)
                                                return false;
                                            } else return true;
                                        });
                                    }
    
                                    msg.edit(EmbedMsg)
                                });
                            }
                        }
                    })

                    collector.on('end', () => {
                        msg.delete();
                    })
                        
                    return;
                }

                populateReact();
            });
        }).catch( (err) => {
            message.channel.send('**FAIL**: An error occurred while processing your request. Report this to the bot owner.');
            Logger.error('Failure during user punishment search: user ' + uid + ', guild ID ' + message.guild.id + ".")
            Logger.error(err);
        })
    }
}

module.exports.commands['mute'] = {
    'pretty_name': 'mute <user-id> <time> <reason>',
    'description': 'Mute a user for a defined timeperiod.',
    'exec_function': async function(message, args, Discord, client) {
        // Check privileges etc. before muting.
        if (args[0] === undefined) return message.channel.send('**ERROR: Need to specify user ID.**');
        if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Insufficient permissions.')

        var uid = args[0]

        if (args[0].length != 18) {
            //console.log("poo")
            uid = getUserFromMention(args[0]);
        }

        var VerifyUserExists = client.users.cache.some(user => user.id === uid);

        if (!VerifyUserExists) {
            // User doesn't exist.
            return message.channel.send('**FAIL**: User is not a member of this guild.')
        }

        var user = message.guild.member(uid);

        //console.log(message.member)
        if (message.author.id != message.guild.owner.id) {
            if (message.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) {
                // Oop.
                return message.channel.send('**FAIL**: Cannot kick as user has higher role than you.')
            }
        } 

        let reasonMsg = args.slice(2,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        // now lets do crazy shit to get the time
        let time = args[1].split('/')

        // if only one entry, then we're dealing with hours - if two, hours and minutes... if three, hours and minutes AND seconds!


        
        // We have hours and minutes, ignore seconds because bruh.
        try {
            var hours;
            var minutes;
            var seconds;

            var genePool = 0;

            //console.log(time);

            for (const i in time) {
                //console.log(i)
                //console.log(time[i])
                if (i == 0) {
                    // hours
                    //console.log('h')
                    genePool = genePool + (time[i] * 3600000) ;
                    //console.log(genePool)
                } else if (i == 1) {
                    // minutes
                    //console.log('m')
                    genePool = genePool + (time[i] * 60000);
                    //console.log(genePool)
                } else if (i == 2) {
                    // sec onds
                    //console.log('s')
                    genePool = genePool + (time[i] * 1000);
                    //console.log(genePool)
                }
            }

            let totalLength = genePool;


            //console.log("tl")
            //
            //console.log(genePool)
            // Do actual mute
            client.antispam.muteUser(message.guild.id, args[0], message.author.id, totalLength, reasonMsg);
            message.channel.send('**SUCCESS:** Muted user ID ' + args[0] + '.')
        } catch (exc) {
            Logger.error(exc);
            return message.channel.send('Failed to parse mute length - make sure you typed it properly.');
        }

    }
}

module.exports.commands['punishinfo'] = {
    'pretty_name': 'punishinfo <infraction-id>',
    'description': "Get more information about an infraction.",
    'exec_function': async function(message, args, Discord, client) {
        if (args[0] === undefined) return message.channel.send('**ERROR:** Need to specify infraction ID.')
        if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Insufficient permissions.')


        let Store = new DataStore(message.guild.id);

        Store.getInfractionsByID(args[0]).then( (punishInfo) => {

            if (punishInfo[0] === undefined) return message.channel.send('**FAIL:** This infraction does not exist.')
            //console.log(punishInfo[0])
            client.users.fetch(punishInfo[0].userID).then( (User) => {
                //console.log(User)
                client.users.fetch(punishInfo[0].moderatorID).then( (Moderator) => {
                
                    let InfoEmbed = new Discord.MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('Information about Infraction ID ' + args[0])
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punishment Type', punishInfo[0].type, true)
                    .addField('Punished User', User.username + '#' + User.discriminator + ' (' + User.id + ')', true)
                    .addField('Punisher', Moderator.username + '#' + Moderator.discriminator + ' (' + Moderator.id + ')', true)
                    .addField('Reason', punishInfo[0].reason , true);

                    message.channel.send(InfoEmbed)
                }).catch( (err) => {
                    let InfoEmbed = new Discord.MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('Information about Infraction ID ' + args[0])
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punishment Type', punishInfo[0].type, true)
                    .addField('Punished User', User.username + '#' + User.discriminator + ' (' + User.id + ')', true)
                    .addField('Punisher', 'User Left' + ' (' + punishInfo[0].moderatorID + ')', true)
                    .addField('Reason', punishInfo[0].reason , true);

                    message.channel.send(InfoEmbed)
                })
            }).catch ( (err) => {
                client.users.fetch(punishInfo[0].moderatorID).then( (Moderator) => {
                
                    let InfoEmbed = new Discord.MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('Information about Infraction ID ' + args[0])
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punishment Type', punishInfo[0].type, true)
                    .addField('Punished User', 'User Left' +  ' (' + punishInfo[0].userID + ')', true)
                    .addField('Punisher', Moderator.username + '#' + Moderator.discriminator + ' (' + Moderator.id + ')', true)
                    .addField('Reason', punishInfo[0].reason , true);

                    message.channel.send(InfoEmbed)
                }).catch( (err) => {
                    Logger.error('Failed to get user information for either ' + punishInfo[0].userID + ' or ' + punishInfo[0].moderatorID + ', guild ID ' + message.guild.id + '.')
                    Logger.error(err)
                    let InfoEmbed = new Discord.MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('Information about Infraction ID ' + args[0])
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punishment Type', punishInfo[0].type, true)
                    .addField('Punished User', 'User Left' +  ' (' + punishInfo[0].userID + ')', true)
                    .addField('Punisher', 'User Left' + ' (' + punishInfo[0].moderatorID + ')', true)
                    .addField('Reason', punishInfo[0].reason , true);

                    message.channel.send(InfoEmbed)
                })
            });




            

        }).catch( (err) => {
            Logger.error('Failed to get punishment information, guild ID ' + message.guild.id + ', infraction ID ' + args[0] + '.')
            Logger.error(err)
            message.channel.send('**FAIL**: An error occurred while processing your request. Report this to the bot owner.');
        });
        
    }
}

module.exports.commands['kick'] = {
    'pretty_name': 'kick <user-id> <reason>',
    'description': "Kick a user - you need KICK_MEMBERS permission to use this command.",
    'exec_function': async function(message, args, Discord, client) {
        if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Lack of permissions.')
        if (args[0] === undefined) return message.channel.send('**FAIL:** Must provide user ID to kick.');

        var uid = args[0];

        if (args[0].length != 18) {
            uid = getUserFromMention(args[0]);
        }

        // User has permission.
        var VerifyUserExists = client.users.cache.some(user => user.id === uid);

        if (!VerifyUserExists) {
            // User doesn't exist.
            return message.channel.send('**FAIL**: User is not a member of this guild.')
        }

        var user = message.guild.member(uid);

        if (message.author.id != message.guild.owner.id) {
            if (message.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) {
                // Oop.
                return message.channel.send('**FAIL**: Cannot kick as user has higher role than you.')
            }
        } 

        // Kick the user.

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        Store.addInfraction(uid, message.author.id, "kick", reasonMsg).then( (infractionID) => {
            let KickEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle('New Infraction')
            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
            .setDescription('You have received an infraction in ' + message.guild.name + '.')
            .addField('Type', 'kick', true)
            .addField('Infraction ID', infractionID, true)
            .addField('Reason', reasonMsg , true);

            let warnedUser = client.users.cache.get(uid);

            Store.getObject('infraction-log').then( (v) => {
                let InfractionEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle(warnedUser.tag + " kicked")
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punished', warnedUser.tag + " (" + warnedUser.id + ")" , true)
                    .addField('Punisher', message.author.tag + " (" + message.author.id + ")", true)
                    .addField('Reason', reasonMsg , true);

                client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                
            });

            client.users.cache.get(uid).send(KickEmbed).then( () => {
                // Try kicking user.
                Logger.log('Sent infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
                message.guild.members.cache.get(uid).kick(reasonMsg).then( () => {
                    message.channel.send('**SUCCESS**: User kicked successfully.');
                }).catch( () => {
                    message.channel.send('**FAIL:** Could not kick user - they will, however, have a kick infraction.')
                })
            }).catch( (err) => {
                message.channel.send('*User does not have DMs open for this server or has blocked the bot - they will not receive any notification.*');
                Logger.error('Failed to send infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
                message.guild.members.cache.get(uid).kick(reasonMsg).then( () => {
                    message.channel.send('**SUCCESS**: User kicked successfully.');
                }).catch( () => {
                    message.channel.send('**FAIL:** Could not kick user - they will, however, have a kick infraction.')
                })
            })
        }).catch( (err) => {
            message.channel.send(`**FAIL**: Something broke. Check logs.`);
            Logger.error('Failed to add infraction for user ' + uid + ' in guild ' + message.guild.id + '.')
            Logger.error(err);
        })
        
    }
}

module.exports.commands['ban'] = {
    'pretty_name': 'ban <user-id> <reason>',
    'description': "Bans a user - you need BAN_MEMBERS permission to use this command.",
    'exec_function': async function(message, args, Discord, client) {
        if (!message.member.hasPermission('BAN_MEMBERS')) return message.channel.send('**FAIL**: Lack of permissions.')
        if (args[0] === undefined) return message.channel.send('**FAIL:** Must provide user ID to ban.');

        var uid = args[0];

        if (args[0].length != 18) {
            uid = getUserFromMention(args[0]);
        }
        
        // User has permission.
        var VerifyUserExists = client.users.cache.some(user => user.id === uid);

        if (!VerifyUserExists) {
            // User doesn't exist.
            return message.channel.send('**FAIL**: User is not a member of this guild.');
        }

        var user = message.guild.member(uid);

        if (message.author.id != message.guild.owner.id) {
            if (message.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) {
                // Oop.
                return message.channel.send('**FAIL**: Cannot kick as user has higher role than you.')
            }
        } 

        // Kick the user.

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        Store.addInfraction(uid, message.author.id, "kick", reasonMsg).then( (infractionID) => {
            let BanEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle('New Infraction')
            .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
            .setDescription('You have received an infraction in ' + message.guild.name + '.')
            .addField('Type', 'ban', true)
            .addField('Infraction ID', infractionID, true)
            .addField('Reason', reasonMsg , true);

            let warnedUser = client.users.cache.get(uid);

            Store.getObject('infraction-log').then( (v) => {
                let InfractionEmbed = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle(warnedUser.tag + " banned")
                    .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
                    .addField('Punished', warnedUser.tag + " (" + warnedUser.id + ")" , true)
                    .addField('Punisher', message.author.tag + " (" + message.author.id + ")", true)
                    .addField('Reason', reasonMsg , true);

                client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).send(InfractionEmbed);
                
            });

            client.users.cache.get(uid).send(BanEmbed).then( () => {
                // Try kicking user.
                Logger.log('Sent infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
                message.guild.members.cache.get(uid).ban().then( () => {
                    message.channel.send('**SUCCESS**: User banned successfully.');
                }).catch( (err) => {
                    message.channel.send('**FAIL:** Could not ban user - they will, however, have a ban infraction.')
                    console.log(err);
                })
            }).catch( (err) => {
                Logger.error('Failed to send infraction warning to user ' + uid + ' in guild ' + message.guild.id + '.')
                message.channel.send('*User does not have DMs open for this server or has blocked the bot - they will not receive any notification.*');
                message.guild.members.cache.get(uid).ban().then( () => {
                    message.channel.send('**SUCCESS**: User banned successfully.');
                }).catch( () => {
                    message.channel.send('**FAIL:** Could not ban user - they will, however, have a ban infraction.')
                })
            })
        }).catch( (err) => {
            message.channel.send(`**FAIL**: Something broke. Check logs.`);
            Logger.error('Failed to add infraction for user ' + uid + ' in guild ' + message.guild.id + '.')
            Logger.error(err);
        })
        
    }
}