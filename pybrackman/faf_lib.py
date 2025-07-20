import logging
import requests
from requests_oauth2client import (
    OAuth2Client, ClientSecretPost, ApiClient, OAuth2ClientCredentialsAuth
)
import yaml

config = dict()
client = None
api_root = "https://api.faforever.com/data/"
api = None


def init_oauth_config(full_config):
    """
    Load the config for our OAuth2 setup from the 'oauth2' section of the
    config.yaml file, and initialise the client, oauth
    """
    if 'oauth2' not in full_config:
        print(f"ERROR: No oauth2 section in config")
        exit(1)
    global config
    config = full_config['oauth2']
    assert 'client_id' in config
    assert 'client_secret' in config
    assert 'token_url' in config
    global client
    client = OAuth2Client(
        config['token_url'],
        auth=ClientSecretPost(config['client_id'], config['client_secret'])
    )
    global api
    api = ApiClient(
        api_root, auth=OAuth2ClientCredentialsAuth(client)
    )
    logging.info("OAuth2 to FAF API successful")


def faf_get_player_for_user(faf_username):
    """
    Get the player details of a user given their username.
    """
    global api
    logging.info("got to faf_get_player_for_user(%s)", faf_username)
    name = requests.utils.quote(faf_username)
    path = f"player?filter=login=={name}&page[size]=1&include=names"
    resp = api.get(path)
    # logging.info("Received %s on get ID of %s: %s", resp.status_code, name, resp.content.decode())
    if resp.status_code != 200:
        logging.warn("Received %s on get ID of %s: %s", resp.status_code, name, resp.content.decode())
        return None
    # data.data[0].id
    # {"data":[{"type":"player","id":"129182",...], ...}
    player = resp.json()
    if 'data' not in player:
        # Data format error
        logging.error("Returned data had no 'data': %s", player)
        return None
    if len(player['data']) == 0:
        # Not found
        # Try looking for a name change...
        path = f"player?filter=names.name=={name}&page[size]=1&include=names"
        resp = api.get(path)
        if resp.status_code != 200:
            logging.warn("Received %s on get a name of %s: %s", resp.status_code, name, resp.content.decode())
            return None
        player = resp.json()
        if 'data' not in player:
            logging.error("Returned JSON had no 'data': %s", player)
            return None
        if len(player['data']) == 0:
            logging.error("Returned data had no listed data: %s", player)
            return None
    if 'type' in player['data'][0] and player['data'][0]['type'] == 'player':
        return player['data'][0]
    else:
        logging.error("Returned data didn't seem to be of type 'player': %s", player)
        # Data format error
        return None


def faf_get_id_for_user(faf_username):
    """
    Just use the get_player_for_username and get the ID alone.
    """
    logging.info(f"got to faf_get_id_for_user({faf_username=})")
    # player = faf_get_player_for_username(faf_username)
    name = requests.utils.quote(faf_username)
    path = f"player?filter=login=={name}&page[size]=1"
    global api
    resp = api.get(path)
    if resp.status_code != 200:
        logging.warn("Received %s on get ID of %s: %s", resp.status_code, name, resp.content.decode())
        return None
    player_data = resp.json()
    logging.info(f"... got {player_data=} back")
    if not player_data:
        return None
    try:
        return player_data['data'][0]['id']
    except (IndexError, KeyError):
        logging.warn("Data format error - can't find [data][0][id] in %s", player_data)
        return None


def faf_game_data_get_host_name(faf_data):
    """
    Try to get the name of the host, from the game's relationships and
    included data.

    gamedata['relationships']['host']['data']['id'] -> host_id
    data['included'][]['type'] == 'player':
      ['id'] == host_id:
        ['attributes']['login'] -> host_name

    If this fails, return 'someone'.
    """
    host_name = 'someone'
    try:
        host_id = faf_data['data'][0]['relationships']['host']['data']['id']
        for inc in faf_data['included']:
            if inc['type'] == 'player' and inc['id'] == host_id:
                host_name = inc['attributes']['login']
    except:
        pass
    # We don't know here if the person who issued the f/sort is the person who
    # created the game, so we can't change this to 'you' if that's the case.
    return host_name


