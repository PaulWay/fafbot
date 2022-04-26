import { Client, Intents } from 'discord.js';
import config from '../config';
import { onMessage, onVoiceStateUpdate, onInteractionCreate } from './event-handlers';
import register from './registerCommands';

const client = new Client({intents: [
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_VOICE_STATES,
]});


const start = async () => {

    client.on('ready', async () => {
        if (client.user === null) {
            console.warn('user is null');
            return;
        }
        console.log(`Logged in as ${client.user.tag}!`);
        // const channel = client.channels.cache.get("720187277355122769");
        await Promise.all(
            (await client
                .guilds
                .fetch())
                  .map(async (guildId) => await register(config.clientId, guildId.id)));
    });
    client.on('messageCreate', onMessage);
    client.on('voiceStateUpdate', onVoiceStateUpdate);
    client.on('interactionCreate', onInteractionCreate);
    // client.on("guildCreate", eventHandlers.onGuildCreate);
    // client.on("guildDelete", eventHandlers.onGuildDelete);
    // client.on("guildMemberAdd", eventHandlers.onGuildMemberAdd);
    // client.on("guildMemberRemove", eventHandlers.onGuildMemberRemove);
    await client.login(process.env.DISCORD_TOKEN);

}


export default {
    start: start
};
