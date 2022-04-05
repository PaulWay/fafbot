import { Client, Guild, InteractionReplyOptions, Message, MessagePayload } from 'discord.js';
import { Command } from '.';
import faf from '../../faf-api';
import models from '../../models';
const FafUser = models.FafUser;

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string){
    const name_result = content.match(/^f\/set(.+)/)
    if (name_result && name_result[1]) {
        const name = name_result[1].trim();
        const faf_id = await faf.searchUser(name);
        let user;
        if (faf_id) {
            if (!client.user) {
                console.error('cannot find user');
                return;
            }
            user = await FafUser.findOne({ where: {
                    discord_id: client.user.id,
                    guild_id: guild.id,
                }});
            if (user) {
                user.update({
                    discord_id: client.user.id,
                    guild_id: guild.id,
                    faf_id: faf_id
                })
            } else {
                user = await FafUser.create({
                    discord_id: client.user.id,
                    guild_id: guild.id,
                    faf_id: faf_id,
                    discord_username: '',
                });
            }
            if (user) {
                await send('Your faf login has been set')
            } else {
                await send('There was a problem saving your login')
            }
        } else {
            await send('I could not find your faf login.')
        }
    }
}

const out: Command = {
    name: 'set',
    description: 'Set the category channels should be created in.`',
    help: 'Set the category channels should be created in`  \nUsage: `f/setcategory <name>`',
    check: content => content.match(/^setcategory(.+)/),
    run: onMessage
}

export default out;
