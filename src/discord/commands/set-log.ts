import { Client, Guild, MessagePayload, InteractionReplyOptions, Channel } from 'discord.js';
import { Command } from '.';
import models from '../../models';
const GuildModel = models.Guild;

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string, channel: Channel){
    try {
        if (!client.user) {
            console.error('no user');
            return;
        }
        if (!(await guild.members.fetch(client.user)).permissions.has('ADMINISTRATOR')) {
            return send("You must be an admin to run that.")
        } else {
            const guildModel = await GuildModel.findOne({where: {guild_id: guild.id}});
            const data = {
                match_log_channel_id: channel.id,
            }
            if (!guildModel) {
                return;
            }
            const res = await guildModel.update(data)
            await send('Log channel set');
        }
    } catch (e) {
        console.log('err in listen command: ', e);
    }
}

const out: Command = {
    name: 'log here',
    description: 'Set the log channel for matches',
    check: content => {
        return content.match(/^log here/)
    },
    help: '',
    run: onMessage
}

export default out;