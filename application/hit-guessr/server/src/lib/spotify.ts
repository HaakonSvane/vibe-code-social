import axios from 'axios';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    release_date: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  preview_url: string | null;
  popularity: number;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Spotify access token:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  async searchTracks(query: string, limit: number = 50): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get<SpotifySearchResponse>(
        'https://api.spotify.com/v1/search',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: {
            q: query,
            type: 'track',
            limit,
            market: 'US', // Ensures we get preview URLs
          },
        }
      );

      return response.data.tracks.items.filter(track => 
        track.preview_url !== null && track.popularity > 30
      );
    } catch (error) {
      console.error('Failed to search Spotify tracks:', error);
      throw new Error('Failed to search tracks');
    }
  }

  async getRandomTracks(genres: string[] = [], limit: number = 5): Promise<SpotifyTrack[]> {
    // Check if Spotify credentials are configured
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret || 
        clientId === 'your_spotify_client_id' || 
        clientSecret === 'your_spotify_client_secret') {
      console.warn('Spotify credentials not configured, using mock data');
      return this.getMockTracks(limit);
    }

    try {
      const queries = [
        // Popular decades and genres
        'year:1980-1989',
        'year:1990-1999', 
        'year:2000-2009',
        'year:2010-2019',
        'genre:pop',
        'genre:rock',
        'genre:hip-hop',
        'genre:indie',
        'genre:electronic'
      ];

      const randomQuery = queries[Math.floor(Math.random() * queries.length)];
      const tracks = await this.searchTracks(randomQuery, 50);
      
      // Shuffle and return requested number
      const shuffled = tracks.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('Spotify API failed, falling back to mock data:', error);
      return this.getMockTracks(limit);
    }
  }

  private getMockTracks(limit: number): SpotifyTrack[] {
    const mockTracks: SpotifyTrack[] = [
      {
        id: 'mock-track-1',
        name: 'Bohemian Rhapsody',
        artists: [{ name: 'Queen' }],
        album: {
          name: 'A Night at the Opera',
          release_date: '1975-11-21',
          images: [{ url: 'https://via.placeholder.com/640x640/9333ea/ffffff?text=Queen', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 85
      },
      {
        id: 'mock-track-2',
        name: 'Billie Jean',
        artists: [{ name: 'Michael Jackson' }],
        album: {
          name: 'Thriller',
          release_date: '1982-11-30',
          images: [{ url: 'https://via.placeholder.com/640x640/dc2626/ffffff?text=MJ', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 90
      },
      {
        id: 'mock-track-3',
        name: 'Smells Like Teen Spirit',
        artists: [{ name: 'Nirvana' }],
        album: {
          name: 'Nevermind',
          release_date: '1991-09-24',
          images: [{ url: 'https://via.placeholder.com/640x640/059669/ffffff?text=Nirvana', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 88
      },
      {
        id: 'mock-track-4',
        name: 'Hey Jude',
        artists: [{ name: 'The Beatles' }],
        album: {
          name: 'The Beatles 1967-1970',
          release_date: '1968-08-26',
          images: [{ url: 'https://via.placeholder.com/640x640/7c3aed/ffffff?text=Beatles', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 92
      },
      {
        id: 'mock-track-5',
        name: 'Sweet Child O\' Mine',
        artists: [{ name: 'Guns N\' Roses' }],
        album: {
          name: 'Appetite for Destruction',
          release_date: '1987-07-21',
          images: [{ url: 'https://via.placeholder.com/640x640/ea580c/ffffff?text=GNR', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 86
      },
      {
        id: 'mock-track-6',
        name: 'Hotel California',
        artists: [{ name: 'Eagles' }],
        album: {
          name: 'Hotel California',
          release_date: '1976-12-08',
          images: [{ url: 'https://via.placeholder.com/640x640/0891b2/ffffff?text=Eagles', height: 640, width: 640 }]
        },
        preview_url: null,
        popularity: 89
      }
    ];

    // Shuffle and return requested number
    const shuffled = mockTracks.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(limit, mockTracks.length));
  }

  async getTrackById(trackId: string): Promise<SpotifyTrack> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get<SpotifyTrack>(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: {
            market: 'US',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get Spotify track:', error);
      throw new Error('Failed to get track details');
    }
  }

  extractReleaseYear(releaseDate: string): number {
    return parseInt(releaseDate.split('-')[0]);
  }

  getMainArtistName(artists: Array<{ name: string }>): string {
    return artists[0]?.name || 'Unknown Artist';
  }

  getLargestAlbumImage(images: Array<{ url: string; height: number; width: number }>): string | null {
    if (!images.length) return null;
    return images.sort((a, b) => b.height - a.height)[0].url;
  }
}

export const spotifyService = new SpotifyService();
