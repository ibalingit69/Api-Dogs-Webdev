const express = require('express');
const axios = require('axios');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// API keys for accessing external services
const DOG_API_KEY = 'live_Ef2OFXguvOguj9Iy1doHcSzubUBKOh0xCnsoUmwRSKirQGdFLmzRlsCgiR1Xt1Pi'; 
const YOUTUBE_API_KEY = 'AIzaSyAoR-pzGBTP8IkQiuLY4cjZY_KIoGp4Rso'; 

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route to fetch a random dog image
app.get('/dog', async (req, res) => {
  try {
    const response = await axios.get('https://api.thedogapi.com/v1/images/search', {
      headers: { 'x-api-key': DOG_API_KEY }
    });
    res.json(response.data[0]); // Send the first dog image from the response
  } catch (error) {
    console.error('Error fetching dog data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal server error' }); // Send error response if fetching fails
  }
});

// Route to fetch YouTube videos related to dogs
app.get('/videos', async (req, res) => {
  try {
    const query = req.query.q || 'dogs'; // Default query is 'dogs' if no query is provided
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        key: YOUTUBE_API_KEY,
        type: 'video',
        maxResults: 5 // Limit the number of videos to 5
      }
    });
    res.json(response.data.items); // Send the fetched videos as response
  } catch (error) {
    console.error('Error fetching YouTube videos:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal server error' }); // Send error response if fetching fails
  }
});

// Create an HTTP server
const server = http.createServer(app);

// Set up WebSocket server on the same port as the HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  // Handle incoming messages from the client
  ws.on('message', async message => {
    console.log(`Received message => ${message}`);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message); // Try to parse the message as JSON
    } catch (e) {
      parsedMessage = message; // If parsing fails, use the message as is
    }

    // Fetch dog breed details by name
    if (parsedMessage.action === 'fetchBreedByName') {
      try {
        const breedsResponse = await axios.get('https://api.thedogapi.com/v1/breeds', {
          headers: { 'x-api-key': DOG_API_KEY }
        });
        const breed = breedsResponse.data.find(b => b.name.toLowerCase().includes(parsedMessage.breedName));
        if (breed) {
          const breedResponse = await axios.get(`https://api.thedogapi.com/v1/images/search?breed_ids=${breed.id}`, {
            headers: { 'x-api-key': DOG_API_KEY }
          });
          ws.send(JSON.stringify({ breedDog: breedResponse.data[0], breedDetails: breed })); // Send breed details and image

          // Fetch YouTube videos related to the breed
          const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              q: parsedMessage.breedName,
              key: YOUTUBE_API_KEY,
              type: 'video',
              maxResults: 5
            }
          });
          ws.send(JSON.stringify({ videos: videoResponse.data.items })); // Send the fetched videos
        } else {
          ws.send(JSON.stringify({ error: 'Breed not found' })); // Send error if breed is not found
        }
      } catch (error) {
        console.error('Error fetching breed by name:', error.response ? error.response.data : error.message);
        ws.send(JSON.stringify({ error: 'Error fetching breed by name' })); // Send error response if fetching fails
      }
    }
    // Fetch all dog breeds
    else if (parsedMessage.action === 'fetchBreeds') {
      try {
        const breedsResponse = await axios.get('https://api.thedogapi.com/v1/breeds', {
          headers: { 'x-api-key': DOG_API_KEY }
        });
        ws.send(JSON.stringify({ breeds: breedsResponse.data })); // Send all breeds as response
      } catch (error) {
        console.error('Error fetching breeds:', error.response ? error.response.data : error.message);
        ws.send(JSON.stringify({ error: 'Error fetching breeds' })); // Send error response if fetching fails
      }
    }
  });

  // Send a welcome message to the client upon connection
  ws.send(JSON.stringify({ message: 'Welcome! Send "fetchData" to get dog data.' }));
});

// Start the server on the specified port
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
