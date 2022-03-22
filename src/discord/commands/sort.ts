import faf, { Match } from '../../faf-api';
import helper from '../../common/helper';
import models from '../../models';
import { Command } from '.';
import { Client, Message, MessageEmbed, MessageEmbedOptions } from 'discord.js';
const FafUser = models.FafUser;

const out: Command = {
    name: 'sort',
    description: 'Sort everyone into team channels.',
    help: 'This will get everyone in your current match (which must have started) into separate voice channels based on team. \nUsage: `f/sort`',
    check: content => content.match(/^sort(.+)?/),
    run: async (msg: Message<true>, client: Client) => {
        console.log("Got to start of sort routine");
        let description = 'Map generator match';
        let embed: MessageEmbedOptions = {};
        try {

            const active_channel = await helper.getUserActiveVoiceChannel(msg);
            if (!active_channel) {
                console.log(`${msg.author.username} not in voice channel`);
                await msg.channel.send("You must be in a voice channel to run that command.");
                return;
            }
            // console.log(active_channel.parentId)
            console.log('active_channel', active_channel.id, 'parent', active_channel.parentId);
            // console.log('full channel details:', active_channel);
            if (process.env.CATEGORY_RESTRICTION_ID && active_channel.parentId !== process.env.CATEGORY_RESTRICTION_ID + '') {
                await msg.channel.send(`You must be in the "Battle Prep" channel to run this`);
                return;
            }

            let faf_id = await helper.getFafId(msg.author);
            if (!faf_id) {
                console.log("FAF ID of", msg.author.username, "returned", faf_id, ", searching");
                faf_id = await faf.searchUser(msg.author.username);
                if (faf_id) {
                    await helper.setFafId(msg.author.id, faf_id, msg.guild.id, msg.author.username);
                } else {
                    console.log(`Couldn't find FAF username for ${msg.author.username}`);
                    await msg.reply("I couldn't find your FAF username. Please set it, eg `f/set " + msg.author.username + '`')
                    return;
                }
            }
            if (!faf_id) {
                console.log(`Couldn't find FAF ID for ${msg.author.username}`);
                await msg.channel.send("I couldn't find your match");
                return;
            }
            console.log('searching for last match for ', faf_id);
            // let bot_promise = msg.channel.send('Tracking your match')
            const player_match = await faf.getPlayerCurrentMatch(faf_id);
            if (player_match) {
                if (player_match.attributes.endTime !== null) {
                    await msg.channel.send("You're not in a current match (last match ended " + player_match.attributes.endTime + ")");
                    return;
                }
            } else {
                await msg.channel.send("I couldn't find the players in the match.");
                return;
            }
            let match = await faf.getMatch(player_match.id);
            if (!(match !== null && match.teams && match.teams.length)) {
                console.log(`couldn't find match with id ${player_match.id}`);
                return;
            }
            match = <Match>match;
            await msg.channel.send("Hi " + msg.author.username + ", you're in match " + match.name);
            console.log('player is in match', match.id, 'name', match.name);
            let size;
            if (match.map) {
                size = (match.map.width / 51.2) + 'x' + (match.map.height / 51.2);
            }
            const team_fields = match.teams.map(team => {
                return {
                    name: 'Team ' + team.team,
                    value: helper.getObjectValues(team.players, 'name').join('\n'),
                    inline: true
                }
            });
            const main_fields: any[] = [{
                name: 'Victory Condition',
                value: match.victoryCondition,
                inline: true
            }];
            if (size) {
                main_fields.push({
                    name: 'Size',
                    value: size,
                    inline: true
                })
            }
            main_fields.push({ name: '\u200B', value: '\u200B' })
            const report_fields = [...main_fields, ...team_fields];
            const unknown_players: string[] = [];
            console.log("Teams:", match.teams);
            await Promise.allSettled(match.teams.map(async function(team) {
                // console.log("Team data:", team);
                const channel_name = `Team ${team.team} - ${(match as Match).name} (temp)`
                let parent_id = active_channel.parentId

                if (msg.guild.id === '657376549108187163' && process.env.CHANNEL_PARENT_ID) {
                    parent_id = process.env.CHANNEL_PARENT_ID
                }
                const channel_exists = await msg.channel.guild.channels.cache.find(
                    channel => channel.name === channel_name
                );
                let channel;
                if (channel_exists) {
                    channel = channel_exists;
                } else {
                    channel = await msg.channel.guild.channels.create(channel_name, {
                        type: 'GUILD_VOICE',
                        reason: 'temp channel for a FAF game',
                        parent: parent_id
                    });
                    console.log("Created new channel", channel.id, "named", channel_name);
                    // } else {
                    //     msg.reply(`I've found channel ${channel_name} for you, moving you there`);
                    //     channel = channel_exists;
                    //     helper.moveUser(client, channel.guild.id, msg.author.id, channel.id);
                    //     console.log(`Channel ${channel_name} existed, moved ${msg.author.username} straight there.`);
                }
                const player_ids = helper.getObjectValues(team.players, 'id')
                console.log("players to sort into this channel:", player_ids);
                const faf_users = await FafUser.findAll({
                    where: {
                        faf_id: player_ids,
                        guild_id: msg.guild.id
                    }
                });
                // console.log("faf users for those players:", faf_users);
                const discord_id_of_faf_user = new Map();
                faf_users.map(faf_user => {
                    discord_id_of_faf_user.set(faf_user.faf_id.toString(), faf_user.discord_id);
                });
                const team_move_statuses = await Promise.allSettled(team.players.map(async player => {
                    console.log("player", player);
                    let found = false;
                    const player_id = player.id.toString();
                    if (discord_id_of_faf_user.has(player_id)) {
                        const discord_id = discord_id_of_faf_user.get(player_id);
                        await helper.moveUser(client, msg.channel.guild.id, discord_id, channel.id);
                    } else {
                        console.log("No database match for player, trying to find name in active channel")
                        await Promise.allSettled(active_channel.members.map(async member => {
                            if (member.displayName.toLowerCase() === player.name.toLowerCase()) {
                                found = true;
                                await helper.moveUser(client, msg.channel.guild.id, member.id, channel.id);
                            }
                        }));
                        if (!found) {
                            console.log("... couldn't find player", player.name, "in channel, sending f/set message");
                            // msg.channel.send(`I couldn't find a discord ID for FAF player '${player.name}' - if that's you, issue \`f\/set ${player.name}\` to fix this`);
                            unknown_players.push(player.name);
                        }
                    }
                })); // await promise team player moves
            })); // await promise map teams
            console.log("unknown players:", unknown_players);
            if (unknown_players.length) {
                await msg.channel.send(
                    "I couldn't find Discord usernames for the following FAF players: " +
                    unknown_players.join(', ') +
                    " - if you're one of those people, issue `f/set` with your FAF username."
                );
            }
            if (match.map && match.map.description) { //map generator doesn't include the map object
                description = match.map.description
            }

            if (match.map && match.map.thumbnailUrlLarge) {
                embed = {
                    description: description,
                    fields: report_fields,
                    thumbnail: { url: encodeURI(match.map.thumbnailUrlLarge) },
                    image: {
                        url: encodeURI(match.map.thumbnailUrlLarge)
                    }
                };
            }
            await helper.sendLog(msg.guild.id, new MessageEmbed(embed), msg);
        } catch (e) {
            console.log('caught exception', e);
        }
    }
}

export default out;
