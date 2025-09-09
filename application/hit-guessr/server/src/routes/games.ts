import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { spotifyService } from '../lib/spotify';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createGameSchema = Joi.object({
  type: Joi.string().valid('SOLO', 'MULTIPLAYER').required(),
  maxRounds: Joi.number().min(1).max(10).default(5)
});

const submitAnswerSchema = Joi.object({
  roundNumber: Joi.number().min(1).required(),
  guessedArtist: Joi.string().optional(),
  guessedTrack: Joi.string().optional(),
  guessedYear: Joi.number().min(1900).max(2030).optional(),
  timeToAnswer: Joi.number().min(0).optional()
});

// Create new game
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createGameSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { type, maxRounds } = value;
    const userId = req.user!.id;

    // Create game
    const game = await prisma.game.create({
      data: {
        type,
        maxRounds,
        player1Id: userId,
        status: type === 'SOLO' ? 'IN_PROGRESS' : 'WAITING'
      },
      include: {
        player1: {
          select: { id: true, username: true, avatar: true }
        },
        player2: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    // Generate rounds for the game
    await generateGameRounds(game.id, maxRounds);

    if (type === 'SOLO') {
      await prisma.game.update({
        where: { id: game.id },
        data: { startedAt: new Date() }
      });
    }

    res.status(201).json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get game details
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user!.id;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: {
          select: { id: true, username: true, avatar: true }
        },
        player2: {
          select: { id: true, username: true, avatar: true }
        },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            answers: {
              where: { userId },
              select: {
                guessedArtist: true,
                guessedTrack: true,
                guessedYear: true,
                totalScore: true,
                submittedAt: true
              }
            }
          }
        },
        results: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true }
            }
          },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user is allowed to access this game
    if (game.player1Id !== userId && game.player2Id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Join multiplayer game
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user!.id;

    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.type !== 'MULTIPLAYER') {
      return res.status(400).json({ error: 'Can only join multiplayer games' });
    }

    if (game.status !== 'WAITING') {
      return res.status(400).json({ error: 'Game is not accepting players' });
    }

    if (game.player1Id === userId) {
      return res.status(400).json({ error: 'You are already in this game' });
    }

    if (game.player2Id) {
      return res.status(400).json({ error: 'Game is full' });
    }

    // Join the game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        player2Id: userId,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      },
      include: {
        player1: {
          select: { id: true, username: true, avatar: true }
        },
        player2: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    res.json(updatedGame);
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Submit answer for a round
router.post('/:id/submit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user!.id;

    const { error, value } = submitAnswerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { roundNumber, guessedArtist, guessedTrack, guessedYear, timeToAnswer } = value;

    // Get game and round
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          where: { roundNumber },
          include: {
            answers: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.player1Id !== userId && game.player2Id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (game.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Game is not in progress' });
    }

    const round = game.rounds[0];
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.answers.length > 0) {
      return res.status(400).json({ error: 'Answer already submitted for this round' });
    }

    // Calculate scores
    const scores = calculateScores(
      { artist: guessedArtist, track: guessedTrack, year: guessedYear },
      { artist: round.artistName, track: round.trackName, year: round.releaseYear },
      timeToAnswer
    );

    // Save answer
    const answer = await prisma.roundAnswer.create({
      data: {
        roundId: round.id,
        userId,
        guessedArtist,
        guessedTrack,
        guessedYear,
        timeToAnswer,
        artistScore: scores.artistScore,
        trackScore: scores.trackScore,
        yearScore: scores.yearScore,
        speedBonus: scores.speedBonus,
        totalScore: scores.totalScore
      }
    });

    res.json(answer);
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Helper function to generate game rounds
async function generateGameRounds(gameId: string, maxRounds: number) {
  try {
    const tracks = await spotifyService.getRandomTracks([], maxRounds);
    
    const roundsData = tracks.map((track, index) => ({
      gameId,
      roundNumber: index + 1,
      spotifyTrackId: track.id,
      trackName: track.name,
      artistName: spotifyService.getMainArtistName(track.artists),
      releaseYear: spotifyService.extractReleaseYear(track.album.release_date),
      previewUrl: track.preview_url,
      albumImageUrl: spotifyService.getLargestAlbumImage(track.album.images)
    }));

    await prisma.round.createMany({
      data: roundsData
    });
  } catch (error) {
    console.error('Failed to generate rounds:', error);
    throw new Error('Failed to generate game rounds');
  }
}

// Helper function to calculate scores
function calculateScores(
  guesses: { artist?: string; track?: string; year?: number },
  correct: { artist: string; track: string; year: number },
  timeToAnswer?: number
): {
  artistScore: number;
  trackScore: number;
  yearScore: number;
  speedBonus: number;
  totalScore: number;
} {
  let artistScore = 0;
  let trackScore = 0;
  let yearScore = 0;
  let speedBonus = 0;

  // Artist scoring
  if (guesses.artist) {
    const guessedLower = guesses.artist.toLowerCase().trim();
    const correctLower = correct.artist.toLowerCase().trim();
    
    if (guessedLower === correctLower) {
      artistScore = 100;
    } else if (correctLower.includes(guessedLower) || guessedLower.includes(correctLower)) {
      artistScore = 50;
    }
  }

  // Track scoring
  if (guesses.track) {
    const guessedLower = guesses.track.toLowerCase().trim();
    const correctLower = correct.track.toLowerCase().trim();
    
    if (guessedLower === correctLower) {
      trackScore = 100;
    } else if (correctLower.includes(guessedLower) || guessedLower.includes(correctLower)) {
      trackScore = 50;
    }
  }

  // Year scoring
  if (guesses.year) {
    const yearDiff = Math.abs(guesses.year - correct.year);
    if (yearDiff === 0) {
      yearScore = 100;
    } else if (yearDiff === 1) {
      yearScore = 50;
    } else if (yearDiff === 2) {
      yearScore = 25;
    }
  }

  // Speed bonus (max 50 points, decreases over 30 seconds)
  if (timeToAnswer && timeToAnswer <= 30) {
    speedBonus = Math.max(0, Math.floor(50 - (timeToAnswer / 30) * 50));
  }

  const totalScore = artistScore + trackScore + yearScore + speedBonus;

  return {
    artistScore,
    trackScore,
    yearScore,
    speedBonus,
    totalScore
  };
}

export { router as gameRoutes };
