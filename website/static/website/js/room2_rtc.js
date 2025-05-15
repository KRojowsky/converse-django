const APP_ID = 'f3d9aeee514b4958bae2a751a01a49e9'

const logError = (message, error) => {
    console.error(`[WebRTC ERROR] ${message}`, error);
    addBotMessageToDom(`Błąd: ${message}. Sprawdź konsolę dla szczegółów.`);
}

let uid = sessionStorage.getItem('uid')
if (!uid) {
    uid = String(Math.floor(Math.random() * 10000))
    sessionStorage.setItem('uid', uid)
}

let token = null;
let client;

let rtmClient;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')
console.log('Room ID:', roomId);

if (!roomId) {
    roomId = 'main'
}

let displayName = sessionStorage.getItem('display_name')
if (!displayName) {
    displayName = "Użytkownik_" + uid;
    console.warn("Nie znaleziono display_name, używam domyślnej wartości:", displayName);
}

let localTracks = []
let remoteUsers = {}

let localScreenTracks;
let sharingScreen = false;
let userIdInDisplayFrame = null;
let displayFrame = document.getElementById('stream__box') || document.createElement('div');


if (!APP_ID) {
    logError("Brak APP_ID. Należy ustawić prawidłowy APP_ID z panelu Agora");
}

let joinRoomInit = async () => {
    try {
        console.log("Inicjalizacja połączenia RTM...");
        rtmClient = await AgoraRTM.createInstance(APP_ID)
        await rtmClient.login({ uid, token })
            .catch(error => {
                logError("Nie udało się zalogować do Agora RTM", error);
                throw error;
            });

        await rtmClient.addOrUpdateLocalUserAttributes({ 'name': displayName })
            .catch(error => {
                logError("Nie udało się ustawić nazwy użytkownika", error);
            });

        channel = await rtmClient.createChannel(roomId);
        await channel.join()
            .catch(error => {
                logError(`Nie udało się dołączyć do kanału ${roomId}`, error);
                throw error;
            });

        console.log("Dołączono do kanału RTM:", roomId);
        
        channel.on('MemberJoined', handleMemberJoined)
        channel.on('MemberLeft', handleMemberLeft)
        channel.on('ChannelMessage', handleChannelMessage)

        getMembers()
        addBotMessageToDom(`Witaj na zajęciach ${displayName}! 👋`)

        console.log("Inicjalizacja połączenia RTC...");
        client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        
        
        client.on("connection-state-change", (curState, prevState) => {
            console.log("Zmiana stanu połączenia:", prevState, "->", curState);
            if (curState === "DISCONNECTED") {
                logError("Połączenie z serwerem zostało przerwane", null);
            }
        });

        await client.join(APP_ID, roomId, token, uid)
            .catch(error => {
                logError("Nie udało się dołączyć do RTC", error);
                throw error;
            });

        console.log("Dołączono do RTC:", roomId);

        client.on('user-published', handleUserPublished)
        client.on('user-left', handleUserLeft)
        client.on('user-info-updated', (uid, msg) => {
            console.log('Info użytkownika zaktualizowane:', uid, msg);
        });
        client.on('network-quality', (stats) => {
            console.log('Jakość sieci:', stats);
        });

        await joinStream();
    } catch (error) {
        logError("Wystąpił błąd podczas inicjalizacji pokoju", error);
    }
}

