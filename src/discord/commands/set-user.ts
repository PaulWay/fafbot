import faf from '../../faf-api';
import helper from '../../common/helper';
import { Command } from '.';
import { Client, Guild, MessagePayload, InteractionReplyOptions } from 'discord.js';

async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string){
    let faf_id,name,user;
    try{
        if (!client.user) {
            console.error('cannot find user');
            return;
        }
        const name_result = content.match(/^f\/set(.+)/)
        if (name_result && name_result[1]) {
            name = name_result[1].trim();
            faf_id = await faf.searchUser(name);
            if (! faf_id) {
                await send(`I could not find a FAF login for '${name}'.`);
                return;
            }
            user = helper.setFafId(client.user.id, faf_id, guild.id, name);
            if (user) {
                await send('Your faf login has been set')
            } else {
                await send('There was a problem saving your login')
            }
        }
    } catch (e) {
        console.log('set error', {
            faf_id,
            name,
            user,
            author: client.user?.id,
            guild: client.user?.id
        }, e)
    }
}

const out: Command = {
    name: 'set',
    description: 'Set your faf login if different to discord.',
    help: 'Sets your faf name in the bot for automatic channel sorting. \nUsage: `f/set <name>`',
    check: content => content.match(/^set(.+)/),
    run: onMessage
}

export default out;