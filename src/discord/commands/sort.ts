import faf, { Match } from '../../faf-api';
import helper from '../../common/helper';
import models from '../../models';
import { Command } from '.';
const FafUser = models.FafUser;

const out: Command = {
    name: 'sort',
    description: 'Sort everyone into team channels.',
    help: 'This will get everyone in your current match (which must have started) into separate voice channels based on team. \nUsage: `f/sort`',
    check: content => content.match(/^sort(.+)?/),
    run: async (msg, client) => {
        console.log("Got to start of sort routine");

        try{

            let active_channel = await helper.getUserActiveVoiceChannel(msg);
            if (!active_channel) {
                console.log(`${msg.author.username} not in voice channel`);
                msg.channel.send("You must be in a voice channel to run that command.");
                return;
            }
            // console.log(active_channel.parentId)
            console.log('active_channel', active_channel.id, 'parent', active_channel.parentId);
            // console.log('full channel details:', active_channel);
            if (process.env.CATEGORY_RESTRICTION_ID && active_channel.parentId !== process.env.CATEGORY_RESTRICTION_ID + '') {
                msg.channel.send(`You must be in the "Battle Prep" channel to run this`);
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
                    msg.reply("I couldn't find your FAF username. Please set it, eg `f\/set " + msg.author.username + '`')
                    return;
                }
            }
            if (! faf_id) {
                console.log(`Couldn't find FAF ID for ${msg.author.username}`);
                msg.channel.send("I couldn't find your match");
                return;
            };
            console.log('searching for last match for ', faf_id);
            // let bot_promise = msg.channel.send('Tracking your match')
            let player_match = await faf.getPlayerCurrentMatch(faf_id);
            if (player_match) {
                if (player_match.attributes.endTime !== null) {
                    msg.channel.send("You're not in a current match (last match ended " + player_match.attributes.endTime + ")");
                    return;
                }
            } else {
                msg.channel.send("I couldn't find the players in the match.");
                return;
            };
            msg.channel.send("Hi " + msg.author.username + ", you're in match " + player_match.id);
            console.log('player is in match', player_match.id);
            let match = await faf.getMatch(player_match.id);
            if (match !== null && match.teams && match.teams.length) {
                console.log('match', match.id);
                let size;
                if (match.map) {
                    size = (match.map.width / 51.2) + 'x' + (match.map.height / 51.2);
                }
                let team_fields = match.teams.map(team => {
                    return {
                        name: 'Team ' + team.team,
                        value: helper.getObjectValues(team.players, 'name').join('\n'),
                        inline: true
                    }
                });
                let main_fields: any[] = [{
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
                let report_fields = [...main_fields,...team_fields];
                let unknown_players: string[] = [];
                console.log("Teams:", match.teams);
                await helper.processArray(match.teams, async function(team){
                    // console.log("Team data:", team);
                    let channel_name = `Team ${team.team} - ${(match as Match).name} (temp)`
                    let parent_id = active_channel.parentId

                    if (parseInt(msg.guild.id) === 657376549108187163 && process.env.CHANNEL_PARENT_ID) {
                        parent_id = process.env.CHANNEL_PARENT_ID
                    }
                    let channel_exists = await msg.channel.guild.channels.cache.find(
                        channel => channel.name === channel_name
                    );
                    let channel;
                    if (channel_exists) {
                        console.log("Found existing channel", channel.id, "named", channel_name);
                        channel = channel_exists;
                    } else {
                        channel = await msg.channel.guild.channels.create(channel_name, {
                            type: 'GUILD_VOICE',
                            reason: 'temp channel for a FAF game',
                            parent: parent_id
                        });
                        console.log("Created new channel", channel.id, "named", channel_name);
                    }
                    let player_ids = helper.getObjectValues(team.players, 'id')
                    console.log("players to sort into this channel:", player_ids);
                    let faf_users = await FafUser.findAll({ where: {
                        faf_id: player_ids,
                        guild_id: msg.guild.id
                    }});
		    // console.log("faf users for those players:", faf_users);
                    team.players.forEach(player => {
                        console.log("player", player);
                        let found = false;
                        // if (faf_users && faf_users.length) {
                        faf_users.forEach(faf_user => {
                            if ((faf_user.faf_id).toString() == player.id) {
                                found = true;
                                helper.moveUser(client, msg.channel.guild.id, msg.author.id, channel.id);
                            }
                        });
                        // }
                        if (!found) {
                            console.log("No database match for player", player.id, ", trying to find name in active channel") 
                            active_channel.members.forEach(member => {
                                if (member.displayName.toLowerCase() === player.name.toLowerCase()) {
                                    found = true;
                                    helper.moveUser(client, msg.channel.guild.id, member.id, channel.id);
                                }
                            });
                            if (!found) {
                                console.log("... couldn't find player", player.name, "in channel, sending f/set message");
                                // msg.channel.send(`I couldn't find a discord ID for FAF player '${player.name}' - if that's you, issue \`f\/set ${player.name}\` to fix this`);
                                unknown_players.push(player.name);
                            }
                        }
                    })
                });
                if (unknown_players.length) {
                    await msg.channel.send(
                        "I couldn't find Discord usernames for the following FAF players: " +
                        unknown_players.join(', ') +
                        " - if you're one of those people, issue `f/set` with your FAF username."
                    );
                }
                let description = 'Map generator match'
                if (match.map && match.map.description) { //map generator doesn't include the map object
                    description = match.map.description
                }

                let embed = {
                    description: description,
                    fields: report_fields,
                    thumbnail: {},
                    image: {},
                };
                if (match.map && match.map.thumbnailUrlLarge) {
                    embed.thumbnail = {url: encodeURI(match.map.thumbnailUrlLarge)};
                    embed.image = {
                        url: encodeURI(match.map.thumbnailUrlLarge)
                    }
                }
                await helper.sendLog(msg.guild.id, embed, msg);
            }
        } catch (e) {
            console.log('caught exception', e);
        }
    }
}

export default out;
