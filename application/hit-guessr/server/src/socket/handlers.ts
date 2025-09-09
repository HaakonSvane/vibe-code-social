import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: string;
  username: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export function setupSocketHandlers(io: Server) {
  // Authentication middleware for socket connections
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.username} connected`);

    // Join game room
    socket.on('join-game', async (gameId: string) => {
      try {
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            player1: { select: { id: true, username: true, avatar: true } },
            player2: { select: { id: true, username: true, avatar: true } }
          }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Check if user is part of this game
        if (game.player1Id !== socket.user?.id && game.player2Id !== socket.user?.id) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        socket.join(gameId);
        
        // Notify other players
        socket.to(gameId).emit('player-joined', {
          user: socket.user,
          game
        });

        socket.emit('game-joined', { game });
      } catch (error) {
        console.error('Join game error:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Leave game room
    socket.on('leave-game', (gameId: string) => {
      socket.leave(gameId);
      socket.to(gameId).emit('player-left', {
        user: socket.user
      });
    });

    // Start game (for multiplayer)
    socket.on('start-game', async (gameId: string) => {
      try {
        const game = await prisma.game.findUnique({
          where: { id: gameId }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.player1Id !== socket.user?.id) {
          socket.emit('error', { message: 'Only the game creator can start the game' });
          return;
        }

        if (game.status !== 'WAITING') {
          socket.emit('error', { message: 'Game cannot be started' });
          return;
        }

        if (!game.player2Id) {
          socket.emit('error', { message: 'Waiting for second player' });
          return;
        }

        // Start the game
        const updatedGame = await prisma.game.update({
          where: { id: gameId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date()
          },
          include: {
            player1: { select: { id: true, username: true, avatar: true } },
            player2: { select: { id: true, username: true, avatar: true } },
            rounds: {
              where: { roundNumber: 1 },
              select: {
                id: true,
                roundNumber: true,
                previewUrl: true,
                albumImageUrl: true
              }
            }
          }
        });

        // Emit game started event to all players in the room
        io.to(gameId).emit('game-started', {
          game: updatedGame,
          currentRound: updatedGame.rounds[0]
        });

        // Start round countdown
        startRoundCountdown(io, gameId, 1, 30); // 30 seconds per round
      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Submit answer
    socket.on('submit-answer', async (data: {
      gameId: string;
      roundNumber: number;
      guessedArtist?: string;
      guessedTrack?: string;
      guessedYear?: number;
      timeToAnswer?: number;
    }) => {
      try {
        const { gameId, roundNumber, guessedArtist, guessedTrack, guessedYear, timeToAnswer } = data;

        // Get game and round
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            rounds: {
              where: { roundNumber },
              include: {
                answers: true
              }
            }
          }
        });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const round = game.rounds[0];
        if (!round) {
          socket.emit('error', { message: 'Round not found' });
          return;
        }

        // Check if user already submitted for this round
        const existingAnswer = round.answers.find(answer => answer.userId === socket.user?.id);
        if (existingAnswer) {
          socket.emit('error', { message: 'Answer already submitted' });
          return;
        }

        // Calculate scores (implementation from games route)
        const scores = calculateScores(
          { artist: guessedArtist, track: guessedTrack, year: guessedYear },
          { artist: round.artistName, track: round.trackName, year: round.releaseYear },
          timeToAnswer
        );

        // Save answer
        const answer = await prisma.roundAnswer.create({
          data: {
            roundId: round.id,
            userId: socket.user!.id,
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

        // Notify the player that their answer was submitted
        socket.emit('answer-submitted', { answer });

        // Check if all players have submitted answers
        const allAnswers = await prisma.roundAnswer.findMany({
          where: { roundId: round.id },
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          }
        });

        const expectedPlayers = game.type === 'SOLO' ? 1 : 2;
        if (allAnswers.length === expectedPlayers) {
          // All players submitted, show round results
          const roundResult = {
            roundNumber,
            correct: {
              artist: round.artistName,
              track: round.trackName,
              year: round.releaseYear,
              albumImage: round.albumImageUrl
            },
            answers: allAnswers
          };

          io.to(gameId).emit('round-completed', roundResult);

          // Check if game is finished
          if (roundNumber >= game.maxRounds) {
            await finishGame(io, gameId);
          } else {
            // Start next round after delay
            setTimeout(() => {
              startNextRound(io, gameId, roundNumber + 1);
            }, 5000); // 5 second delay between rounds
          }
        }
      } catch (error) {
        console.error('Submit answer error:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.username} disconnected`);
    });
  });
}

// Helper function to start round countdown
function startRoundCountdown(io: Server, gameId: string, roundNumber: number, seconds: number) {
  const countdown = setInterval(() => {
    io.to(gameId).emit('countdown', { roundNumber, seconds });
    seconds--;

    if (seconds < 0) {
      clearInterval(countdown);
      io.to(gameId).emit('round-timeout', { roundNumber });
    }
  }, 1000);
}

// Helper function to start next round
async function startNextRound(io: Server, gameId: string, roundNumber: number) {
  try {
    const round = await prisma.round.findFirst({
      where: {
        gameId,
        roundNumber
      },
      select: {
        id: true,
        roundNumber: true,
        previewUrl: true,
        albumImageUrl: true
      }
    });

    if (round) {
      await prisma.game.update({
        where: { id: gameId },
        data: { currentRound: roundNumber }
      });

      io.to(gameId).emit('round-started', {
        round,
        roundNumber
      });

      startRoundCountdown(io, gameId, roundNumber, 30);
    }
  } catch (error) {
    console.error('Start next round error:', error);
  }
}

// Helper function to finish game
async function finishGame(io: Server, gameId: string) {
  try {
    // Calculate final scores
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          include: {
            answers: {
              include: {
                user: { select: { id: true, username: true, avatar: true } }
              }
            }
          }
        }
      }
    });

    if (!game) return;

    // Calculate total scores for each player
    const playerScores = new Map<string, { user: any; totalScore: number }>();

    game.rounds.forEach(round => {
      round.answers.forEach(answer => {
        const current = playerScores.get(answer.userId) || { user: answer.user, totalScore: 0 };
        current.totalScore += answer.totalScore;
        playerScores.set(answer.userId, current);
      });
    });

    // Sort by score and assign positions
    const sortedPlayers = Array.from(playerScores.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    // Save final results
    const results = await Promise.all(
      sortedPlayers.map(async (player, index) => {
        return prisma.gameResult.create({
          data: {
            gameId,
            userId: player.user.id,
            totalScore: player.totalScore,
            position: index + 1
          },
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          }
        });
      })
    );

    // Update game status
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'FINISHED',
        finishedAt: new Date()
      }
    });

    // Emit final results
    io.to(gameId).emit('game-finished', {
      results,
      game
    });
  } catch (error) {
    console.error('Finish game error:', error);
  }
}

// Helper function to calculate scores (same as in games route)
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

  // Speed bonus
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
