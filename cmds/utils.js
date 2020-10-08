'use strict';

module.exports = {
    'name': 'Utilities',
    'description': 'Test Utilities.',
    'commands': {}
}

module.exports.commands['ping'] = {
    'pretty_name': 'ping',
    'description': 'Get ping.',
    'exec_function': function(message, args, Discord, client) {
        message.channel.send('Pong!')
    }
}

module.exports.commands['help'] = {
    'pretty_name': 'help',
    'description': 'Get help.',
    'exec_function': function(message, args, Discord, client) {
        if (args[0]) {
            let HelpEmbed = new Discord.MessageEmbed()
                .setColor('#0000ff')
                .setTitle(client.CONFIG.botName + " Help - " + args[0])
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture);

            let exists = false;

            client.Commands.forEach( (element, index) => {
                if (element.name.toLowerCase() == args[0].toLowerCase()) {
                    // Correct category.
                    exists = true;
                    for (const cmd in element.commands) {
                        HelpEmbed.addField(client.CONFIG.prefix + element.commands[cmd].pretty_name, element.commands[cmd].description)
                    }

                } else {
                    // nothing.
                }
            });

            if (!exists) {
                HelpEmbed.addField('Error', 'Category does not exist.');
            }

            message.channel.send(HelpEmbed);            
        } else {
            let HelpEmbed = new Discord.MessageEmbed()
                .setColor('#0000ff')
                .setTitle(client.CONFIG.botName + " Help")
                .setAuthor(client.CONFIG.botName, client.CONFIG.botPicture);

            client.Commands.forEach( (element) => {
                HelpEmbed.addField(element.name, element.description);
            })

            message.channel.send(HelpEmbed);
        }

    }
}