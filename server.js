const express = require('express');
const axios = require('axios');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;


const DOG_API_KEY = 'live_Ef2OFXguvOguj9Iy1doHcSzubUBKOh0xCnsoUmwRSKirQGdFLmzRlsCgiR1Xt1Pi'; 
const YOUTUBE_API_KEY = 'AIzaSyAoR-pzGBTP8IkQiuLY4cjZY_KIoGp4Rso'; 


app.use(express.static('public'));

app.get('/dog', async (req, res) => {
  try {
    const response = await axios.get('https://api.thedogapi.com/v1/images/search', {
      headers: { 'x-api-key': DOG_API_KEY }
    });
    res.json(response.data[0]);
  } catch (error) {
    console.error('Error fetching dog data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});


app.get('/videos', async (req, res) => {
  try {
    const query = req.query.q || 'dogs'; 
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        key: YOUTUBE_API_KEY,
        type: 'video',
        maxResults: 5 
      }
    });
    res.json(response.data.items); 
  } catch (error) {
    console.error('Error fetching YouTube videos:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});


const server = http.createServer(app);


const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.on('message', async message => {
    console.log(`Received message => ${message}`);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      parsedMessage = message; 
    }

 
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
          ws.send(JSON.stringify({ breedDog: breedResponse.data[0], breedDetails: breed }));

          const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              q: parsedMessage.breedName,
              key: YOUTUBE_API_KEY,
              type: 'video',
              maxResults: 5
            }
          });
          ws.send(JSON.stringify({ videos: videoResponse.data.items })); 
        } else {
          ws.send(JSON.stringify({ error: 'Breed not found' })); 
        }
      } catch (error) {
        console.error('Error fetching breed by name:', error.response ? error.response.data : error.message);
        ws.send(JSON.stringify({ error: 'Error fetching breed by name' })); 
      }
    }

    else if (parsedMessage.action === 'fetchBreeds') {
      try {
        const breedsResponse = await axios.get('https://api.thedogapi.com/v1/breeds', {
          headers: { 'x-api-key': DOG_API_KEY }
        });
        ws.send(JSON.stringify({ breeds: breedsResponse.data })); 
      } catch (error) {
        console.error('Error fetching breeds:', error.response ? error.response.data : error.message);
        ws.send(JSON.stringify({ error: 'Error fetching breeds' })); 
      }
    }
  });
  
  ws.send(JSON.stringify({ message: 'Welcome! Send "fetchData" to get dog data.' }));
});


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
