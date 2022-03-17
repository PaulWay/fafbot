import axios, { AxiosResponse } from 'axios';
import { 
    Data, DataPage, GameData, GamePlayerStats, MapVersion, MapVersionAttributes,
    Player, PlayerStub, Validity, VictoryCondition, FAFObjects
} from './types';
import helper from '../common/helper';

export interface Team {
    team: string;
    players: {
        id: string;
        name: string;
    }[];
}

export interface Match {
    id: string;
    map: MapVersionAttributes | undefined;
    teams: Team[];
    endTime: string;
    name: string;
    replayAvailable: boolean;
    replayTicks: number;
    replayUrl: string;
    startTime: string;
    validity: Validity;
    victoryCondition: VictoryCondition;
}

let getPlayerCurrentMatch = async (player_id: number) => {
    // Actually gets the most recent match, which might be ended.
    let result;
    try{
        let url = `https://api.faforever.com/data/gamePlayerStats?include=game&filter=player.id==${player_id}&sort=-id&page[size]=1`
        let res = await axios.get<DataPage<GamePlayerStats>>(url)
        // console.log(res.data.included[0]);
        if (res.data && res.data.included
            && res.data.included[0]
            && res.data.included[0].attributes
        ) {
            // && res.data.included[0].attributes.endTime === null) {
            result = res.data.included[0];
            console.log("... found match", result.id, "named", result.attributes.name);
        }
    } catch (e) {
        console.log('err in getPlayerCurrentMatch', e);
    }
    if (result) {
        console.log('getPlayerCurrentMatch(', player_id, ') returns match with id', result.id, 'name', result.attributes.name);
    } else {
        console.log('Player', player_id, 'not in a match?')
    }
    return result;
}
let searchUser = async (term): Promise<number> => {
    let result;
    try{
        let url = `https://api.faforever.com/data/player?filter=login=="${term}"&page[size]=1`
        let res = await axios.get(url);
        if (res.data && res.data.data && res.data.data[0]) {
            result = res.data.data[0].id;
        }
    } catch (e) {
        console.log('err in searchUser', e);
    }
    return result;
}

/**
 * Get a match from the api
 * @param match_id
 */
let getMatch = async (match_id: string): Promise<Match|null> => {
    try {
        const game_url = `https://api.faforever.com/data/game/${match_id}?include=playerStats,mapVersion`
        const res = await axios.get<Data<GameData>>(game_url);
        let map: MapVersionAttributes | undefined;
        const teams: Record<string, Team> = {};
        if (res.data) {
            let datastruct = res.data;
            let matchData = datastruct.data;
            console.log('match data:', matchData);
            const id = matchData.id;
            const match = matchData.attributes;
            const included = <FAFObjects[]>datastruct.included;
            console.log('searched for match id', match_id, 'found match', id);
            let player_in_team = {};
            let query = '';
            await helper.processArray(included, item => {
                // console.log(item);
                if (item.type === 'gamePlayerStats') {
                    let player_id = (item.relationships.player as unknown as Data<PlayerStub>).data.id;
                    let team_no = item.attributes.team - 1;
                    player_in_team[player_id] = team_no;
                    console.log("game has player", player_id, "in team", team_no);
                    if (query === '') {
                        query = query + 'id==' + player_id;
                    } else {
                        query = query + ',id==' + player_id;
                    }
                } else if (item.type === 'mapVersion') {
                    map = (item as MapVersion).attributes;
                }
            });
            let url = `https://api.faforever.com/data/player?filter=${query}&page[size]=16`
            const { data: players_page } = await axios.get<DataPage<Player>>(url);
            const players = players_page.data;
            console.log('players in match', players);
            if (players) {
                await helper.processArray(players, player => {
                    if (!teams[player_in_team[player.id]]) {
                        teams[player_in_team[player.id]] = {
                            team: player_in_team[player.id],
                            players: []
                        };
                    }
                    teams[player_in_team[player.id]].players.push({
                        id: player.id,
                        name: player.attributes.login,
                    });
                })
            }
            return {
                ...match,
                id,
                map: map ? map : undefined,
                teams: Object.values(teams),
            }
        }
    } catch (e) {
        console.log('err', e);
    }
    return null;
}

export default {
    getPlayerCurrentMatch: getPlayerCurrentMatch,
    searchUser: searchUser,
    getMatch: getMatch,
}
