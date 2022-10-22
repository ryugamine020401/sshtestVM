/* ###################################################################### */
const PEER_PORT = '3000';

let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: PEER_PORT
});

let myname;
let myid;
let userid_arr = [];

let cameraStatus = false;
// let micStatus = false;

let localStream;
let videoBox = document.getElementById("videoBox");
let myVideo = document.createElement('video');

/* ###################################################################### */
/* creat <video> tag in DOM */
function add_newVideo(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoBox.append(video);
}

/* close local media device and remove <video> tag in DOM */
function stopCapture() {
    if (localStream) {
        /* stop fetch media */
        localStream.getTracks().forEach((track) => {track.stop();});
        /* release source */
        myVideo.srcObject = null;
        myVideo.remove();
    }
}

/* open local media device and do streaming to other client */
function capture_and_brocast() {
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {width: 200, height: 200}
    })
    .then( (stream) => {
        localStream = stream;
        add_newVideo(myVideo, stream);
        brocastStreaming(stream);
    })
    .catch( (error) => {
        console.error(error.message);
    });
}

/* ###################################################################### */
/* p2p send video to all client */
function brocastStreaming(stream) {
    userid_arr.map( (userid) => {
        if (userid != myid) {
            let call = myPeer.call(userid, stream);
        }
    });
    socket.on('new-user-id', (userid) => {
        let call = myPeer.call(userid, stream);
    });
}

/* p2p receive video, as well as remove <video> obj in DOM if somebody stop streaming */
function listenStreaming() {
    myPeer.on('call', (call) => {
        call.answer(null);
        let video = document.createElement('video');
        video.muted = true;
        call.on('stream', (remoteStream) => {
            add_newVideo(video, remoteStream);
        });
        socket.on('close-video', (userid) => {
            if (call.peer == userid){
                video.srcObject = null;
                video.remove();
            }
        });
        /*call.on('close', () => {
            console.log('remove video');
            video.remove();
        });*/
    });
}

/* ###################################################################### */
/* button onclick event: open or close camera and control streaming... */
function toggleCamera() {
    cameraStatus = (cameraStatus == true)? false: true;
    document.getElementById("camera-toggle").innerText = (cameraStatus == true)? "關閉相機": "開啟相機";
    if (cameraStatus == true) {
        capture_and_brocast();
    } else {
        stopCapture();
        socket.emit('stop-stream', myid);
    }
}

/* button onclick event: send message to chatroom */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': myname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    // ----------------------------------------
    /* connect to server */
    socket = io.connect();
    /* input name and show */
    myname = window.prompt('輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = myname;
    /* add event in DOM */
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    /* we dont want to listen voice from ourself */
    myVideo.muted = true;

    // ----------------------------------------
    /* somebody sent a message, receive it and show on the chatroom */
    socket.on('chatroom-refresh', (message) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>${message.username}</span>
            <span> : </span>
            <span>${message.content}</span>
        </div>`;
    });

    /* somebody join or leave */
    socket.on('member-refresh', (member) => {
        document.getElementById("number-of-people").innerText = `線上人數 : ${member}`;
    });

    /* just do it */
    socket.on('send-your-id', () => {
        socket.emit('send-id', myid);
    });

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid);
    });

    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr) => {
        userid_arr = id_arr;
    });

    // ----------------------------------------
}

/* ###################################################################### */
Init();
listenStreaming();