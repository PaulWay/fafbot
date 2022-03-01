import helper from '../common/helper';
import commands from './commands';
import models from '../models';
import Sequelize from 'sequelize';
import { CacheType, Guild, GuildMember, Interaction, Message, MessageComponentInteraction, MessageEmbed, VoiceState } from 'discord.js';

const GuildJoin = models.GuildJoin
const Op = Sequelize.Op;


export const onVoiceStateUpdate = async (oldThing: VoiceState, _: VoiceState) => {
    //delete temp channels we create when there's nobody in them.
    if (!(oldThing && oldThing.channel)) { return; }
    if (!oldThing.channel.name.match(/\(temp\)/)) { return; }
    // console.log("Channel:", oldThing.channel.name, "member count:", oldThing.channel.members.size, "deletable?", oldThing.channel.deletable);
    // if (newThing && oldThing.channelId === newThing.channelId) { return; }
    if (!oldThing.channel.deletable) { return; }
    if (oldThing.channel.members.size === 0) {
        if (! oldThing.guild.channels.cache.find(channel => channel.id === oldThing.channel?.id)) {
            console.log("Channel no exist no more?");
            return;
        }
        console.log("VoiceStateUpdate: deleting channel", oldThing.channel.id, 'name', oldThing.channel.name);
        try {
            oldThing.channel.delete();
        } catch (e) {
            console.log('Error on deleting channel', oldThing.channel.id, ':', e);
        }
    }
}

export const onGuildMemberAdd = async (member: GuildMember) => {
    try{
        if (!member.user.bot) {
            if (member.joinedTimestamp === null) {
                console.error('member has no timestamp', member.nickname);
                return;
            }
            let data = {
                join_date: new Date(member.joinedTimestamp),
                discord_id: member.user.id,
                guild_id: member.guild.id,
            }
            await GuildJoin.create(data)
        }
    } catch (e) {
        console.log('error in onGuildCreate', e)
    }
}
export const onGuildMemberRemove = async (member: GuildMember) => {
    try{
        let mem = await GuildJoin.findOne({
            where: {
                discord_id: member.user.id,
                guild_id: member.guild.id,
                leave_date: {
                    [Op.is]: null
                }
            },
            order: [['join_date', 'desc']]
            // order: 'join_date desc'
        })
        if (mem) {
            let leave_date = new Date()
            mem.set({leave_date});
            mem.save();
        }
    } catch (e) {
        console.log('error in onGuildCreate', e)
    }
}
export const onGuildCreate = async (guild: Guild) => {
    try{
        console.log("Joined a new guild: " + guild.name);
        let db_guild = await helper.findOrCreateGuild(guild)
        await helper.addGuildMembers(guild)
        console.log('Members added to DB')
    } catch (e) {
        console.log('error in onGuildCreate', e)
    }
}
export const onGuildDelete = async (guild: Guild) => {
    try{
        console.log("Joined a new guild: " + guild.name);
        let db_guild = await helper.findOrCreateGuild(guild)
        await helper.addGuildMembers(guild)
        console.log('Members added to DB')
    } catch (e) {
        console.log('error in onGuildCreate', e)
    }
}

export const onMessage = async (msg: Message) => {
    try {
        if (msg.author.bot || !msg.content.match(/^f\/(.+)/) || await checkHelp(msg)) return;
        const now = new Date();
        console.log(now.toLocaleString("en-AU"), ': received', msg.content, 'from:', msg.author.username);
        let done = false;
        helper.processArray(commands, function(command){
            if (done) return;  // ``
            if (!msg.content) return;
            const matched = msg.content.match(/^f\/(.+)/);
            if (!matched || matched.length < 2) return;
            let content = matched[1]; 
            if (command.check(content, msg)) {
                console.log(content, 'command matched');
                command.run(msg, msg.client);
                done = true;
            }
        });
    } catch (e) {
        console.log('error in ' + __filename, e);
    }
}

export const checkHelp = async (msg: Message) => {
    try{
        if (! msg.content.match(/^f\/help(.+)?/)) {
            return false;
        }
        let messages: string[] = [];
        let commandCheck = msg.content.match(/^f\/help(.+)/)
        let userCommand = commandCheck && commandCheck[1] ? commandCheck[1].trim() : null;
        let command_help;
        await helper.processArray(commands, (command) => {
            let is_command_valid = command && command.description && command.help && command.name
            if (is_command_valid) {
                if (command.name === userCommand) {
                    command_help = command;
                } else if (!userCommand) {
                    // messages.push({
                    //     name: command.name,
                    //     value: command.description,
                    //     inline: true
                    // });
                    messages.push(command.name);
                }
            }
        });
        let embed = new MessageEmbed().setTimestamp().setColor('#DDCC00');
        console.log(`help (command help is ${command_help})`);
        if (userCommand) {
            if (!command_help) {
                msg.channel.send("Couldn't find command '" + userCommand + "'");
                return true;
            } else {
                msg.channel.send("Command help: " + command_help.help);
                return true;
                embed.setTitle('Command help - ' + command_help.name);
                embed.setDescription(command_help.help);
            }
        } else {
            msg.channel.send("Available commands: " + messages.join(', '));
            return true;
            embed.setTitle('Available commands');
            embed.setDescription('All the available commands are below. For more info on each command use the help command\n eg: `f/help set`');
            // embed.addFields(messages);
        }
        // console.log('Channel permissions for bot:', msg.channel.permissionsFor(msg.guild.me).toArray());
        msg.channel.send({ embeds: [embed] });
        return true;
    } catch (e) {
        console.warn(e)
    }
}

export const onInteractionCreate = async (interaction: Interaction<CacheType>): Promise<void> => {
    
    if (!interaction.isCommand() || !interaction.isMessageComponent()) {
        return;
    }
    const command = commands.filter((command) => command.name === interaction.commandName);
    if (command.length === 0) {
        return;
    }
    console.log(`message content is: '${interaction.message.content}'`);
    command[0].run(interaction.message as Message<true>, interaction.client);
}