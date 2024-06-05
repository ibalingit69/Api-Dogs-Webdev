document.addEventListener('DOMContentLoaded', () => {
    const dogInfo = document.getElementById('dog-info');
    const fetchBreedByNameButton = document.getElementById('fetch-breed-by-name');
    const breedNameInput = document.getElementById('breed-name');
    const breedsList = document.getElementById('breeds');
    const videoContainer = document.getElementById('video-container');

   
    const ws = new WebSocket('ws://localhost:3000');

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data); 
            if (data.message) {
                console.log(data.message); 
            } else if (data.breedDog) {
                displayDog(data.breedDog, data.breedDetails); 
            } else if (data.breeds) {
                populateBreedsList(data.breeds); 
            } else if (data.videos) {
                displayVideos(data.videos); 
            } else if (data.error) {
                displayError(data.error); 
            }
        } catch (e) {
            console.error('Error parsing message:', e); 
        }
    };

    
    ws.onopen = () => {
        console.log('WebSocket connection opened');
        ws.send(JSON.stringify({ action: 'fetchBreeds' }));
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };

    fetchBreedByNameButton.addEventListener('click', () => {
        const breedName = breedNameInput.value.trim().toLowerCase();
        if (!breedName) {
            alert('Please type a dog breed or select from the list.');
            return;
        }
        ws.send(JSON.stringify({ action: 'fetchBreedByName', breedName })); 
    });

    
    function populateBreedsList(breeds) {
        breedsList.innerHTML = '';
        breeds.forEach(breed => {
            const option = document.createElement('option');
            option.value = breed.name;
            breedsList.appendChild(option); 
        });
    }

    
    function displayDog(dog, breedDetails = null) {
        let breedInfo = '';
        if (breedDetails) {
            breedInfo = `
                <h3>${breedDetails.name}</h3>
                <p>Bred for: ${breedDetails.bred_for || 'Unknown'}</p>
                <p>Breed group: ${breedDetails.breed_group || 'Unknown'}</p>
                <p>Life span: ${breedDetails.life_span || 'Unknown'}</p>
                <p>Temperament: ${breedDetails.temperament || 'Unknown'}</p>
                <p>Height: ${breedDetails.height.metric || 'Unknown'} cm</p>
                <p>Weight: ${breedDetails.weight.metric || 'Unknown'} kg</p>
            `;
        }
        dogInfo.innerHTML = `
            <h2>Dog Info</h2>
            <img src="${dog.url}" alt="Dog" width="300">
            ${breedInfo}
        `; 
    }

  
    function displayVideos(videos) {
        videoContainer.innerHTML = '<h2>Related Videos</h2>';
        videos.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.classList.add('video');
            videoElement.innerHTML = `
                <h3>${video.snippet.title}</h3>
                <iframe width="100%" height="315" src="https://www.youtube.com/embed/${video.id.videoId}" frameborder="0" allowfullscreen></iframe>
            `;
            videoContainer.appendChild(videoElement); 
        });
    }
    
    function displayError(error) {
        console.error('Error:', error); 
        alert(error); 
    }
});
