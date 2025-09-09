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