let joinStream = async () => {
    try {
        console.log("Próba uzyskania dostępu do kamery i mikrofonu...");
        
        
        const devices = await AgoraRTC.getDevices();
        const hasAudio = devices.some(device => device.kind === 'audioinput');
        const hasVideo = devices.some(device => device.kind === 'videoinput');
        
        if (!hasAudio) {
            logError("Nie wykryto mikrofonu w systemie", null);
        }
        
        if (!hasVideo) {
            logError("Nie wykryto kamery w systemie", null);
        }
        
        
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks(
            { 
                AEC: true, 
                ANS: true 
            }, 
            { 
                encoderConfig: {
                    width: { min: 640, ideal: 1920, max: 1920 },
                    height: { min: 480, ideal: 1080, max: 1080 }
                },
                facingMode: 'user'
            }
        ).catch(error => {
            if (error.code === "PERMISSION_DENIED") {
                logError("Odmówiono dostępu do kamery lub mikrofonu. Sprawdź uprawnienia przeglądarki", error);
            } else {
                logError("Błąd podczas tworzenia strumieni audio/wideo", error);
            }
            throw error;
        });

        
        if (!localTracks[0] || !localTracks[1]) {
            logError("Nie udało się uzyskać dostępu do mikrofonu lub kamery", null);
            return;
        }

        console.log("Dostęp do kamery i mikrofonu uzyskany pomyślnie");

        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                     </div>`;

        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

        
        const userVideoElement = document.getElementById(`user-${uid}`);
        if (!userVideoElement) {
            logError(`Nie znaleziono elementu HTML o ID user-${uid}`, null);
            return;
        }

        
        try {
            localTracks[1].play(`user-${uid}`);
            console.log("Lokalne wideo uruchomione");
        } catch (error) {
            logError("Nie udało się odtworzyć lokalnego strumienia wideo", error);
        }

        
        try {
            await client.publish([localTracks[0], localTracks[1]]);
            console.log("Lokalne strumienie opublikowane pomyślnie");
        } catch (error) {
            logError("Nie udało się opublikować strumieni lokalnych", error);
        }

        
        let cameraBtn = document.getElementById('camera-btn');
        if (cameraBtn) {
            cameraBtn.classList.remove('active');
        }
    } catch (error) {
        logError("Wystąpił błąd podczas dołączania do strumienia", error);
    }
}

let switchToCamera = async () => {
    try {
        let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                     </div>`;
        displayFrame.insertAdjacentHTML('beforeend', player);

        await localTracks[0].setMuted(true);
        await localTracks[1].setMuted(true);

        const micBtn = document.getElementById('mic-btn');
        const screenBtn = document.getElementById('screen-btn');
        
        if (micBtn) micBtn.classList.remove('active');
        if (screenBtn) screenBtn.classList.remove('active');

        try {
            localTracks[1].play(`user-${uid}`);
            console.log("Przełączono na kamerę");
        } catch (error) {
            logError("Nie udało się odtworzyć lokalnego strumienia wideo po przełączeniu", error);
        }

        try {
            await client.publish([localTracks[1]]);
            console.log("Opublikowano strumień kamery");
        } catch (error) {
            logError("Nie udało się opublikować strumienia kamery", error);
        }
    } catch (error) {
        logError("Wystąpił błąd podczas przełączania na kamerę", error);
    }
}

let handleUserPublished = async (user, mediaType) => {
    try {
        console.log(`Użytkownik ${user.uid} opublikował strumień typu: ${mediaType}`);
        remoteUsers[user.uid] = user;

        try {
            await client.subscribe(user, mediaType);
            console.log(`Zasubskrybowano do użytkownika ${user.uid}, typ mediów: ${mediaType}`);
        } catch (error) {
            logError(`Nie udało się zasubskrybować do użytkownika ${user.uid} (${mediaType})`, error);
            return;
        }

        let player = document.getElementById(`user-container-${user.uid}`);
        if (player === null) {
            player = `<div class="video__container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                </div>`;

            document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
        }

        if (mediaType === 'video') {
            try {
                user.videoTrack.play(`user-${user.uid}`);
                console.log(`Odtwarzanie wideo użytkownika ${user.uid}`);
            } catch (error) {
                logError(`Nie udało się odtworzyć wideo użytkownika ${user.uid}`, error);
            }
        }

        if (mediaType === 'audio') {
            try {
                user.audioTrack.play();
                console.log(`Odtwarzanie audio użytkownika ${user.uid}`);
            } catch (error) {
                logError(`Nie udało się odtworzyć audio użytkownika ${user.uid}`, error);
            }
        }
    } catch (error) {
        logError(`Wystąpił błąd podczas obsługi publikacji użytkownika ${user.uid}`, error);
    }
}

