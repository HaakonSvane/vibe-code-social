import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { socketService } from '../lib/socket';
import { Play, Pause, Volume2, Clock, Users, Trophy, Music } from 'lucide-react';
import toast from 'react-hot-toast';

interface Game {
  id: string;
  type: 'SOLO' | 'MULTIPLAYER';
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  currentRound: number;
  maxRounds: number;
  player1: { id: string; username: string; avatar?: string };
  player2?: { id: string; username: string; avatar?: string };
  rounds?: Round[];
}

interface Round {
  id: string;
  roundNumber: number;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  releaseYear: number;
  previewUrl?: string;
  albumImageUrl?: string;
}

interface RoundAnswer {
  guessedArtist?: string;
  guessedTrack?: string;
  guessedYear?: number;
}

interface RoundResult {
  correctAnswer: {
    artist: string;
    track: string;
    year: number;
  };
  playerAnswer: RoundAnswer;
  scores: {
    artistScore: number;
    trackScore: number;
    yearScore: number;
    speedBonus: number;
    totalScore: number;
  };
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [game, setGame] = useState<Game | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form state
  const [guessedArtist, setGuessedArtist] = useState('');
  const [guessedTrack, setGuessedTrack] = useState('');
  const [guessedYear, setGuessedYear] = useState<number | ''>('');
  
  // Results state
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    if (!gameId || !user) {
      navigate('/');
      return;
    }