def faf_data_to_game_data(faf_data):
    """
    Data received is pretty big - an example is in faf_get_last_game_for_faf_id.json.
    The mapping of fields is:
    gamedata = data['data'][0]
    gamedata['type'] == 'game'
    gamedata['id'] -> game['id']
    gamedata['attributes']['name'] -> game['name']
    gamedata['attributes']['endTime'] -> game['end_time']
    gamedata['relationships']['host']['data']['id'] -> int() -> game['host_faf_id']
    data['included'][]['type'] == 'gamePlayerStats':
      ['attributes']['team'] -> players[][id][team]
      ['relationships']['player']['data']['id'] -> players[][id]
    data['included'][]['type'] == 'player':
      ['id'] -> id
      ['attributes']['login'] -> players[][id]['name']

    Data returned is of this form:
    game = {
        'name': 'ANZ FAF MapGen',
        'end_time': "2023-11-28T05:31:36Z",
        'map': {
        },
        'teams': 2,
        'players': {  # indexed by faf_id for fast database lookup
            129182: {
                'name': 'PaulWay', 'team': 1
            },
            203724: {
                'name': 'crenn6977', 'team': 2
            }
        }
    }

    We also subtract 1 from the FAF team number because 1=FFA.
    """
    if 'data' not in faf_data:
        logging.warn("'data' not in %s", repr(faf_data))
        return {}
    if len(faf_data['data']) == 0:
        logging.warn("'data' list empty in %s", repr(faf_data))
        return {}
    gamedata = faf_data['data'][0]
    if ('type' not in gamedata) or (gamedata['type'] != 'game'):
        logging.warn("data doesn't look like a game in %s", repr(game_data))
        return {}
    game = {
        'name': gamedata['attributes']['name'],
        'id': gamedata['id'],
        'end_time': gamedata['attributes'].get('endTime'),
        'start_time': gamedata['attributes']['startTime'],
        'host_faf_id': gamedata['relationships']['host']['data']['id'],
        # 'host_faf_name': gamedata['relationships']['host']['data'].get('name', 'name?'),
        # host's ID is given, need to look at the players and try to get their name.
        'host_faf_name': faf_game_data_get_host_name(faf_data)
    }
    players = dict()
    max_team = 0
    for include in faf_data['included']:
        key = ''
        # Get data in two different ways, both indexed on faf_id
        if include['type'] == 'player':
           faf_id = include['id']
           key = 'name'
           value = include['attributes']['login']
        elif include['type'] == 'gamePlayerStats':
           faf_id = include['relationships']['player']['data']['id']
           key = 'team'
           value = include['attributes']['team'] - 1  # team 1 = FFA
           if value > max_team:
               max_team = value
        # Player data from name or team keys - others set directly?
        if key in ('name', 'team'):
            if faf_id not in players:
               players[faf_id] = dict()
            players[faf_id][key] = value
    game['players'] = players
    game['teams'] = max_team
    logging.info(
        "FAF says last game for %s (id %s) has players %s",
        players[faf_id]['name'], faf_id, players
    )
    return game


def faf_get_last_game_for_faf_id(faf_id):
    """
    Get the last game data for a given player's FAF ID.

    See the faf_data_to_game_data() function for the return value.
    """
    # quid = requests.utils.quote(str(faf_id))
    # faf_id here comes from the API - it's an integer.
    path = (
        f"game?filter=playerStats.player.id=={faf_id}&sort=-id&page[size]=1&" +
        f"include=host,playerStats.player,mapVersion,mapVersion.map"
    )
    global api
    resp = api.get(path)
    if resp.status_code != 200:
        logging.warn("Received %s on game for %s: %s", resp.status_code, faf_id, resp.content.decode())
    # logging.info("Game data for FAF id %s = %s", faf_id, resp.json())
    jsondata = resp.json()
    if 'data' in jsondata and len(jsondata['data']) > 0 and 'id' in jsondata['data'][0]:
        game_id = jsondata['data'][0]['id']
        with open(f"/tmp/game_{game_id}.json", 'w') as fh:
            fh.write(resp.content.decode())
            fh.write('\n')
    return faf_data_to_game_data(jsondata)
