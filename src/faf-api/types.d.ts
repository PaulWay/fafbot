
export interface Data<T> {
  data: T;
}

interface GameStub {
  type: 'game';
  id: string;
}

type FAFObjects = Game | GamePlayerStats | MapVersion | Player;

export interface Game extends GameStub {
  attributes: GameAttributes;
  relationships: Relationships;
  included: FAFObjects[];
}

enum Validity {
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

enum VictoryCondition {
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

enum Result {
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
  faction: 1 | 2 | 3 | 4 | 5 | 6;
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

interface Meta {
  page: Page;
}

interface Page {
  number: number;
  limit: number;
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
  avatarAssignments?: Data<Never[]>;
  bans?: Data<Never[]>;
  userNotes?: Data<Never[]>;
  names?: Data<NameRecordStub[]>;
  ladder1v1Rating?: Data<Ladder1v1RatingStub>;
  globalRating?: Data<GlobalRatingStub>;
  clanMembershipStub?: Data<ClanMembershipStubStub>;
}