# Hit-Guessr 🎵

A music guessing game inspired by GeoGuessr and Hitster where players listen to song snippets and guess the artist, song name, and release year.

## Features

- 🎮 **Solo Mode**: Practice your music knowledge alone
- 👥 **Multiplayer Battles**: Challenge friends in 5-round matchups
- 🎵 **Spotify Integration**: Real song previews and metadata
- ⚡ **Real-time Updates**: Live score tracking via WebSocket
- 🏆 **Scoring System**: Points based on accuracy and speed
- 📱 **Responsive Design**: Works on desktop and mobile

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Socket.io client for real-time communication

### Backend
- Node.js with Express
- TypeScript
- Socket.io for WebSocket connections
- Prisma ORM with PostgreSQL
- Spotify Web API integration

### Database
- PostgreSQL for persistent data
- Redis for session management and caching

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional, for production)
- Spotify Developer Account

### Installation

1. Clone the repository and navigate to the project:
```bash
cd application/hit-guessr
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Copy example env files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

4. Configure your environment variables in `server/.env`:
```
DATABASE_URL="postgresql://username:password@localhost:5432/hitguessr"
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
JWT_SECRET="your_jwt_secret"
REDIS_URL="redis://localhost:6379"
```

5. Set up the database:
```bash
npm run db:migrate
npm run db:seed
```

6. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Game Rules

### Scoring
- **Artist**: 100 points for exact match, 50 points for partial match
- **Song Title**: 100 points for exact match, 50 points for partial match  
- **Release Year**: 100 points for exact year, 50 points for ±1 year, 25 points for ±2 years
- **Speed Bonus**: Up to 50 additional points based on answer speed

### Round Structure
- Each game consists of 5 rounds
- 30 seconds per round to make guesses
- Song snippets are 15-30 seconds long
- Results shown after each round

## API Endpoints

### Game Management
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/join` - Join multiplayer game
- `POST /api/games/:id/submit` - Submit round answer

### User Management
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile
- `GET /api/users/leaderboard` - Get leaderboard

### Challenges
- `POST /api/challenges` - Create challenge invite
- `GET /api/challenges/:id` - Get challenge details
- `POST /api/challenges/:id/accept` - Accept challenge

## WebSocket Events

### Client → Server
- `join-game` - Join a game room
- `submit-answer` - Submit round answer
- `start-game` - Start multiplayer game

### Server → Client
- `game-state` - Updated game state
- `round-result` - Results for completed round
- `game-finished` - Final game results
- `player-joined` - New player joined
- `countdown` - Round countdown timer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
