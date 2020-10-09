'use strict';

const DataStore = require('../db/sqlite');

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
    'name': 'JOke',
    'description': 'JOke commands.',
    'commands': {}
}

module.exports.commands['jwarn'] = {
    'pretty_name': 'jwarn <user-id> <reason>',
    'description': '[JOKE] Warn a user.',
    'exec_function': function(message, args, Discord, client) {
        // Check if user ID is present.
        if (args[0] === undefined) return message.channel.send('**ERROR: Need to specify user ID.**');
        //if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Insufficient permissions.')

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

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        message.channel.send(`**SUCCESS:** User ${uid} warned successfully.`)

        let warnedUser = client.users.cache.get(uid);

        let WarnEmbed = new Discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle('New Infraction')
        .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
        .setDescription('You have received an infraction in ' + message.guild.name + '.')
        .addField('Type', 'warn', true)
        .addField('Infraction ID', 'JOKE-69420', true)
        .addField('Reason', reasonMsg , true);

        warnedUser.send(WarnEmbed).then( () => {
            // Do nothing.
        }).catch( (err) => {
            // Do nothing.
        })
    }
}

module.exports.commands['jkick'] = {
    'pretty_name': 'jkick <user-id> <reason>',
    'description': "[JOKE] Kick a user - you 'need' KICK_MEMBERS permission to use this command.",
    'exec_function': async function(message, args, Discord, client) {
        //if (!message.member.hasPermission('KICK_MEMBERS')) return message.channel.send('**FAIL**: Lack of permissions.')
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

        // Kick the user.

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        let KickEmbed = new Discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle('New Infraction')
        .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
        .setDescription('You have received an infraction in ' + message.guild.name + '.')
        .addField('Type', 'kick', true)
        .addField('Infraction ID', 'JOKE-69420', true)
        .addField('Reason', reasonMsg , true);

        let warnedUser = client.users.cache.get(uid);

        client.users.cache.get(uid).send(KickEmbed).then( () => {
            // Try kicking user.
            message.channel.send('**SUCCESS**: User kicked successfully.');
        }).catch( (err) => {
            message.channel.send('**SUCCESS**: User kicked successfully.');
        })
        
    }
}

module.exports.commands['jban'] = {
    'pretty_name': 'jban <user-id> <reason>',
    'description': "[JOKE] Bans a user - you 'need' BAN_MEMBERS permission to use this command.",
    'exec_function': async function(message, args, Discord, client) {
        //if (!message.member.hasPermission('BAN_MEMBERS')) return message.channel.send('**FAIL**: Lack of permissions.')
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

        // Kick the user.

        let reasonMsg = args.slice(1,args.length).join(" ");

        reasonMsg = reasonMsg === "" ? "No reason specified" : reasonMsg;

        let Store = new DataStore(message.guild.id);

        let BanEmbed = new Discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle('New Infraction')
        .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture)
        .setDescription('You have received an infraction in ' + message.guild.name + '.')
        .addField('Type', 'ban', true)
        .addField('Infraction ID', 'JOKE-69420', true)
        .addField('Reason', reasonMsg , true);

        let warnedUser = client.users.cache.get(uid);

        client.users.cache.get(uid).send(BanEmbed).then( () => {
            // Try kicking user.
            message.channel.send('**SUCCESS**: User baned successfully.');
        }).catch( (err) => {
            message.channel.send('**SUCCESS**: User baned successfully.');
        })
        
    }
}