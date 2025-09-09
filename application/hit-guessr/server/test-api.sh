#!/bin/bash

# Hit-Guessr API Test Script
BASE_URL="http://localhost:3000"

echo "🎵 Testing Hit-Guessr API..."

# Function to make API calls with pretty output
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    echo "📡 $method $endpoint"
    
    if [ -z "$token" ]; then
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             ${data:+-d "$data"} \
             "$BASE_URL$endpoint" | jq '.' || echo "❌ Request failed"
    else
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -H "Authorization: Bearer $token" \
             ${data:+-d "$data"} \
             "$BASE_URL$endpoint" | jq '.' || echo "❌ Request failed"
    fi
    echo ""
}

# Test 1: Health check
echo "🏥 Testing health endpoint..."
api_call "GET" "/health"

# Test 2: Register a test user
echo "👤 Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","username":"testuser","password":"password123"}' \
    "$BASE_URL/api/auth/register")

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token from register response
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Registration failed, trying to login..."
    
    # Try to login instead
    LOGIN_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"password123"}' \
        "$BASE_URL/api/auth/login")
    
    echo "$LOGIN_RESPONSE" | jq '.'
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
fi

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Authentication successful"
    echo "🔑 Token: ${TOKEN:0:20}..."
    
    # Test 3: Get user profile
    echo "👤 Getting user profile..."
    api_call "GET" "/api/users/profile" "" "$TOKEN"
    
    # Test 4: Create a solo game
    echo "🎮 Creating solo game..."
    GAME_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"type":"SOLO","maxRounds":3}' \
        "$BASE_URL/api/games")
    
    echo "$GAME_RESPONSE" | jq '.'
    
    GAME_ID=$(echo "$GAME_RESPONSE" | jq -r '.id // empty')
    
    if [ -n "$GAME_ID" ] && [ "$GAME_ID" != "null" ]; then
        echo "✅ Game created with ID: $GAME_ID"
        
        # Test 5: Get game details
        echo "📝 Getting game details..."
        api_call "GET" "/api/games/$GAME_ID" "" "$TOKEN"
        
        # Test 6: Submit a round answer (this might fail if rounds aren't generated yet)
        echo "📝 Submitting test answer..."
        api_call "POST" "/api/games/$GAME_ID/submit" '{"roundNumber":1,"guessedArtist":"Test Artist","guessedTrack":"Test Song","guessedYear":2020,"timeToAnswer":15}' "$TOKEN"
    else
        echo "❌ Failed to create game"
    fi
    
    # Test 7: Get leaderboard
    echo "🏆 Getting leaderboard..."
    api_call "GET" "/api/users/leaderboard"
    
else
    echo "❌ Authentication failed"
fi

echo ""
echo "🔄 Test completed!"
echo ""
echo "💡 Tips:"
echo "- Make sure the server is running with: npm run dev"
echo "- Check the database connection"
echo "- Verify Spotify credentials in .env file"
