import { Client, Intents } from 'discord.js';
import eventHandlers from './event-handlers';


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
    });
    client.on('messageCreate', eventHandlers.onMessage);
    client.on('voiceStateUpdate', eventHandlers.onVoiceStateUpdate);
    // client.on("guildCreate", eventHandlers.onGuildCreate);
    // client.on("guildDelete", eventHandlers.onGuildDelete);
    // client.on("guildMemberAdd", eventHandlers.onGuildMemberAdd);
    // client.on("guildMemberRemove", eventHandlers.onGuildMemberRemove);
    client.login(process.env.DISCORD_TOKEN);

}


export default {
    start: start
};