let handleUserLeft = async (user) => {
    try {
        console.log(`Użytkownik ${user.uid} opuścił pokój`);
        delete remoteUsers[user.uid];
        
        const userContainer = document.getElementById(`user-container-${user.uid}`);
        if (userContainer) {
            userContainer.remove();
        } else {
            console.warn(`Nie znaleziono kontenera dla użytkownika ${user.uid}`);
        }

        if (userIdInDisplayFrame === `user-container-${user.uid}`) {
            displayFrame.style.display = null;

            let videoFrames = document.getElementsByClassName('video__container');
            for (let i = 0; i < videoFrames.length; i++) {
                videoFrames[i].style.height = '300px';
                videoFrames[i].style.width = '300px';
            }
        }

        try {
            await client.publish([localTracks[0], localTracks[1]]);
        } catch (error) {
            logError("Nie udało się opublikować lokalnych strumieni po wyjściu użytkownika", error);
        }
    } catch (error) {
        logError(`Wystąpił błąd podczas obsługi wyjścia użytkownika ${user.uid}`, error);
    }
}

let toggleMic = async (e) => {
    try {
        let button = e.currentTarget;

        if (!localTracks[0]) {
            logError("Mikrofon nie jest dostępny", null);
            return;
        }

        if (localTracks[0].muted) {
            await localTracks[0].setMuted(false);
            button.classList.add('active');
            console.log("Mikrofon włączony");
        } else {
            await localTracks[0].setMuted(true);
            button.classList.remove('active');
            console.log("Mikrofon wyciszony");
        }
    } catch (error) {
        logError("Wystąpił błąd podczas przełączania mikrofonu", error);
    }
}

let toggleCamera = async (e) => {
    try {
        let button = e.currentTarget;

        if (!localTracks[1]) {
            logError("Kamera nie jest dostępna", null);
            return;
        }

        if (localTracks[1].muted) {
            await localTracks[1].setMuted(false);
            button.classList.add('active');
            console.log("Kamera włączona");
        } else {
            await localTracks[1].setMuted(true);
            button.classList.remove('active');
            console.log("Kamera wyłączona");
        }
    } catch (error) {
        logError("Wystąpił błąd podczas przełączania kamery", error);
    }
}

