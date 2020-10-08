'use strict';

const DataStore = require('../db/sqlite');

module.exports = {
    'name': 'Information',
    'description': 'Get information about users and servers.',
    'commands': {}
}

module.exports.commands['profile'] = {
    'pretty_name': 'profile [user ID/mention]',
    'description': 'Get information about a user.',
    'exec_function': function(message, args, Discord, client) {
        if (args[0] === undefined) args[0] = message.author.id;

        if (message.mentions.members.first()) {
            // Is mention.
            args[0] = message.mentions.members.first().id
        } else {
            // Check if user ID is the message author first, otherwise don't do anything
            if (args[0] != message.author.id) {
                // Is a standard args[1] id. but check first.
                if (args[0].length != 18) {
                    args[0] = message.author.id
                } else {
                    // Is an actual ID!
                    args[0] = args[0]
                }
            }
        }

        // User has permission.
        var VerifyUserExists = client.users.cache.some(user => user.id === args[0]);

        if (!VerifyUserExists) {
            // User doesn't exist.
            return message.channel.send('**FAIL**: User is not a member of this guild.')
        }

        const ONE_DAY = 1000 * 60 * 60 * 24;

        var user = message.guild.member(args[0]);

        let joinDate = new Date(user.joinedTimestamp);
        let createDate = new Date(user.user.createdAt);

        let createDays = Math.round(Math.abs(new Date() - createDate) / ONE_DAY);
        let joinDays = Math.round(Math.abs(new Date() - joinDate) / ONE_DAY);

        const profileEmbed = new Discord.MessageEmbed()
            .setColor('7289da')
            .setAuthor('User Information')
            .setDescription(`Cached user information for <@!${user.user.id}>:`)
            .setThumbnail(user.user.displayAvatarURL())
            .setTimestamp()
            .addField('Username', user.user.tag, true)
            .addField('User ID', user.user.id, true)
            .addField('Status', user.user.presence.status, true)
            .addField('Highest Rank', user.roles.highest.name, true)
            .addField('Created', createDate.toUTCString() + " (" + createDays + " days ago)", true)
            .addField('Joined', joinDate.toUTCString() + " (" + joinDays + " days ago)", true);

        if (message.member.hasPermission('KICK_MEMBERS')) {
            let Store = new DataStore(message.guild.id);

            Store.getInfractionsByUser(args[0]).then( (infractions) => {
                profileEmbed.addField('Infractions', infractions.length, true);
                message.channel.send(profileEmbed);
            });
        } else {
            message.channel.send(profileEmbed);
        }

    }
}