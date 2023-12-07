import logging
import requests
# from oauthlib.oauth2 import BackendApplicationClient, TokenExpiredError
# from requests_oauthlib import OAuth2Session
from requests_oauth2client import (
    OAuth2Client, ClientSecretPost, ApiClient, OAuth2ClientCredentialsAuth
)
import yaml

# logger = logging.getLogger('brackman')

# Load this from the config.yaml 'oauth2' section via load_oauth_config()
config = dict()
client = None
api_root = "https://api.faforever.com/data/"
api = None
# oauth = None
# token = None


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
    # global client
    # client = BackendApplicationClient(client_id=config['client_id'])
    # print(f"Set up {client=}")
    # global oauth
    # oauth = OAuth2Session(
        # client=client,
        # # auto_refresh_url=config.get('refresh_url', config['token_url']), ??
        # token_endpoint_auth_method="client_secret_post"
    # )
    # print(f"Set up {oauth=}")
    # global token
    # token = oauth.fetch_token(
        # token_url=config['token_url'], client_id=config['client_id'],
        # client_secret=config['client_secret']
    # )
    # print(f"Got {token=}")
    # global oauth
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


def make_request(url):
    """
    Make the request and handle any OAuth2 retries and setup.
    """
    global oauth
    assert oauth is not None  # need config for init
    extra_data = {
        'client_id': config['client_id'],
        'client_secret': config['client_secret']
    }
    # global token
    # try:
    #     response = oauth.get(url)
    # except TokenExpiredError as e:
    #     token = oauth.refresh_token(config['token_url'], **extra_data)
    #     oauth = OAuth2Session(client_id, token=token)
    #     response = oauth.get(url)
    response = oauth.get(url)
    return response


def faf_get_id_for_user(faf_username):
    """
    Get the ID of a user given their username.
    """
    name = requests.utils.quote(faf_username)
    path = f"player?filter=login=={name}&page[size]=1"
    # resp = make_request(url)
    global api
    resp = api.get(path)
    logging.info("Received %s on get ID of %s: %s", resp.status_code, name, resp.content.decode())
    if resp.status_code != 200:
        logging.warn("Received %s on get ID of %s: %s", resp.status_code, name, resp.content.decode())
        return None
    # data.data[0].id
    # {"data":[{"type":"player","id":"129182",...], ...}
    player = resp.json()
    if 'data' not in player:
        # Data format error
        return None
    if len(player['data']) == 0:
        # Not found
        return None
    if 'type' in player['data'][0] and player['data'][0]['type'] == 'player' and 'id' in player['data'][0]:
        return player['data'][0]['id']
    else:
        # Data format error
        return None


def faf_data_to_game_data(faf_data):
    """
    Data received is pretty big - an example is in faf_get_last_game_for_faf_id.json.
    The mapping of fields is:
    gamedata = data['data'][0]
    gamedata['type'] == 'game'
    gamedata['attributes']['name'] -> game['name']
    gamedata['attributes']['endTime'] -> game['end_time']
    gamedata['relationships']['host']['data']['id'] -> int() -> game['host_faf_id']
    data['included'][]['type'] == 'gamePlayerStats':
      ['attributes']['team'] -> players[][id][team]
      ['relationships']['player']['data']['id'] -> players[][id]
    data['included'][]['type'] == 'player':
      ['id'] -> id
      ['attributes']['login'] -> players[][id]['name']
    """
    if 'data' not in faf_data:
        logger.warn("'data' not in %s", repr(faf_data))
        return {}
    if len(faf_data['data']) == 0:
        logger.warn("'data' list empty in %s", repr(faf_data))
        return {}
    gamedata = faf_data['data'][0]
    if ('type' not in gamedata) or (gamedata['type'] != 'game'):
        logger.warn("data doesn't look like a game in %s", repr(game_data))
        return {}
    game = {
        'name': gamedata['attributes']['name'],
        'end_time': gamedata['attributes'].get('endTime'),
        'start_time': gamedata['attributes']['startTime'],
        'host_faf_id': gamedata['relationships']['host']['data']['id']
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
    return game


def faf_get_last_game_for_faf_id(faf_id):
    """
    Get the last game data for a given player's FAF ID.

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
    return faf_data_to_game_data(resp.json())
