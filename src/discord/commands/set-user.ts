import faf from '../../faf-api';
import helper from '../../common/helper';
import { Command } from '.';

async function onMessage(msg){
    let faf_id,name,user;
    try{
        let name_result = msg.content.match(/^f\/set(.+)/)
        if (name_result && name_result[1]) {
            name = name_result[1].trim();
            faf_id = await faf.searchUser(name);
            if (! faf_id) {
                msg.reply(`I could not find a FAF login for '${name}'.`);
                return;
            }
            user = helper.setFafId(msg.author.id, faf_id, msg.guildId, name);
            if (user) {
                msg.reply('Your faf login has been set')
            } else {
                msg.reply('There was a problem saving your login')
            }
        }
    } catch (e) {
        console.log('set error', {
            faf_id,
            name,
            user,
            author: msg.author.id,
            guild: msg.guild.id
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