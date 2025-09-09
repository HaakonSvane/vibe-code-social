#!/usr/bin/env node

// Simple script to test Spotify API credentials
const axios = require('axios');
require('dotenv').config();

async function testSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  console.log('🔑 Testing Spotify Credentials...');
  console.log(`Client ID: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`Client Secret: ${clientSecret ? clientSecret.substring(0, 8) + '...' : 'NOT SET'}`);
  
  if (!clientId || !clientSecret) {
    console.log('❌ Spotify credentials not configured');
    return false;
  }
  
  if (clientId === 'your_spotify_client_id' || clientSecret === 'your_spotify_client_secret') {
    console.log('❌ Spotify credentials are placeholder values');
    return false;
  }
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    console.log('🔄 Testing authentication...');
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('✅ Authentication successful!');
    console.log(`Token type: ${response.data.token_type}`);
    console.log(`Expires in: ${response.data.expires_in} seconds`);
    
    // Test a more specific search that's likely to have previews
    console.log('🔄 Testing search API with better query...');
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${response.data.access_token}`,
      },
      params: {
        q: 'artist:"taylor swift"',
        type: 'track',
        limit: 10,
        market: 'US',
      },
    });
    
    console.log(`✅ Search successful! Found ${searchResponse.data.tracks.items.length} tracks`);
    
    const tracksWithPreviews = searchResponse.data.tracks.items.filter(track => track.preview_url);
    console.log(`🎵 Tracks with preview URLs: ${tracksWithPreviews.length}`);
    
    if (searchResponse.data.tracks.items.length > 0) {
      console.log('📋 Sample tracks:');
      searchResponse.data.tracks.items.slice(0, 3).forEach((track, i) => {
        console.log(`   ${i + 1}. ${track.artists[0].name} - ${track.name}`);
        console.log(`      Preview: ${track.preview_url ? '✅ Available' : '❌ Not available'}`);
        console.log(`      Popularity: ${track.popularity}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ API call failed:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data.error_description || error.response.data.error || 'Unknown error'}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return false;
  }
}

testSpotifyCredentials().then(success => {
  if (success) {
    console.log('🎉 Spotify integration is working correctly!');
  } else {
    console.log('⚠️  Spotify integration will fall back to mock data');
  }
  process.exit(success ? 0 : 1);
});
