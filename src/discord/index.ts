import { Client, Intents } from 'discord.js';
import config from '../config';
import { onMessage, onVoiceStateUpdate, onInteractionCreate } from './event-handlers';
import register from './registerCommands';
import  from './event-handlers';


const client = new Client({intents: [
    Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES,
]});


function start(){

    client.on('ready', () => {
        if (client.user === null) {
            console.warn('user is null');
            return;
        }
        console.log(`Logged in as ${client.user.tag}!`);
        // const channel = client.channels.cache.get("720187277355122769");
        await Promise.all((await client.guilds.fetch()).map((guildId) => register(config.clientId, guildId.id)));
    });
    client.on('messageCreate', onMessage);
    client.on('voiceStateUpdate', onVoiceStateUpdate);
    // client.on("guildCreate", eventHandlers.onGuildCreate);
    // client.on("guildDelete", eventHandlers.onGuildDelete);
    // client.on("guildMemberAdd", eventHandlers.onGuildMemberAdd);
    // client.on("guildMemberRemove", eventHandlers.onGuildMemberRemove);
    client.login(process.env.DISCORD_TOKEN);
    client.on('interactionCreate', onInteractionCreate);

}


export default {
    start: start
};
