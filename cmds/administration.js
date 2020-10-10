const DataStore = require('../db/sqlite');

module.exports = {
    'name': 'Administration',
    'description': 'Administration commands.',
    'commands': {}
}

module.exports.commands['wb-change'] = {
    'pretty_name': 'wb-change <word blacklist>',
    'description': 'Change the word blacklist for this guild. The word blacklist should be structured as such: "fuck,shit,cunt,poo,fart" - any other variations may result in problems.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "wsjg0operuyhg0834rjhg3408ghyu3goijwrgp9jgpoeij43p97gh34pg43hg9734hg9374hg349gh3497gh3498gh3ouhwdf9";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('word-blacklist', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Word blacklist updated successfully!')
        })
    }
}

module.exports.commands['infractionlog'] = {
    'pretty_name': 'infractionlog <channel-id>',
    'description': 'Change the infraction log channel for this guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('infraction-log', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Infraction log channel updated successfully!');
        })
    }
}

module.exports.commands['joinlog'] = {
    'pretty_name': 'joinlog <channel-id>',
    'description': 'Change the join log channel for this guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('join-log', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Join log channel updated successfully!')
        })
    }
}


module.exports.commands['messagelog'] = {
    'pretty_name': 'messagelog <channel-id>',
    'description': 'Change the message log channel for this guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('message-log', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Message log channel updated successfully!')
        })
    }
}

module.exports.commands['archivechannel'] = {
    'pretty_name': 'archivechannel <channel-id>',
    'description': 'Change the archive channel for this guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('archive-channel', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Archive channel updated successfully!');
        })
    }
}