'use strict';

module.exports = {
    'name': 'Archival',
    'description': 'Commands for pin archival etc.',
    'commands': {}
}

const DataStore = require('../db/sqlite');
const sleep = require('util').promisify(setTimeout);

module.exports.commands['archive-pins'] = {
    'pretty_name': 'archive-pins',
    'description': 'Archives the pins for this channel into the set archival channel.',
    'exec_function': function(message, args, Discord, client) {
        // Check permissions and stuff before archival.
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');

        // Now archive.
        let Store = new DataStore(message.guild.id);

        Store.getObject('archive-channel').then( (v) => {
            // Got archival channel, prepare to send
            try {
                

                message.channel.messages.fetchPinned().then( (pinned) => {

                    let EmbedStream = new Set();

                    pinned.forEach( (msg) => {
                        
                        // Do looping for attachments.
                        let attachmentList = "";
                        let attI = 0;
                        let embedList = "";
                        let embI = 0;

                        //console.log(msg)

                        msg.attachments.forEach( (att) => {
                            attI++;
                            attachmentList += "[Attachment " + attI + " - " + att.name + "](" + att.url + ")\n";
                        })

                        msg.embeds.forEach( (emb) => {
                            embI++;
                            if (emb.type == "image") {
                                embedList += "[Embed " + embI + " (Image)](" + emb.url + ")\n"
                            } else if (emb.type == "gifv") {
                                embedList += "[Embed " + embI + " (GIF)](" + emb.url + ")\n"
                            } else if (emb.type == "article") {
                                embedList += "[Embed " + embI + " (Article)](" + emb.url + ")\n"
                            } else if (emb.type == "video") {
                                embedList += "[Embed " + embI + " (Video)](" + emb.url + ")\n"
                            } else if (emb.type == "link") {
                                embedList += "[Embed " + embI + " (Link)](" + emb.url + ")\n"
                            }
                        })

                        
                        var msgEmbed = new Discord.MessageEmbed()
                            .setColor('0000ff')
                            .setAuthor(msg.author.tag + "(in #" + msg.channel.name + ")", msg.author.displayAvatarURL())
                            .setDescription(msg.content)
                            .setTimestamp(msg.createdTimestamp)
                            .addField('Attachments', attachmentList || "*None*")
                            .addField('Embeds', embedList || "*None*");
                            //.setFooter('Brought to you by ' + BOT_CONFIG.bot_name);

                        EmbedStream.add(msgEmbed)

                    })

                    // Got all the messages.
                    let Holding = new Set();
                    let i = 0;

                    client.guilds.cache.get(message.guild.id).channels.cache.get(v[0].value.toString()).createWebhook('Pin Archival', client.CONFIG.botPicture)
                        .then(async (w) => {
                            EmbedStream.forEach( (mEmbed) => {
                                i++;
                                Holding.add(mEmbed);
                                if (Holding.size >= 5 || i >= EmbedStream.size) {
                                    //console.log("Hop")
                                    let items = Holding.values();
                                    //console.log(items.next().value)
                                    let i1 = items.next().value || undefined;
                                    let i2 = items.next().value || undefined;
                                    let i3 = items.next().value || undefined;
                                    let i4 = items.next().value || undefined;
                                    let i5 = items.next().value || undefined; 
                                    
                                    if (i1 === undefined) {
                                        // Do nothing.
                                    } else if (i2 === undefined) {
                                        w.send({ embeds: [ i1 ]});
                                    } else if (i3 === undefined) {
                                        w.send({ embeds: [ i1,i2]});
                                    } else if (i4 === undefined) {
                                        w.send({ embeds: [ i1,i2,i3]});
                                    } else if (i5 === undefined) {
                                        w.send({ embeds: [ i1,i2,i3,i4]});
                                    } else {
                                        w.send({ embeds: [ i1,i2,i3,i4,i5]});
                                    }
                                    
                                    Holding.clear();
                                    sleep(2000);
                                }
                            })
                            
                            message.channel.send('**SUCCESS**: Pins archived (enumerated and sent ' + i + ' messages) - run the delete pins command to clear the pins in this channel.')
                            message.channel.send('You may also want to remove the created webhook in <#' + v[0].value.toString() + '> as it may cause issues down the line.')

                            
                            //w.delete();
                        });



                })
            } catch (err) {
                message.channel.send('**FAIL**: Error encountered, report this error.')
            }
        }).catch( () => {
            message.channel.send('**FAIL**: Error encountered, are you sure you have an archival channel set?')
        })
    }
}

module.exports.commands['removepins'] = {
    'pretty_name': 'removepins',
    'description': 'Remove all pins, will await for confirmation.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');

        message.channel.send("Are you sure you want to do this? **THERE IS NO GOING BACK!**").then( (m) => {
            m.react('👍').then(() => m.react('👎'));

            const filter = (reaction, user) => {
                return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
            };
            
            m.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
            
                    if (reaction.emoji.name === '👍') {
                        // Do it.
                        m.reactions.removeAll().catch(O_o=>{});
                        m.edit('Removing...')

                        message.channel.messages.fetchPinned().then ( (messages) => {
                            let failed = 0;
                            let ok = 0;

                            messages.forEach( (msges) => {
                                msges.unpin().then( () => { ok++; }).catch( () => { fail++; })
                            })

                            m.edit('Done.');
                        }).catch(console.log);
                    } else {
                        m.delete().then( () => {
                            message.delete().catch(O_o=>{})
                        })
                    }

                })
                .catch(collected => {
                    console.log(collected)
                    m.edit('**FAIL**: Something broke - report this to bot owner.')
                });
        })
    }
}