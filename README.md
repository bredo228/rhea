# Rhea

Rhea is a recreation of the Jolastu framework with Moderation in mind. 

## Run Instructions

Install all dependencies using ``npm install`` and then run with ``npm run test``

A token environment variable with name **RHEA_TOKEN** is required to be set in order to start the bot.

## Configuration

A sample configuration has been provided with name "config.json.example" - it is your responsibility to rename this configuration file to "config.json" and configure the bot to your needs.

## Management

It is possible to interface with the bot over a Websocket. This HTTP server only binds to ``localhost:63228`` and nothing else. The websocket allows a user to do the following:

- Ping the bot internally.
- Restart the bot and, if specified, use a different token for a temporary session.
- Stop the bot.
- Get information about the bot's current connection to Discord.
- Get a list of commands.

If you do **not** want this enabled, disable it in the configuration file. The management interface is enabled by default.

See [this GitHub repo](https://github.com/xFuney/rhea_cli) for the management interface CLI.

## Environment Variables

**RHEA_TOKEN** should be set to your Discord bot token. The bot will not start without this being set.