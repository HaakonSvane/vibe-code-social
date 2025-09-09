import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { Music, Play, Users, Trophy, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const createSoloGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    setIsCreatingGame(true);
    try {
      const response = await api.post('/games', {
        type: 'SOLO',
        maxRounds: 5
      });
      
      const gameId = response.data.id;
      navigate(`/game/${gameId}`);
    } catch (error: any) {
      console.error('Failed to create game:', error);
      toast.error('Failed to create game. Please try again.');
    } finally {
      setIsCreatingGame(false);
    }
  };

  const createMultiplayerGame = async () => {
    if (!user) {
      toast.error('Please login to play');
      navigate('/login');
      return;
    }

    setIsCreatingGame(true);
    try {
      const response = await api.post('/games', {
        type: 'MULTIPLAYER',
        maxRounds: 5
      });
      
      const gameId = response.data.id;
      navigate(`/game/${gameId}`);
    } catch (error: any) {
      console.error('Failed to create game:', error);
      toast.error('Failed to create game. Please try again.');
    } finally {
      setIsCreatingGame(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-primary-600 p-6 rounded-full shadow-lg">
                <Music className="h-16 w-16 text-white" />
              </div>
            </div>
            
            <h1 className="text-6xl font-extrabold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Hit-Guessr
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Test your music knowledge! Listen to song snippets and guess the artist, 
              song name, and release year. Challenge friends or play solo to become 
              the ultimate music master.
            </p>

            {/* Game Mode Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <button
                onClick={createSoloGame}
                disabled={isCreatingGame}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-3 shadow-lg"
              >
                <Play className="h-6 w-6" />
                <span>Play Solo</span>
              </button>
              
              <button
                onClick={createMultiplayerGame}
                disabled={isCreatingGame}
                className="bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center space-x-3 shadow-lg"
              >
                <Users className="h-6 w-6" />
                <span>Challenge Friends</span>
              </button>
            </div>

            {!user && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto border border-white/20">
                <p className="text-gray-700 mb-4">
                  Ready to start guessing? Create an account or sign in to play!
                </p>
                <div className="flex space-x-4">
                  <Link 
                    to="/register" 
                    className="flex-1 btn-primary text-center"
                  >
                    Sign Up
                  </Link>
                  <Link 
                    to="/login" 
                    className="flex-1 btn-outline text-center"
                  >
                    Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/50 backdrop-blur-sm py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to music mastery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Music className="h-10 w-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Listen to Snippets
              </h3>
              <p className="text-gray-600">
                Hear 15-30 second previews of popular songs from different eras and genres.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Make Your Guesses
              </h3>
              <p className="text-gray-600">
                Guess the artist, song title, and release year. The faster you answer, the more points you earn!
              </p>
            </div>

            <div className="text-center">
              <div className="bg-yellow-100 p-6 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Climb the Leaderboard
              </h3>
              <p className="text-gray-600">
                Compete with players worldwide and see how your music knowledge stacks up!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Section */}
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Scoring System
            </h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-primary-900 mb-2">Artist</h3>
                <p className="text-sm text-primary-700">Up to 100 points</p>
              </div>
              
              <div className="bg-secondary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-secondary-900 mb-2">Song Title</h3>
                <p className="text-sm text-secondary-700">Up to 100 points</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Release Year</h3>
                <p className="text-sm text-green-700">Up to 100 points</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Speed Bonus</h3>
                <p className="text-sm text-yellow-700">Up to 50 points</p>
              </div>
            </div>
            
            <p className="text-gray-600 mt-6">
              Maximum score per round: <span className="font-bold text-primary-600">350 points</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
