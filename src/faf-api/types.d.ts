interface Meta {
  page: Page;
}
interface Page {
  number: number;
  limit: number;
}

export interface Data<T> {
  data: T;
  included?: FAFObjects[];
}

export interface DataPage<T> {
  data: (T)[];
  meta: Meta;
  included: FAFObjects[];
}

interface GameStub {
  type: 'game';
  id: string;
}

export interface Game extends GameStub {
  attributes: GameAttributes;
  relationships: Relationships;
  included: FAFObjects[];
}

type FAFObjects = GameData | GamePlayerStats | MapVersion | Player;

// export interface Game {
//   data: GameData;
//   included: FAFObjects[];
// }

export interface GameData {
  type: 'game';
  id: string;
  attributes: GameAttributes;
  relationships: Relationships;
}

declare enum Validity {
  VALID,
  TOO_MANY_DESYNCS,
  WRONG_VICTORY_CONDITION,
  NO_FOG_OF_WAR,
  CHEATS_ENABLED,
  PREBUILT_ENABLED,
  NORUSH_ENABLED,
  BAD_UNIT_RESTRICTIONS,
  BAD_MAP,
  TOO_SHORT,
  BAD_MOD,
  COOP_NOT_RANKED,
  MUTUAL_DRAW,
  SINGLE_PLAYER,
  FFA_NOT_RANKED,
  UNEVEN_TEAMS_NOT_RANKED,
  UNKNOWN_RESULT,
  TEAMS_UNLOCKED,
  MULTIPLE_TEAMS,
  HAS_AI,
  CIVILIANS_REVEALED,
  WRONG_DIFFICULTY,
  EXPANSION_DISABLED,
  SPAWN_NOT_FIXED,
  OTHER_UNRANK,
  UNRANKED_BY_HOST,
} 

declare enum VictoryCondition {
  DEMORALIZATION,
  DOMINATION,
  ERADICATION,
  SANDBOX,
}

export interface GameAttributes {
  endTime: string;
  name: string;
  replayAvailable: boolean;
  replayTicks: number;
  replayUrl: string;
  startTime: string;
  validity: Validity;
  victoryCondition: VictoryCondition
}

interface GamePlayerStatsStub {
  type: 'gamePlayerStats';
  id: string;
}

export interface GamePlayerStats extends GamePlayerStatsStub {
  attributes: GamePlayerStatsAttributes;
  relationships: Relationships;
}

declare enum Result {
  VICTORY,
  DEFEAT,
  DRAW,
  MUTUAL_DRAW,
  UNKNOWN,
  CONFLICTING,
}

interface GamePlayerStatsAttributes {
  ai: boolean;
  color: string;
  faction: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  team: number;
  startSpot: number;
  score: number;
  afterDeviation: number | null;
  beforeDeviation: number | null;
  afterMean: number | null;
  beforeMean: number | null;
  result: Result;
  scoreTime: string;
}

interface PlayerStub {
  type: 'player';
  id: string;
}

export interface Player extends PlayerStub {
  attributes: PlayerAttributes;
  meta: Meta;
}

interface PlayerAttributes {
  createTime: string;
  login: string;
  updateTime: string;
  userAgent: string;
}

interface LeaderboardRatingJournalStub {
  type: 'leaderboardRatingJournal';
  id: string;
}

interface FeaturedModStub {
  type: 'featuredMod';
  id: string;
}

interface MapVersionStub {
  type: 'mapVersion';
  id: string;
}

export interface MapVersion extends MapVersionStub {
  attributes: MapVersionAttributes;
  relationships: Relationships;
}

export interface MapVersionAttributes {
  createTime: string;
  description: string;
  downloadUrl: string;
  filename: string;
  folderName: string;
  gamesPlayed: number;
  height: number;
  hidden: boolean;
  maxPlayers: number;
  ranked: boolean;
  thumbnailUrlLarge: string;
  thumbnailUrlSmall: string;
  updateTime: string;
  version: number;
  width: number;
}

interface NameRecordStub {
  type: 'nameRecord',
  id: string;
}

interface Ladder1v1RatingStub {
  type: 'ladder1v1Rating';
  id: string;
}

interface GlobalRatingStub {
  type: 'globalRating';
  id: string;
}

interface ClanMembershipStub {
  type: 'clanMembership';
  id: string;
}

interface Relationships {
  game?: Data<GameStub>;
  player?: Data<PlayerStub>;
  host?: Data<PlayerStub>;
  ratingChanges?: Data<LeaderboardRatingJournalStub[]>;
  playerStats?: Data<GamePlayerStatsStub[]>;
  featuredMod?: Data<FeaturedModStub>;
  mapVersion?: Data<null|MapVersionStub>;
  reviews?: Data<LeaderboardRatingJournalStub[]>;
  reviewsSummary?: Data<null>;
  avatarAssignments?: Data<any[]>;
  bans?: Data<any[]>;
  userNotes?: Data<any[]>;
  names?: Data<NameRecordStub[]>;
  ladder1v1Rating?: Data<Ladder1v1RatingStub>;
  globalRating?: Data<GlobalRatingStub>;
  clanMembershipStub?: Data<ClanMembershipStub>;
}
