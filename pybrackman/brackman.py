import asyncio
import datetime
import discord
from discord.ext import commands
import logging
import pytz
from typing import Optional
import yaml

from faf_lib import (
    faf_get_player_for_user, faf_get_id_for_user, faf_get_last_game_for_faf_id,
    init_oauth_config
)
from db_lib import db_get_user, db_get_users, db_set_user

logging.basicConfig(level=logging.INFO)

intents = discord.Intents.default()
intents.message_content = True

sydney_tz = pytz.timezone('Australia/Sydney')


def read_config(config_filename):
    """
    Return the YAML dictionary of the full config
    """
    fh = open(config_filename, 'r')
    full_config = yaml.load(fh, Loader=yaml.Loader)
    fh.close()
    return full_config


# file_log = logging.FileHandler(filename='brackman.log', encoding='utf-8')
# logger = logging.getLogger('brackman')
# logging.addHandler(file_log)

brackman = commands.Bot(command_prefix='f/', intents=intents)


@brackman.event
async def on_ready():
    logging.info(f"Logged in as {brackman.user} (ID {brackman.user.id})")


@brackman.event
async def on_voice_state_update(member, before, after):
    # Check if someone has moved from a temporary channel and if that channel
    # is now empty.  If so, delete it.
    if not (before and before.channel):
        # logging.info("Channel check: no before channel object")
        return
    if before.channel == after.channel:
        # logging.info("Channel check: channel hasn't changed")
        return
    if not before.channel.name.endswith('(temp)'):
        # logging.info("Channel check: %s not a temporary channel", before.channel)
        return
    if before.channel.members:
        logging.info("Channel check: %s not empty", before.channel)
        return
    logging.info("Channel check: deleting %s", before.channel.name)
    await before.channel.delete()


# Help text is the first line of the docstring.
@brackman.command(description='Set the FAF username you go by')
async def set(ctx, faf_username: str, discord_username: Optional[str]):
    """
    Set the FAF username for this Discord user.

    If the Discord user is supplied, the message sender must be a Brackman
    controller; otherwise the command is ignored.  We then use the FAF API to
    get the FAF ID, and store this plus the message's guild in the database.
    """
    logging.info(f"{ctx=}, {faf_username=}, {discord_username}")
    if discord_username is not None:
        if ctx.author.display_name not in ['PaulWay', 'Millenwise', 'Angelofd347h']:
            logging.warn(f"User {ctx.author.display_name} not allowed to f/set a Discord username")
            await ctx.send("No, I don't think I need to take order from you, indeed!")
            return
    else:
        discord_username = ctx.author.display_name
    logging.info(f"Matching {faf_username=} to {discord_username}")

    faf_id = faf_get_id_for_user(faf_username)
    if faf_id is None:
        await ctx.reply("I had a problem getting data from the FAF API, yes!")
        return
    logging.info(f"User {discord_username} setting {faf_username}[{faf_id}] guild {ctx.guild.id} id {ctx.author.id}")
    db_set_user(faf_id, faf_username, ctx.guild.id, ctx.author.id, discord_username)
    if ctx.author.display_name != discord_username:
        await ctx.reply(f"I'll remember that {faf_username} is {discord_username} for you, {ctx.author.display_name}")
    else:
        await ctx.reply('Your faf login has been set')


@set.error
async def set_error(ctx, error):
    """
    Handle missing arguments here
    """
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.reply("You need to tell me your FAF username as well, yes!  Try `f/set faf_username` ...")
        return


@brackman.command(description='Details about a FAF player')
async def who(ctx, player: str):
    """
    Get details about a FAF user
    """
    details = faf_get_player_for_user(player)
    if not details:
        await ctx.reply(f"You must be mistaken, FAF does not know a player called `{player}`")
        return
    # logging.info("Got player details: %s", player)
    created_at = datetime.datetime.fromisoformat(details['attributes']['createTime']).astimezone(sydney_tz)
    updated_at = datetime.datetime.fromisoformat(details['attributes']['updateTime']).astimezone(sydney_tz)
    await ctx.reply(f"""
Player {details['attributes']['login']} joined at {created_at}
They last logged in at {updated_at}
    """)


def send_game_start_message(ctx, game):
    """
    Send a message with information about the game and its players.
    """
    return


def resolve_players(ctx, players, active_channel):
    """
    Resolve the discord IDs for all players.  Search the database first, and
    the active channel membership (case-independently) second.  If we find
    any players in the active channel the database didn't know, save them.
    Set the 'discord_id' key in the player dict if we found one.
    """
    db_users = db_get_users(players.keys(), ctx.guild.id)  # organised by ID
    # This only gives the users that matched.  Assign their discord ID into
    # the players dict.
    logging.info(
        "players keys:%s, db users keys: %s",
        repr(players.keys()), repr([u['faf_id'] for u in db_users])
    )
    for db_user in db_users:
        faf_id = str(db_user['faf_id'])  # database types, eh?
        players[faf_id]['discord_id'] = db_user['discord_id']
        logging.info(
            "Resolve 1: Found discord ID %s for FAF username %s(%s)",
            db_user['discord_id'], db_user['faf_username'], faf_id
        )

    # Rearrange the active channel's member list into a dict of lower case
    # username to discord ID.
    member_with_display_name_lc = {
        member.display_name.lower(): member
        for member in active_channel.members
    }
    # Now go through the player list looking for players we haven't already
    # matched but who are in the active channel (case insensitive)
    for player_id, player in players.items():
        if 'discord_id' in player:
            continue
        player_name_lc = player['name'].lower()
        if player_name_lc in member_with_display_name_lc:
            member = member_with_display_name_lc[player_name_lc]
            try:
                db_set_user(
                    player_id, player['name'], ctx.guild.id, member.id, member.display_name
                )
            except:
                logging.error("Error thrown while calling db_set_user")
                pass
            player['discord_id'] = member.id
            logging.info("Resolve 2: Found discord ID %s for FAF username %s", member.id, player['name'])
    # No return - resolved data is in the players dict


