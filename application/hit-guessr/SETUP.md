# Hit-Guessr Development Setup Guide

## Prerequisites

### Required Software
- **Node.js 18+**: [Download here](https://nodejs.org/)
- **PostgreSQL**: [Download here](https://www.postgresql.org/download/)
- **Redis** (optional, for production): [Download here](https://redis.io/download)

### Spotify Developer Account
1. Go to [Spotify for Developers](https://developer.spotify.com/)
2. Create a new application
3. Note down your `Client ID` and `Client Secret`
4. Add `http://localhost:3000` to your app's redirect URIs

## Quick Start

### 1. Run Setup Script
```bash
cd application/hit-guessr
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment Variables

#### Server Configuration (`server/.env`)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/hitguessr"
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
JWT_SECRET="your_super_secret_jwt_key_here"
REDIS_URL="redis://localhost:6379"
PORT=3000
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

#### Client Configuration (`client/.env`)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### 3. Database Setup

#### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hitguessr;

# Create user (optional)
CREATE USER hitguessr_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hitguessr TO hitguessr_user;
```

#### Run Migrations
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Start Development

#### Option A: Start Both Servers
```bash
npm run dev
```

#### Option B: Start Individually
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Database Studio**: `npx prisma studio` (in server directory)

## Project Structure

```
hit-guessr/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand state management
│   │   ├── lib/            # Utilities and services
│   │   └── ...
│   ├── package.json
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── lib/            # Services and utilities
│   │   ├── socket/         # Socket.IO handlers
│   │   └── ...
│   ├── prisma/             # Database schema
│   ├── package.json
│   └── ...
├── package.json            # Root package.json
├── README.md
└── setup.sh               # Setup script
```

## Features Implemented

### Core Game Features
- ✅ Solo gameplay mode
- ✅ Multiplayer challenges
- ✅ Real-time WebSocket communication
- ✅ Spotify integration for music snippets
- ✅ Scoring system (artist, song, year, speed bonus)
- ✅ User authentication and profiles

### Technical Features
- ✅ PostgreSQL database with Prisma ORM
- ✅ JWT authentication
- ✅ Real-time updates with Socket.IO
- ✅ RESTful API
- ✅ Responsive React frontend
- ✅ TypeScript throughout

## Development Commands

### Root Project
```bash
npm run dev           # Start both client and server
npm run build         # Build both projects
npm run start         # Start production server
npm run install:all   # Install all dependencies
```

### Server Commands
```bash
cd server
npm run dev           # Start development server
npm run build         # Build TypeScript
npm run start         # Start production server
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

### Client Commands
```bash
cd client
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -U postgres -l`

#### Spotify API Issues
- Verify Client ID and Secret are correct
- Check if your Spotify app has the correct redirect URIs
- Ensure you're using the Client Credentials flow

#### Port Conflicts
- Change ports in environment variables if needed
- Default ports: 3000 (server), 5173 (client)

#### WebSocket Connection Issues
- Ensure both servers are running
- Check firewall settings
- Verify CORS configuration

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL="your_production_database_url"
REDIS_URL="your_redis_url"
JWT_SECRET="your_production_jwt_secret"
CLIENT_URL="https://your-domain.com"
```

### Build for Production
```bash
npm run build
```

The built files will be in:
- Server: `server/dist/`
- Client: `client/dist/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
