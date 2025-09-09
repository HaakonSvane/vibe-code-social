import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      this.disconnect();
    }

    this.socket = io(WS_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Game specific methods
  joinGame(gameId: string) {
    if (this.socket) {
      this.socket.emit('join-game', gameId);
    }
  }

  leaveGame(gameId: string) {
    if (this.socket) {
      this.socket.emit('leave-game', gameId);
    }
  }

  startGame(gameId: string) {
    if (this.socket) {
      this.socket.emit('start-game', gameId);
    }
  }

  submitAnswer(data: {
    gameId: string;
    roundNumber: number;
    guessedArtist?: string;
    guessedTrack?: string;
    guessedYear?: number;
    timeToAnswer?: number;
  }) {
    if (this.socket) {
      this.socket.emit('submit-answer', data);
    }
  }

  // Event listeners
  onGameJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game-joined', callback);
    }
  }

  onPlayerJoined(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('player-joined', callback);
    }
  }

  onPlayerLeft(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('player-left', callback);
    }
  }

  onGameStarted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game-started', callback);
    }
  }

  onRoundStarted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('round-started', callback);
    }
  }

  onCountdown(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('countdown', callback);
    }
  }

  onAnswerSubmitted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('answer-submitted', callback);
    }
  }

  onRoundCompleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('round-completed', callback);
    }
  }

  onGameFinished(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('game-finished', callback);
    }
  }

  onError(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();