async def create_voice_channel(ctx, active_channel, game_name, team_no):
    """
    Create the voice channel for this team, if it doesn't already exist.

    Return the target channel
    """
    # Voice channels can only be max 100 chars
    if len(game_name) > 85:
        game_name = game_name[:85]
    channel_name = f"Team {team_no} - {game_name} (temp)"
    channel = discord.utils.get(
        ctx.guild.voice_channels, name=channel_name
    )
    if channel:
        logging.info("Voice channel %s exists", channel_name)
    else:
        logging.info("Voice channel %s doesn't exist - creating", channel_name)
        try:
            channel = await ctx.message.guild.create_voice_channel(
                channel_name,
                reason=f'temp channel {team_no} for FAF game {game_name}',
                position=team_no,
                category=active_channel.category
            )
        except Exception as e:
            logging.error(f"Could not create channel - {e}")
            await ctx.send(f"I'm afraid I can't create a voice channel")
            return None
        if not channel:
            logging.error(f"Could not create channel - unknown error")
            await ctx.send(f"I'm afraid I can't create a voice channel")
            return None
    return (team_no, channel)


async def move_player(member, channel):
    """
    Move the player to the channel, with logging.
    """
    logging.info(f"Moving {member.display_name}[{member.id}] into {channel.name}")
    await member.move_to(channel)


@brackman.command(description='Sort players in your game into voice channels')
async def sort(ctx):
    """
    Sort the players in the game the user is in into team voice channels.
    """
    logging.info("Received f/sort from %s", ctx.author.display_name)
    guild = ctx.guild
    if not ctx.author.voice:
        logging.info(f"User {ctx.author.display_name} not in voice channel")
        await ctx.reply("You must be in a voice channel in order to issue this command.")
        return
    active_channel = ctx.author.voice.channel

    db_user = db_get_user(discord_id=ctx.author.id)
    logging.info("Got DB data %s for author %s[%s]", db_user, ctx.author.display_name, ctx.author.id)
    faf_id = db_user['faf_id']
    if not db_user:
        # Try searching FAF for the username
        faf_id = faf_get_id_of_user(ctx.author.display_name)
        if not faf_id:
            logging.info("Couldn't find FAF username for %s")
            await ctx.send(f"I couldn't find your FAF username. Please set it, eg `f/set {msg.author.username}`")
            return
        db_user = db_set_user(faf_id, ctx.author.display_name, ctx.guild.id, ctx.author.id, ctx.author.display_name)

    game = faf_get_last_game_for_faf_id(faf_id)
    if not game:
        logging.info("Player %s[%s] not in any game", db_user['faf_username'], faf_id)
        await ctx.send("I couldn't find you in any games on FAF, indeed!")
        return
    if game['end_time']:
        logging.info("Player %s[%s] not in a current game", db_user['faf_username'], faf_id)
        await ctx.send("I'm afraid your last game is... over!")
        return
    await ctx.send(f"Yes, my child, {ctx.author.display_name}, I see you're in game `{game['name']}`.  Oh yes!")

    send_game_start_message(ctx, game)
    # This adds Discord ID data into the game['players'] structure
    resolve_players(ctx, game['players'], active_channel)

    channels = await asyncio.gather(*[
        create_voice_channel(ctx, active_channel, game['name'], team_no+1)
        for team_no in range(game['teams'])  # because range goes from 0..n-1
    ])
    if (not channels) or (all(x is None for x in channels)):
        logging.info("No voice channels created!")
        ctx.reply("I'm afraid I was unable to create any voice channels.")
        return
    # Reconstruct the data to map players into channels by team number
    channel_of_team = dict(channels)  # team_no: channel
    # logging.info("Created channels from: %s", channels)
    # logging.info("Players in game: %s", game['players'])
    # Map the player's discord_id to the channel object to put them in
    channel_of_player = {
        player['discord_id']: channel_of_team[player['team']]
        for player in game['players'].values()
        if 'discord_id' in player and player['team'] in channel_of_team
    }
    logging.info(
        "Resolved channels for players: %s",
        {k: v.name for k, v in channel_of_player.items()}
    )

    # Move all the players in one go, near-simultaneously
    await asyncio.gather(*[
        move_player(member, channel_of_player[member.id])
        for member in active_channel.members
        if member.id in channel_of_player
    ])

    # Find all the unknown players, and warn about them
    unknown_players = sorted(
        player['name']
        for player in game['players'].values()
        if 'discord_id' not in player
    )
    if unknown_players:
        await ctx.send(
            "I couldn't find Discord usernames for the following FAF players: " +
            ', '.join(unknown_players) +
            " - if you're one of those people, issue `f/set` with your FAF username."
        )
    # And that's it!


if __name__ == '__main__':
    full_config = read_config('config.yaml')
    init_oauth_config(full_config)
    assert 'discord' in full_config
    assert 'token' in full_config['discord']
    brackman.run(full_config['discord']['token'])  #, log_handler=file_log)