let toggleScreen = async (e) => {
    try {
        let screenButton = e.currentTarget;
        let cameraButton = document.getElementById('camera-btn');

        if (!sharingScreen) {
            sharingScreen = true;

            screenButton.classList.add('active');
            cameraButton.classList.remove('active');
            cameraButton.style.display = 'none';

            try {
                localScreenTracks = await AgoraRTC.createScreenVideoTrack();
                console.log("Utworzono strumień udostępniania ekranu");
            } catch (error) {
                if (error.code === "PERMISSION_DENIED") {
                    logError("Odmówiono dostępu do udostępniania ekranu", error);
                } else {
                    logError("Nie udało się utworzyć strumienia udostępniania ekranu", error);
                }
                sharingScreen = false;
                screenButton.classList.remove('active');
                cameraButton.style.display = 'block';
                return;
            }

            const userContainer = document.getElementById(`user-container-${uid}`);
            if (userContainer) {
                userContainer.remove();
            }
            
            displayFrame.style.display = 'block';

            let player = `<div class="video__container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;

            displayFrame.insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

            userIdInDisplayFrame = `user-container-${uid}`;
            
            try {
                localScreenTracks.play(`user-${uid}`);
                console.log("Odtwarzanie udostępniania ekranu");
            } catch (error) {
                logError("Nie udało się odtworzyć strumienia udostępniania ekranu", error);
            }

            try {
                await client.unpublish([localTracks[1]]);
                await client.publish([localScreenTracks]);
                console.log("Opublikowano strumień udostępniania ekranu");
            } catch (error) {
                logError("Nie udało się opublikować strumienia udostępniania ekranu", error);
            }

            let videoFrames = document.getElementsByClassName('video__container');
            for (let i = 0; i < videoFrames.length; i++) {
                if (videoFrames[i].id != userIdInDisplayFrame) {
                    videoFrames[i].style.height = '100px';
                    videoFrames[i].style.width = '100px';
                }
            }
        } else {
            sharingScreen = false;
            cameraButton.style.display = 'block';
            
            const userContainer = document.getElementById(`user-container-${uid}`);
            if (userContainer) {
                userContainer.remove();
            }

            try {
                await client.unpublish([localScreenTracks]);
                console.log("Zakończono publikację udostępniania ekranu");
            } catch (error) {
                logError("Nie udało się zakończyć publikacji udostępniania ekranu", error);
            }

            await switchToCamera();
        }
    } catch (error) {
        logError("Wystąpił błąd podczas przełączania udostępniania ekranu", error);
    }
}

let leaveChannel = async () => {
    try {
        for (let i = 0; localTracks.length > i; i++) {
            if (localTracks[i]) {
                localTracks[i].stop();
                localTracks[i].close();
            }
        }

        if (localScreenTracks) {
            localScreenTracks.stop();
            localScreenTracks.close();
        }

        await client.leave();
        await channel.leave();
        await rtmClient.logout();
        
        console.log("Opuszczono pokój");
        return true;
    } catch (error) {
        logError("Wystąpił błąd podczas opuszczania pokoju", error);
        return false;
    }
}

let leaveChannelAndGoToLobby = async () => {
    const success = await leaveChannel();
    if (success) {
        window.location = '/strefa-wiedzy/';
    }
}

let expandVideoFrame = (e) => {
    
    try {
        let child = e.currentTarget;
        if (!displayFrame) {
            console.warn("Element displayFrame nie istnieje");
            return;
        }

        if (child.id === userIdInDisplayFrame) {
            document.getElementById(child.id).style.height = '300px';
            document.getElementById(child.id).style.width = '300px';
            
            userIdInDisplayFrame = null;
            displayFrame.style.display = 'none';

            let videoFrames = document.getElementsByClassName('video__container');
            for (let i = 0; i < videoFrames.length; i++) {
                videoFrames[i].style.height = '300px';
                videoFrames[i].style.width = '300px';
            }
            return;
        }

        userIdInDisplayFrame = child.id;
        displayFrame.style.display = 'block';
        displayFrame.innerHTML = '';
        
        document.getElementById(child.id).style.height = '100%';
        document.getElementById(child.id).style.width = '100%';
        
        child.appendChild(document.getElementById('stream__box'));
        
        let videoFrames = document.getElementsByClassName('video__container');
        for (let i = 0; i < videoFrames.length; i++) {
            if (videoFrames[i].id !== userIdInDisplayFrame) {
                videoFrames[i].style.height = '100px';
                videoFrames[i].style.width = '100px';
            }
        }
    } catch (error) {
        logError("Wystąpił błąd podczas rozszerzania ramki wideo", error);
    }
}


let getMembers = async () => {
    try {
        let members = await channel.getMembers();
        console.log('Członkowie kanału:', members);
        return members;
    } catch (error) {
        logError("Nie udało się pobrać listy członków kanału", error);
        return [];
    }
}


let handleMemberJoined = async (memberId) => {
    console.log("Nowy użytkownik dołączył:", memberId);
    
}

let handleMemberLeft = async (memberId) => {
    console.log("Użytkownik opuścił pokój:", memberId);
    
}

let handleChannelMessage = async (messageData, memberId) => {
    console.log("Otrzymano wiadomość:", messageData, "od:", memberId);
    
}


let addBotMessageToDom = (message) => {
    const messageContainer = document.getElementById('messages__container') || document.createElement('div');
    
    let newMessage = `<div class="message__wrapper">
                        <div class="message__body__bot">
                            <strong class="message__author">🤖 Bot</strong>
                            <p class="message__text">${message}</p>
                        </div>
                    </div>`;
                    
    messageContainer.insertAdjacentHTML('beforeend', newMessage);
    
    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("Strona załadowana, sprawdzanie dostępności elementów UI...");
    
    const elementsToCheck = [
        'camera-btn', 
        'mic-btn', 
        'screen-btn', 
        'leave-btn', 
        'streams__container',
        'stream__box',
        'messages__container'
    ];
    
    elementsToCheck.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Nie znaleziono elementu HTML o ID ${id}`);
        }
    });
    
    
    const cameraBtn = document.getElementById('camera-btn');
    const micBtn = document.getElementById('mic-btn');
    const screenBtn = document.getElementById('screen-btn');
    const leaveBtn = document.getElementById('leave-btn');
    
    if (cameraBtn) cameraBtn.addEventListener('click', toggleCamera);
    if (micBtn) micBtn.addEventListener('click', toggleMic);
    if (screenBtn) screenBtn.addEventListener('click', toggleScreen);
    if (leaveBtn) leaveBtn.addEventListener('click', leaveChannelAndGoToLobby);
    
    displayFrame = document.getElementById('stream__box') || document.createElement('div');
});


if (document.readyState === 'complete') {
    joinRoomInit();
} else {
    window.addEventListener('load', joinRoomInit);
}