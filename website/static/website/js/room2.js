let messagesContainer = document.getElementById('messages');
messagesContainer.scrollTop = messagesContainer.scrollHeight;

const memberContainer = document.getElementById('members__container');
const memberButton = document.getElementById('members__button');

const chatContainer = document.getElementById('messages__container');
const chatButton = document.getElementById('chat__button');

let activeMemberContainer = false;

memberButton.addEventListener('click', () => {
  memberContainer.style.display = activeMemberContainer ? 'none' : 'block';
  activeMemberContainer = !activeMemberContainer;
});

let activeChatContainer = false;

chatButton.addEventListener('click', () => {
  chatContainer.style.display = activeChatContainer ? 'none' : 'block';
  activeChatContainer = !activeChatContainer;
});

let displayFrame = document.getElementById('stream__box')
let videoFrames = document.getElementsByClassName('video__container')
let userIdInDisplayFrame = null;

let expandVideoFrame = (e) => {
  let child = displayFrame.children[0]
  if(child){
      document.getElementById('streams__container').appendChild(child)
  }

  displayFrame.style.display = 'block'
  displayFrame.appendChild(e.currentTarget)
  userIdInDisplayFrame = e.currentTarget.id

  for(let i = 0; i < videoFrames.length; i++){
    if(videoFrames[i].id !== userIdInDisplayFrame){
      videoFrames[i].style.height = '100px'
      videoFrames[i].style.width = '100px'
    }
  }
}

for(let i = 0; i < videoFrames.length; i++){
    videoFrames[i].addEventListener('click', expandVideoFrame)
}

let hideDisplayFrame = () => {
    userIdInDisplayFrame = null
    displayFrame.style.display = null

    let child = displayFrame.children[0]
    document.getElementById('streams__container').appendChild(child)

    for(let i = 0; i < videoFrames.length; i++){
      videoFrames[i].style.height = '300px'
      videoFrames[i].style.width = '300px'
    }
}

displayFrame.addEventListener('click', hideDisplayFrame)

const cameraBtn = document.getElementById("camera-btn");
const micBtn = document.getElementById("mic-btn");
const screenBtn = document.getElementById("screen-btn");

// Funkcja przełączania aktywności przycisku
const toggleButton = (button) => {
    // Jeśli przycisk to mikrofon
    if (button.id === "mic-btn") {
        if (button.classList.contains("active")) {
            // Mikrofon jest aktywny, przełącz na nieaktywny
            button.classList.remove("active");
            button.classList.add("disabled");
        } else {
            // Mikrofon jest nieaktywny, przełącz na aktywny
            button.classList.remove("disabled");
            button.classList.add("active");
        }
    } else {
        // Logika dla kamery i ekranu
        if (button.classList.contains("active")) {
            // Kamera/Ekran aktywne, przełącz na nieaktywne
            button.classList.remove("active");
            button.classList.add("disabled");
        } else {
            // Kamera/Ekran nieaktywne, przełącz na aktywne
            button.classList.remove("disabled");
            button.classList.add("active");
        }
    }
};

// Inicjalizacja: Mikrofon ma domyślnie klasę "active", kamera i ekran mają "disabled"
micBtn.classList.add('active');  // Mikrofon domyślnie włączony
cameraBtn.classList.add('disabled'); // Kamera początkowo wyłączona (przekreślona)
screenBtn.classList.add('disabled'); // Ekran początkowo wyłączony (przekreślony)

// Dodanie event listenerów do przycisków
cameraBtn.addEventListener("click", function () {
    toggleButton(this); // Przełącz stan kamery
});

micBtn.addEventListener("click", function () {
    toggleButton(this); // Przełącz stan mikrofonu
});

screenBtn.addEventListener("click", function () {
    toggleButton(this); // Przełącz stan ekranu
});

