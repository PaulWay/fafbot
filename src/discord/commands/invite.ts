import { Command } from ".";

import permManager from 'discord-permissions';
import { Client, Guild, MessagePayload, InteractionReplyOptions } from "discord.js";

/**
 *
 * @param msg
 * @returns {Promise<void>}
 */
async function onMessage(client: Client, guild: Guild, send: (message: string | MessagePayload | InteractionReplyOptions) => Promise<any>){
    const perms = [
        /** --------/ General /----* */
        // 'Administrator',
        // 'View Audit Log',
        // 'View Server Insights',
        // 'Manage Server',
        // 'Manage Roles',
        'Manage Channels',
        // 'Kick Members',
        // 'Ban Members',
        // 'Create Instant Invite',
        // 'Change Nickname',
        // 'Manage Nicknames',
        // 'Manage Emojis',
        // 'Manage Webhooks',
        'View Channels',
        /** --------/ Text /----* */
        'Send Messages',
        // 'Send TTS Messages',
        // 'Manage Messages',
        // 'Embed Links',
        // 'Attach Files',
        // 'Read Message History',
        // 'Mention Everyone',
        // 'Use External Emojis',
        'Add Reactions',
        /** --------/ Voice /----* */
        // 'Connect',
        // 'Speak',
        // 'Mute Members',
        // 'Deafen Members',
        'Move Members',
        // 'Use Voice Activity',
        // 'Priority Speaker',
    ];
    const client_id = process.env.DISCORD_CLIENT_ID;
    console.log('check key', client_id, client_id.match(/[0-9]{16,20}/))
    const link = permManager.generateInvite(client_id, perms);
    console.log(link);
    await send(link);
}

const out: Command = {
    name: 'invite',
    description: 'Replies with the bot invite link.',
    help: 'Replies with an invite link. This might be needed if you need to re-invite the bot to add latest permissions. \nUsage: `f/invite`',
    check: content => content.match(/^invite(.+)?/),
    run: onMessage
}

export default out;