    loadGame();
    setupSocketListeners();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      socketService.disconnect();
    };
  }, [gameId, user]);

  // Timer effect
  useEffect(() => {
    if (currentRound && timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isSubmitted) {
      handleSubmitAnswer();
    }
  }, [timeLeft, currentRound, isSubmitted]);

  const loadGame = async () => {
    try {
      const response = await api.get(`/games/${gameId}`);
      const gameData = response.data;
      setGame(gameData);
      
      if (gameData.status === 'IN_PROGRESS' && gameData.rounds) {
        const current = gameData.rounds.find((r: Round) => r.roundNumber === gameData.currentRound);
        if (current) {
          setCurrentRound(current);
          setTimeLeft(30);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load game:', error);
      toast.error('Failed to load game');
      navigate('/');
    }
  };

  const setupSocketListeners = () => {
    if (!user?.id) return;

    socketService.connect(localStorage.getItem('auth-storage') ? 
      JSON.parse(localStorage.getItem('auth-storage')!).state.token : '');

    socketService.joinGame(gameId!);

    socketService.on('game-state', (updatedGame: Game) => {
      setGame(updatedGame);
      if (updatedGame.status === 'IN_PROGRESS') {
        const current = updatedGame.rounds?.find(r => r.roundNumber === updatedGame.currentRound);
        if (current && current.id !== currentRound?.id) {
          setCurrentRound(current);
          setTimeLeft(30);
          setIsSubmitted(false);
          setShowResults(false);
          setRoundResult(null);
          resetForm();
        }
      }
    });

    socketService.on('round-result', (result: RoundResult) => {
      setRoundResult(result);
      setShowResults(true);
      setTotalScore(prev => prev + result.scores.totalScore);
    });

    socketService.on('game-finished', () => {
      toast.success('Game finished!');
      setTimeout(() => navigate('/'), 3000);
    });
  };

  const resetForm = () => {
    setGuessedArtist('');
    setGuessedTrack('');
    setGuessedYear('');
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentRound?.previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentRound || isSubmitted) return;

    setIsSubmitted(true);
    const timeToAnswer = Math.max(0, 30 - timeLeft);

    try {
      await api.post(`/games/${gameId}/submit`, {
        roundNumber: currentRound.roundNumber,
        guessedArtist: guessedArtist.trim() || undefined,
        guessedTrack: guessedTrack.trim() || undefined,
        guessedYear: guessedYear || undefined,
        timeToAnswer
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
      setIsSubmitted(false);
    }
  };

  const handleNextRound = () => {
    setShowResults(false);
    setRoundResult(null);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Game not found</h1>
          <button onClick={() => navigate('/')} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (game.status === 'WAITING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="card max-w-md text-center">
          <Users className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Waiting for Players</h1>
          <p className="text-gray-600 mb-6">
            Share this game ID with friends to start playing:
          </p>
          <div className="bg-gray-100 p-3 rounded-lg font-mono text-lg mb-6">
            {game.id.slice(0, 8)}
          </div>
          <div className="text-sm text-gray-500">
            Players: {game.player1.username}
            {game.player2 && `, ${game.player2.username}`}
          </div>
        </div>
      </div>
    );
  }

  if (showResults && roundResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="card max-w-2xl">
          <div className="text-center mb-6">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Round Results</h2>
            <p className="text-gray-600">Round {currentRound?.roundNumber} of {game.maxRounds}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Correct Answer</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Artist:</span> {roundResult.correctAnswer.artist}</p>
                <p><span className="font-medium">Track:</span> {roundResult.correctAnswer.track}</p>
                <p><span className="font-medium">Year:</span> {roundResult.correctAnswer.year}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Answer</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Artist:</span> {roundResult.playerAnswer.guessedArtist || 'Not answered'}</p>
                <p><span className="font-medium">Track:</span> {roundResult.playerAnswer.guessedTrack || 'Not answered'}</p>
                <p><span className="font-medium">Year:</span> {roundResult.playerAnswer.guessedYear || 'Not answered'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">{roundResult.scores.artistScore}</p>
                <p className="text-sm text-gray-600">Artist</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-600">{roundResult.scores.trackScore}</p>
                <p className="text-sm text-gray-600">Track</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{roundResult.scores.yearScore}</p>
                <p className="text-sm text-gray-600">Year</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{roundResult.scores.speedBonus}</p>
                <p className="text-sm text-gray-600">Speed</p>
              </div>
            </div>
            <div className="border-t pt-4 mt-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{roundResult.scores.totalScore}</p>
              <p className="text-sm text-gray-600">Total Round Score</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg mb-4">
              Total Game Score: <span className="font-bold text-primary-600">{totalScore}</span>
            </p>
            {game.currentRound < game.maxRounds ? (
              <button onClick={handleNextRound} className="btn-primary">
                Next Round
              </button>
            ) : (
              <div>
                <p className="text-xl font-bold text-gray-900 mb-4">Game Complete!</p>
                <button onClick={() => navigate('/')} className="btn-primary">
                  Return Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading round...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Game Header */}
        <div className="card mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Round {game.currentRound} of {game.maxRounds}
              </h1>
              <p className="text-gray-600">
                {game.type === 'SOLO' ? 'Solo Game' : 'Multiplayer Game'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-lg font-semibold text-gray-900 mb-1">
                <Clock className="h-5 w-5 mr-2" />
                {timeLeft}s
              </div>
              <p className="text-sm text-gray-600">Score: {totalScore}</p>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="card mb-6">
          <div className="text-center">
            <div className="mb-6">
              {currentRound.albumImageUrl && (
                <img 
                  src={currentRound.albumImageUrl} 
                  alt="Album cover"
                  className="w-48 h-48 mx-auto rounded-lg shadow-lg mb-4"
                />
              )}
              <Music className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            </div>
            
            {currentRound.previewUrl ? (
              <div>
                <audio 
                  ref={audioRef}
                  src={currentRound.previewUrl}
                  onEnded={() => setIsPlaying(false)}
                  preload="metadata"
                />
                <button
                  onClick={handlePlayPause}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full text-lg transition-colors"
                >
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                </button>
                <p className="text-gray-600 mt-4">Click to play the song preview</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Volume2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No preview available for this track</p>
              </div>
            )}
          </div>
        </div>

        {/* Guess Form */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Make Your Guesses</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist Name
              </label>
              <input
                type="text"
                value={guessedArtist}
                onChange={(e) => setGuessedArtist(e.target.value)}
                disabled={isSubmitted}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Who is the artist?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Song Title
              </label>
              <input
                type="text"
                value={guessedTrack}
                onChange={(e) => setGuessedTrack(e.target.value)}
                disabled={isSubmitted}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="What's the song title?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Year
              </label>
              <input
                type="number"
                value={guessedYear}
                onChange={(e) => setGuessedYear(e.target.value ? parseInt(e.target.value) : '')}
                disabled={isSubmitted}
                min="1900"
                max="2030"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="What year was it released?"
              />
            </div>
            
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitted || timeLeft === 0}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitted ? 'Answer Submitted' : 'Submit Answer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
