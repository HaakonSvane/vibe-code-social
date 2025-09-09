// Game types to replace Prisma enums for SQLite compatibility
export enum GameType {
  SOLO = "SOLO",
  MULTIPLAYER = "MULTIPLAYER"
}

export enum GameStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS", 
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED"
}

export enum ChallengeStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED"
}

// Type guards for validation
export function isValidGameType(type: string): type is GameType {
  return Object.values(GameType).includes(type as GameType);
}

export function isValidGameStatus(status: string): status is GameStatus {
  return Object.values(GameStatus).includes(status as GameStatus);
}

export function isValidChallengeStatus(status: string): status is ChallengeStatus {
  return Object.values(ChallengeStatus).includes(status as ChallengeStatus);
}

// API response types
export interface GameWithPlayers {
  id: string;
  type: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  player1: {
    id: string;
    username: string;
    avatar: string | null;
  };
  player2: {
    id: string;
    username: string;
    avatar: string | null;
  } | null;
}

export interface RoundData {
  id: string;
  roundNumber: number;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  releaseYear: number;
  previewUrl: string | null;
  albumImageUrl: string | null;
}
