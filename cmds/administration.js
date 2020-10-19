const DataStore = require('../db/sqlite');

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

  function arrayRemove(arr, value) {
    return arr.filter(function (ele) {
        return ele != value;
    });
};

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

module.exports.commands['remove-regexblacklist'] = {
    'pretty_name': 'remove-regexblacklist',
    'description': 'Remove regex blacklist from guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.getObject('regex-blacklist').then( () => {
            // v[0].value!
            try {
                let change = JSON.parse(v[0].value, reviver);
            } catch {
                let change = {
                    "blacklist": []
                }
            }

            var flags = args[0].replace(/.*\/([gimy]*)$/, '$1');
            var pattern = args[0].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
            var regex = new RegExp(pattern, flags);

            // Once parsed, do arrayRemove (thanks zer0!)
            arrayRemove(change, regex);

            // Write changes.
            Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                message.channel.send('**SUCCESS**: Regex blacklist updated successfully!')
            }) 
        })
    }
}

module.exports.commands['add-regexblacklist'] = {
    'pretty_name': 'add-regexblacklist',
    'description': 'Add regex blacklist to guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.getObject('regex-blacklist').then( (v) => {
            // v[0].value!
            try {
                let change = JSON.parse(v[0].value, reviver);
            } catch {
                let change = {
                    "blacklist": []
                }
            }
            

            var flags = args[0].replace(/.*\/([gimy]*)$/, '$1');
            var pattern = args[0].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
            var regex = new RegExp(pattern, flags);

            change["blacklist"].push(regex);

            Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                message.channel.send('**SUCCESS**: Regex blacklist updated successfully!')
            })
        }).catch( () => {
            // Failed to get object, therefore object must not exist so create it.
            let change = {
                "blacklist": []
            }

            var flags = args[0].replace(/.*\/([gimy]*)$/, '$1');
            var pattern = args[0].replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
            var regex = new RegExp(pattern, flags);

            change["blacklist"].push(regex);

            Store.updateObject('regex-blacklist', JSON.stringify(change, replacer, 2)).then( () => {
                message.channel.send('**SUCCESS**: Regex blacklist updated successfully!')
            }) 
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

module.exports.commands['muterole'] = {
    'pretty_name': 'muterole <role-id>',
    'description': 'Change the mute role for this guild.',
    'exec_function': function(message, args, Discord, client) {
        if (!message.member.hasPermission('ADMINISTRATOR')) return message.channel.send('**FAIL**: Insufficient permissions.');
        args[0] = args[0] || "0";

        // User is an admin.
        let Store = new DataStore(message.guild.id);

        Store.updateObject('mute-role', args[0]).then( () => {
            message.channel.send('**SUCCESS**: Mute role updated successfully!');
        })
    }
}