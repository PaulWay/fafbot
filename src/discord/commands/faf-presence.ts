import { Client, Guild, InteractionReplyOptions, MessagePayload } from 'discord.js';
import faf from '../../faf-api';

function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>, content: string){
    const game_id = client.user?.presence.activities[0].party?.id;
    console.log('gameid', game_id);
}

module.exports = {
    check: (content, msg) => {
        return msg.application
            && msg.application.id === '464069837237518357'
            && msg.activity
            && msg.activity.partyID;
    },
    run: onMessage
}