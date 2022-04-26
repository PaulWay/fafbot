import { Client, Guild, MessagePayload, InteractionReplyOptions } from 'discord.js';
import https from 'https';
import { Command } from '.';
import helper from '../../common/helper';

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>){
    try {
        const channel = await guild.channels.create('Team 1 (temp)', {
            type: 'GUILD_VOICE',
            reason: 'temp channel for a FAF game'
        });
        await helper.moveUser(client, guild.id, client.user?.id,channel.id);
    } catch (e) {
        console.log(e, '^^^ join channel err');
    }
}

const out: Command = {
    check: content => content.match(/^join(.+)?/),
    help: '',
    description: '',
    run: onMessage,
    name: ''
}

export default out;
