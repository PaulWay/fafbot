import { Client, MessagePayload, InteractionReplyOptions, Guild } from 'discord.js';
import { Command } from '.';
import helper from '../../common/helper';
import models from '../../models';
const GuildModel = models.Guild;

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string) {
    try {
        if (!client.user) {
            console.error('no user');
            return;
        }
        if (!(await guild.members.fetch(client.user)).permissions.has('ADMINISTRATOR')) {
            return await send("You must be an admin to run that.")
        } else {
            let guildModel = await GuildModel.findOne({where: {guild_id: guild.id}});
            if (!guildModel) {
                guildModel = await helper.findOrCreateGuild(guild);
            }
            const guild_added = guildModel ? 'yes' : 'no'
            const added = await helper.addGuildMembers(guild);
            const message = `Guild added: ${guild_added} \n Member Joins added: ${added}`
            await send(message)
        }
    } catch (e) {
        console.log('err in listen command: ', e);
    }
}

const out: Command = {
    name: 'checksetup',
    help: '',
    description: 'Check the setup for the bot',
    check: content => {
        return content.match(/^checksetup/)
    },
    run: onMessage,
}

export default out;
