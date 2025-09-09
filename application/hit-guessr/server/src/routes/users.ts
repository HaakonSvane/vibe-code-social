import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            gamesAsPlayer1: true,
            gamesAsPlayer2: true,
            gameResults: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        gameResults: {
          select: {
            totalScore: true,
            position: true,
            game: {
              select: {
                type: true,
                finishedAt: true
              }
            }
          },
          where: {
            game: {
              status: 'FINISHED'
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    // Calculate stats for each user
    const leaderboardWithStats = leaderboard.map(user => {
      const results = user.gameResults;
      const totalGames = results.length;
      const totalScore = results.reduce((sum, result) => sum + result.totalScore, 0);
      const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
      const wins = results.filter(result => result.position === 1).length;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        stats: {
          totalGames,
          totalScore,
          averageScore,
          wins,
          winRate
        }
      };
    }).sort((a, b) => b.stats.averageScore - a.stats.averageScore);

    res.json(leaderboardWithStats);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get user game history
router.get('/games', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ],
        status: 'FINISHED'
      },
      include: {
        player1: {
          select: { id: true, username: true, avatar: true }
        },
        player2: {
          select: { id: true, username: true, avatar: true }
        },
        results: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true }
            }
          },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { finishedAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.game.count({
      where: {
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ],
        status: 'FINISHED'
      }
    });

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user games error:', error);
    res.status(500).json({ error: 'Failed to get user games' });
  }
});

export { router as userRoutes };
