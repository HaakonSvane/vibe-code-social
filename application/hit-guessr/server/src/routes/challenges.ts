import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import Joi from 'joi';

const router = Router();

const createChallengeSchema = Joi.object({
  challengedUsername: Joi.string().required(),
  message: Joi.string().max(200).optional()
});

// Create challenge
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { error, value } = createChallengeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { challengedUsername, message } = value;
    const challengerId = req.user!.id;

    // Find challenged user
    const challengedUser = await prisma.user.findUnique({
      where: { username: challengedUsername }
    });

    if (!challengedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (challengedUser.id === challengerId) {
      return res.status(400).json({ error: 'Cannot challenge yourself' });
    }

    // Create game for the challenge
    const game = await prisma.game.create({
      data: {
        type: 'MULTIPLAYER',
        player1Id: challengerId,
        status: 'WAITING'
      }
    });

    // Create challenge
    const challenge = await prisma.challenge.create({
      data: {
        gameId: game.id,
        challengerId,
        challengedId: challengedUser.id,
        message,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      include: {
        challenger: {
          select: { id: true, username: true, avatar: true }
        },
        challenged: {
          select: { id: true, username: true, avatar: true }
        },
        game: true
      }
    });

    res.status(201).json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Get user's challenges
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [
          { challengerId: userId },
          { challengedId: userId }
        ],
        status: { in: ['PENDING', 'ACCEPTED'] }
      },
      include: {
        challenger: {
          select: { id: true, username: true, avatar: true }
        },
        challenged: {
          select: { id: true, username: true, avatar: true }
        },
        game: {
          select: { id: true, status: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(challenges);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

// Get specific challenge
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: {
          select: { id: true, username: true, avatar: true }
        },
        challenged: {
          select: { id: true, username: true, avatar: true }
        },
        game: true
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user is involved in this challenge
    if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(challenge);
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({ error: 'Failed to get challenge' });
  }
});

// Accept challenge
router.post('/:id/accept', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { game: true }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.challengedId !== userId) {
      return res.status(403).json({ error: 'Only the challenged user can accept' });
    }

    if (challenge.status !== 'PENDING') {
      return res.status(400).json({ error: 'Challenge is no longer pending' });
    }

    if (new Date() > challenge.expiresAt) {
      // Update expired challenge
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'Challenge has expired' });
    }

    // Accept challenge and start game
    await prisma.$transaction(async (tx) => {
      await tx.challenge.update({
        where: { id: challengeId },
        data: { status: 'ACCEPTED' }
      });

      await tx.game.update({
        where: { id: challenge.gameId },
        data: {
          player2Id: userId,
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });
    });

    const updatedChallenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: {
          select: { id: true, username: true, avatar: true }
        },
        challenged: {
          select: { id: true, username: true, avatar: true }
        },
        game: {
          include: {
            player1: {
              select: { id: true, username: true, avatar: true }
            },
            player2: {
              select: { id: true, username: true, avatar: true }
            }
          }
        }
      }
    });

    res.json(updatedChallenge);
  } catch (error) {
    console.error('Accept challenge error:', error);
    res.status(500).json({ error: 'Failed to accept challenge' });
  }
});

// Decline challenge
router.post('/:id/decline', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.challengedId !== userId) {
      return res.status(403).json({ error: 'Only the challenged user can decline' });
    }

    if (challenge.status !== 'PENDING') {
      return res.status(400).json({ error: 'Challenge is no longer pending' });
    }

    // Decline challenge and cancel game
    await prisma.$transaction(async (tx) => {
      await tx.challenge.update({
        where: { id: challengeId },
        data: { status: 'DECLINED' }
      });

      await tx.game.update({
        where: { id: challenge.gameId },
        data: { status: 'CANCELLED' }
      });
    });

    res.json({ message: 'Challenge declined' });
  } catch (error) {
    console.error('Decline challenge error:', error);
    res.status(500).json({ error: 'Failed to decline challenge' });
  }
});

export { router as challengeRoutes };
