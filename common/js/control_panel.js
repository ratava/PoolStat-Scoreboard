'use strict';
// PoolStat Scoreboard is a modified version of CueSport Scoreboard by Iain Macleod which was based on g4Scoreboard. The purpose of this modification is to provide an OBS interface for
// PoolStat. A Pool scoring system used in Australia. Data is provided by a live screaming portal.

// CueSport Scoreboard for OBS version 2.3.0 Copyright 2025 Iain Macleod
// G4ScoreBoard addon for OBS version 1.6.1 Copyright 2022-2023 Norman Gholson IV
// https://g4billiards.com http://www.g4creations.com
// this is a purely javascript/html/css driven scoreboard system for OBS Studio
// free to use and modify and use as long as this copyright statment remains intact. 



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// functions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			


// declare mqtt client variable
let client = null;
const extraDebug = true;
const matchClock = createTimer('matchClock', 45 * 60);
const shotClock = createTimer('shotClock', 45);

//main function to update scoreboard from PoolStat Live Stream
function poolstatUpdate(updateJSON) {
    if (Object.keys(updateJSON).length == 18) {
        console.log('Update Received');
        if (updateJSON["compId"] > 1) { setStorageItem("compId", updateJSON["compId"]); }
        if (updateJSON["matchId"] > 1) { setStorageItem("matchId", updateJSON["matchId"]); }
        if (updateJSON["obsProfileName"].length > 1) { setStorageItem("obsProfileName", updateJSON["obsProfileName"]); }


        if (updateJSON["streamKey"].length > 1) { setStorageItem("streamKey", updateJSON["streamKey"]); }
        if (updateJSON["streamStatus"] === true) {
            setStorageItem("streamStatus", updateJSON["streamStatus"]);
            changeOBSProfile(updateJSON["obsProfileName"]);
            updateStreamStatus();
        } else {
            setStorageItem("streamStatus", updateJSON["streamStatus"]);
            updateStreamStatus();
        }
        if (updateJSON["breakingPlayer"] != null) { setStorageItem("breakingPlayer", updateJSON["breakingPlayer"]); }
        if (updateJSON["homePlayerLogo"] != null) { setStorageItem("homePlayerLogo", updateJSON["homePlayerLogo"]); }
        if (updateJSON["awayPlayerLogo"] != null) { setStorageItem("awayPlayerLogo", updateJSON["awayPlayerLogo"]); }

        if (updateJSON["matchFormat"].length > 1) { document.getElementById("raceInfoTxt").textContent = updateJSON["matchFormat"]; }
        if (updateJSON["drawRound"].length > 1) { document.getElementById("drawRoundTxt").textContent = updateJSON["drawRound"]; }
        if (updateJSON["eventName"].length > 1) { document.getElementById("gameInfoTxt").textContent = updateJSON["eventName"]; }
        if (updateJSON["compId"] > 0) { document.getElementById("compIdTxt").textContent = updateJSON["compId"]; }
        if (updateJSON["matchId"] > 0) { document.getElementById("matchIdTxt").textContent = updateJSON["matchId"]; }
        postInfo(document.getElementById("raceInfoTxt").textContent, document.getElementById("gameInfoTxt").textContent, document.getElementById('drawRoundTxt').textContent);
        if (updateJSON["homePlayer"].length > 1) { document.getElementById("p1NameTxt").textContent = updateJSON["homePlayer"]; }
        if (updateJSON["awayPlayer"].length > 1) { document.getElementById("p2NameTxt").textContent = updateJSON["awayPlayer"]; }
        postNames(document.getElementById("p1NameTxt").textContent, document.getElementById("p2NameTxt").textContent);
        pushScores(updateJSON["homePlayerScore"], updateJSON["awayPlayerScore"]);
    }

    updatePlayerImage("homePlayerLogo", updateJSON['homePlayerLogo']);
    updatePlayerImage("awayPlayerLogo", updateJSON['awayPlayerLogo']);
    if (updateJSON['breakingPlayer'] != null) {
        bc.postMessage({ breakingPlayer: updateJSON['breakingPlayer'] });
    }
}

function generateImageTag(imageSource) {
    // Check if the string is a base64 image
    const isBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(imageSource);

    // Check if the string is a valid URL
    const isURL = /^https?:\/\//.test(imageSource);

    if (isBase64 || isURL) {
        return imageSource;
    } else {
        return 'Invalid image source';
    }
}

function updatePlayerImage(player, image) {
    var imagetag = generateImageTag(image);
    console.log(player);
    if (player === "homePlayerLogo") {
        bc.postMessage({ homePlayerLogo: imagetag });
    } else {
        bc.postMessage({ awayPlayerLogo: imagetag });
    }
}

// Example usage:
function updateTickerMessage(updateJSON) {
    if (Object.keys(updateJSON).length == 18) {
        console.log('Ticker Update Received');
        let tickerMessage = `${updateJSON['homePlayer']} ${updateJSON['homePlayerScore']} : ${updateJSON['awayPlayerScore']} ${updateJSON['awayPlayer']}`;
        bc.postMessage({ "tickerMessage": tickerMessage });
    }
}

// OBS WebSocket functions
// get list of profiles
async function getOBSProfiles() {
    const obsWS = new OBSWebSocket();
    try {
        await obsWS.connect();
        const data = await obsWS.call('GetProfileList');
        await obsWS.disconnect();
        return data.profiles;
    } catch (err) {
        console.error('Error fetching profiles:', err);
        return null;
    }
}

// get list of scenes
async function getOBSScenes() {
    const obsWS = new OBSWebSocket();
    try {
        await obsWS.connect();
        const data = await obsWS.call('GetSceneList');
        await obsWS.disconnect();
        return data.scenes;
    } catch (err) {
        console.error('Error fetching scenes:', err);
        return null;
    }
}

// get stream config
function getOBStreamConfig() {
    const obsWS = new OBSWebSocket();
    return obsWS.connect()
        .then(() => obsWS.call('GetStreamServiceSettings'))
        .then(data => {
            const response = {
                streamKey: data.streamServiceSettings.key,
                service: data.streamServiceSettings.service
            };
            obsWS.disconnect();
            return response;
        })
        .catch(err => {
            console.error('Error:', err);
            return null;
        });
}


//  OBS config to PoolStat Live Stream
async function sendOBSConfig(data) {
    try {
        const profiles = await getOBSProfiles();
        const scenes = await getOBSScenes();
        const streamConfig = await getOBStreamConfig();

        const messageJSON = {
            rigId: data.rigId,
            profiles: profiles,
            scenes: scenes,
            streamConfig: streamConfig
        };

        console.log('OBS Config Message:', JSON.stringify(messageJSON));
        client.publish('livestream/rigConfig', JSON.stringify(messageJSON));

    } catch (err) {
        console.error('Failed to send OBS config:', err);
    }
}


function sendData(ticker) {

    function genPsRigId() {
        return 'xxxx-xxxx-xxxx'
            .replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
    }

    const messageJSON = JSON.parse(document.getElementById("testDataCode").textContent);
    if (ticker) {
        messageJSON.rigId = genPsRigId();
    } else {
        messageJSON.rigId = getStorageItem("PoolStatRigId");
    }
    console.log('Sending Simulation Data', JSON.stringify(messageJSON));
    client.publish('livestream/matches', JSON.stringify(messageJSON));
}

// update stream status
function updateStreamStatus() {
    if (getStorageItem("streamStatus") === "true") {
        document.getElementById("streamStatus").textContent = "Streaming";
        document.getElementById("streamStatus").style.color = "green";
        if (getStorageItem("streamKey") != null) {
            setOBSStreamKey(getStorageItem("streamKey"));
        }
        startOBSStream();
    } else {
        document.getElementById("streamStatus").textContent = "Not Streaming";
        document.getElementById("streamStatus").style.color = "red";
        stopOBSStream();
    }
}

// set stream key if required
function setOBSStreamKey(newKey) {
    const obsWS = new OBSWebSocket();

    obsWS.connect()
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket'); }

            return obsWS.call('GetStreamServiceSettings');
        })
        .then(data => {
            console.log('Current Stream Service Settings:', data);
            if (data.streamServiceSettings.key !== newKey) {
                if (data.streamServiceType === 'rtmp_common') {
                    const newSettings = {
                        ...data.streamServiceSettings, // Keep existing settings
                        key: newKey // Update the stream key
                    };
                    return obsWS.call('SetStreamServiceSettings', {
                        streamServiceType: 'rtmp_common',
                        streamServiceSettings: newSettings
                    });
                } else {
                    console.log('Stream service is not RTMPStream, skipping stream key update.');
                    return Promise.resolve(); // Resolve to continue the chain
                }
            }
        })
        .then(() => {
            console.log('Stream service settings updated (if applicable).');
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('Error:', err);
        });

    // Event listeners (optional, but useful for real-time updates)
    obsWS.on('ConnectionClosed', () => {
        if (extraDebug) { console.log('Disconnected from OBS WebSocket'); }
    });

    obsWS.on('error', err => {
        console.error('OBS WebSocket error:', err);
    });

    return obsWS;
}

function changeOBSProfile(newProfile) {
    const obsWS = new OBSWebSocket();

    obsWS.connect()
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket Profile'); }
            return obsWS.call('GetProfileList');
        })
        .then(data => {
            console.log('Current Profile:', data.currentProfileName);
            if (data.currentProfileName !== newProfile) {
                return obsWS.call('SetCurrentProfile', { profileName: newProfile });
            } else {
                if (extraDebug) { console.log('Profile is already set to the desired profile.'); }
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            console.log('Profile changed (if applicable).');
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('Error:', err);
        });

    obsWS.on('ConnectionClosed', () => {
        console.log('Disconnected from OBS WebSocket');
    });
    obsWS.on('error', err => {
        console.error('OBS WebSocket error:', err);
    });
    return obsWS;
}

// start OBS stream
function startOBSStream() {
    const obsWS = new OBSWebSocket();

    obsWS.connect()
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket startStream'); }
            return obsWS.call('GetStreamStatus');
        })
        .then(data => {
            if (extraDebug) { console.log('Current Stream Status', data); }
            if (data.outputActive === false) {
                return obsWS.call('StartStream');
            } else {
                console.log('Stream service is already running');
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            console.log('Stream service Started');
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('Error:', err);
        });

    obsWS.on('ConnectionClosed', () => {
        console.log('Disconnected from OBS WebSocket');
    });

    obsWS.on('error', err => {
        console.error('OBS WebSocket error:', err);
    });

    return obsWS;
}

// stop OBS stream
function stopOBSStream() {
    const obsWS = new OBSWebSocket();

    obsWS.connect()
        .then(() => {
            console.log('Connected to OBS WebSocket');

            return obsWS.call('GetStreamStatus');
        })
        .then(data => {
            console.log('Current Stream Status', data);
            if (data.outputActive === true) {
                return obsWS.call('StopStream');
            } else {
                console.log('Stream service is not running');
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            console.log('Stream service Started');
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('Error:', err);
        });

    obsWS.on('ConnectionClosed', () => {
        console.log('Disconnected from OBS WebSocket');
    });

    obsWS.on('error', err => {
        console.error('OBS WebSocket error:', err);
    });

    return obsWS;
}

//main function to connect to PoolStat Live Stream
//including handling messages
function connectPSLiveStream() {
    const psRigId = getStorageItem("PoolStatRigId");
    console.log(psRigId);
    const host = 'wss://btim.brellahost.com.au:9001/';
    const options = {
        keepalive: 60,
        clientId: psRigId,
        protocolId: 'MQTT',
        protocolVersion: 5,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
            topic: 'WillMsg',
            payload: 'Connection Closed abnormally..!',
            qos: 0,
            retain: false
        },
    };

    console.log('Connecting to PoolStat Live Stream server');
    psLiveStatus.textContent = 'Connecting to PoolStat Live Stream server';

    client = mqtt.connect(host, options);

    client.on('connect', function () {
        console.log('Connected to PoolStat Live Stream');
        psLiveStatus.textContent = 'Connected to PoolStat Live Stream. Awaiting Match';

        console.log('Subscribing & Sending Status');
        client.subscribe('livestream/matches');
        client.subscribe('livestream/rigConfig');
        client.publish('livestream/status', 'Rig ' + psRigId + ' Online');
    });

    client.on('error', (err) => {
        console.log('Connection error: ', err);
        client.end();
    });

    client.on('message', function (topic, message) {
        var messageJSON = JSON.parse(message.toString());
        if (extraDebug) { console.log('Message Received: Topic-', topic, 'Message-', messageJSON); }
        switch (topic) {
            case 'livestream/matches':
                if (JSON.parse(message.toString())) {
                    //check if the message for this Rig
                    if (messageJSON['rigId'] === psRigId) {
                        poolstatUpdate(JSON.parse(message.toString()));
                    } else {
                        //it is not ours so check if it matches our CompetitionID and if it does process it for 
                        //Ticker display
                        console.log('compid ' + typeof getStorageItem('compId'));
                        if (messageJSON['compId'] == getStorageItem('compId')) {
                            console.log('ticker check');
                            updateTickerMessage(JSON.parse(message.toString()));
                        }
                    }
                }
                break;
            case 'livestream/rigConfig':
                if (JSON.parse(message.toString())) {
                    //check if the message for this Rig
                    if (messageJSON['rigId'] === psRigId && messageJSON['request'] === 'rigConfig') {
                        sendOBSConfig({ rigId: messageJSON['rigId'] });
                    }
                }
                break;
        }
    }
    );

    client.on('reconnect', () => {
        console.log('Reconnecting to PoolStat Live Stream');
        psLiveStatus.textContent = 'Reconnecting to PoolStat Live Stream';
    });
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // Save the selected tab to localStorage
    setStorageItem("lastSelectedTab", tabName);
    console.log(`Last Stored Tab- ${tabName}`);
}

document.addEventListener("DOMContentLoaded", function () {
    // Try to get the last selected tab from localStorage
    const lastSelectedTab = getStorageItem("lastSelectedTab");

    if (lastSelectedTab && document.getElementById(lastSelectedTab)) {
        // Convert first letter to lowercase before adding "Tab"
        const buttonId = lastSelectedTab.charAt(0).toLowerCase() + lastSelectedTab.slice(1) + "Tab";
        const tabButton = document.getElementById(buttonId);

        if (tabButton) {
            tabButton.click();
        } else {
            // Fallback to first tab if button not found
            document.querySelector(".tablinks").click();
        }
    } else {
        // Otherwise default to the first tab
        document.querySelector(".tablinks").click();
    }
    if (getStorageItem("PoolStatRigId") != null) {
        connectPSLiveStream();
    }
});

function positionConfigChange(inputElement) {
    console.log(inputElement.value + " " + inputElement.id);
    if (inputElement.id.includes('CB')) {
        if (inputElement.checked) {
            setStorageItem(inputElement.id, "true");
        } else {
            setStorageItem(inputElement.id, "false");
        }
    } else {
        setStorageItem(inputElement.id, inputElement.value);
    }
}

function saveTimerID(inputElement) {
    console.log(inputElement.value + " " + inputElement.id);
    setStorageItem(inputElement.id, inputElement.value);
}

function poolStatConfigRaceInfo() {
    var usePoolStatConfigRaceInfo = document.getElementById("raceInfoEnableCB");
    var isChecked = usePoolStatConfigRaceInfo.checked;
    var storageValue = isChecked ? "true" : "false";

    console.log(`Show Race Info ${isChecked}`);
    setStorageItem("useRaceInfo", storageValue);
}

function poolStatConfigGameInfo() {
    var usePoolStatConfigGameInfo = document.getElementById("gameInfoEnableCB");
    var isChecked = usePoolStatConfigGameInfo.checked;
    var storageValue = isChecked ? "true" : "false";

    console.log(`Show Game Info ${isChecked}`);
    setStorageItem("useGameInfo", storageValue);
}

function poolStatConfigTicker() {
    var usePoolStatConfigTicker = document.getElementById("tickerEnableCB");
    var isChecked = usePoolStatConfigTicker.checked;
    var storageValue = isChecked ? "true" : "false";

    console.log(`Use PoolStat Ticker ${isChecked}`);
    setStorageItem("usePoolStatTicker", storageValue);
}

function poolStatConfigBreakingPlayer() {
    var usePoolStatConfigBreakingPlayer = document.getElementById("bpEnableCB");
    var isChecked = usePoolStatConfigBreakingPlayer.checked;
    var storageValue = isChecked ? "true" : "false";

    console.log(`Use PoolStat Breaking Player ${isChecked}`);
    setStorageItem("usePoolStatBreakingPlayer", storageValue);
}

function scoreDisplaySetting() {
    const scoreDisplay = document.getElementById("scoreDisplay");
    if (!document.getElementById("scoreDisplay").checked) {
        setStorageItem("scoreDisplay", "no");
    } else if (document.getElementById("scoreDisplay").checked) {
        setStorageItem("scoreDisplay", "yes");
    }
    if (getStorageItem("usePlayer1") === "yes" && getStorageItem("usePlayer2") === "yes") {
        bc.postMessage({ scoreDisplay: scoreDisplay.checked ? "yes" : "no" });
    }
    if (getStorageItem("usePoolStat") === "yes") {
        bc.postMessage({ scoreDisplay: poolStatCheckbox.checked ? "yes" : "no" });
    }
}

function clearGame() {
    console.log('Clearing Match Data');
    document.getElementById("raceInfoTxt").textContent = "";
    document.getElementById("gameInfoTxt").textContent = "";
    document.getElementById("compIdTxt").textContent = "";
    document.getElementById("matchIdTxt").textContent = "";
    document.getElementById("p1NameTxt").textContent = "";
    document.getElementById("p2NameTxt").textContent = "";
    setStorageItem("p1NameCtrlPanel", "");
    setStorageItem("p2NameCtrlPanel", "");
    setStorageItem("raceInfo", "");
    setStorageItem("gameInfo", "");
    setStorageItem("compId", "");
    setStorageItem("matchId", "");
    postNames("", "");
    postInfo("", "");
}

function postNames(p1namemsg, p2namemsg) {
    console.log('p1: ' + p1namemsg);
    console.log('p2: ' + p2namemsg);
    bc.postMessage({ player: '1', name: p1namemsg });
    bc.postMessage({ player: '2', name: p2namemsg });
    setStorageItem("p1NameCtrlPanel", p1namemsg);
    setStorageItem("p2NameCtrlPanel", p2namemsg);
}

function postInfo(raceMsg, gameMsg, drawRoundMsg) {
    if (extraDebug) { console.log('racemsg: ' + raceMsg); }
    if (extraDebug) { console.log('gamemsg: ' + gameMsg); }
    if (extraDebug) { console.log('drawroundmsg: ' + drawRoundMsg); }
    bc.postMessage({ race: raceMsg });
    bc.postMessage({ game: gameMsg });
    bc.postMessage({ draw: drawRoundMsg });
    setStorageItem("raceInfo", raceMsg);
    setStorageItem("gameInfo", gameMsg);
    setStorageItem("drawRound", drawRoundMsg);
}


function pushScores(p1Score, p2Score) {
    bc.postMessage({ player: '1', score: p1Score });
    bc.postMessage({ player: '2', score: p2Score });
}

function postScore(opt1, player) {
    // Parse stored scores as integers
    let p1ScoreValue = parseInt(getStorageItem("p1ScoreCtrlPanel")) || 0;
    let p2ScoreValue = parseInt(getStorageItem("p2ScoreCtrlPanel")) || 0;

    if (player == "1") {
        if (opt1 == "add") {
            if (p1ScoreValue < 999) {
                p1ScoreValue = p1ScoreValue + 1;
                msg = { player: player, score: p1ScoreValue };
                bc.postMessage(msg);
                setStorageItem("p" + player + "ScoreCtrlPanel", p1ScoreValue);
                setStorageItem("p" + player + "Score", p1ScoreValue);
                stopClock();
                //document.getElementById("sendP" + player + "Score").style.border = "2px solid lightgreen";
                document.getElementById("p" + player + "Score").value = p1ScoreValue;
                resetExt('p1', 'noflash');
                resetExt('p2', 'noflash');
            }
        } else if (p1ScoreValue > 0) {
            p1ScoreValue = p1ScoreValue - 1;
            msg = { player: player, score: p1ScoreValue };
            bc.postMessage(msg);
            setStorageItem("p" + player + "ScoreCtrlPanel", p1ScoreValue);
            setStorageItem("p" + player + "Score", p1ScoreValue);
            //document.getElementById("sendP" + player + "ScoreSub").style.border = "2px solid tomato";
            document.getElementById("p" + player + "Score").value = p1ScoreValue;
        }
    }
    if (player == "2") {
        if (opt1 == "add") {
            if (p2ScoreValue < 999) {
                p2ScoreValue = p2ScoreValue + 1;
                msg2 = { player: player, score: p2ScoreValue };
                bc.postMessage(msg2);
                setStorageItem("p" + player + "ScoreCtrlPanel", p2ScoreValue);
                setStorageItem("p" + player + "Score", p2ScoreValue);
                stopClock();
                //document.getElementById("sendP" + player + "Score").style.border = "2px solid lightgreen";
                document.getElementById("p" + player + "Score").value = p2ScoreValue;
                resetExt('p1', 'noflash');
                resetExt('p2', 'noflash');
            }
        } else if (p2ScoreValue > 0) {
            p2ScoreValue = p2ScoreValue - 1;
            msg2 = { player: player, score: p2ScoreValue };
            bc.postMessage(msg2);
            setStorageItem("p" + player + "ScoreCtrlPanel", p2ScoreValue);
            setStorageItem("p" + player + "Score", p2ScoreValue);
            //document.getElementById("sendP" + player + "ScoreSub").style.border = "2px solid tomato";
            document.getElementById("p" + player + "Score").value = p2ScoreValue;
        }
    }
}

var socket = null;

function cueToolsConnectBtn() {
    const socket = cueToolsConnect((data) => {

    });
}

function cueToolsDisconnectBtn() {
    cueToolsDisconnect(socket);
}

function cueToolsDisconnect(socket) {
    if (socket && socket.connected) {
        socket.disconnect();
        console.log('🔌 Disconnected from CueTools server.');
    } else {
        console.warn('⚠️ No active connection to disconnect.');
    }
}

function cueToolsConnect(onMessageCallback) {
    // Ensure Socket.IO v4 client is available
    if (typeof io === 'undefined') {
        console.error('Socket.IO client library is not loaded.');
        return;
    }

    socket = io('https://cuetools-timer-server.fly.dev', {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        timeout: 5000
    });

    // Handle successful connection
    socket.on('connect', () => {
        if (extraDebug) { console.log('✅ Connected to CueTools server:', socket.id); }
        setStorageItem('socketID', socket.id);
        // Example: Send a message to the server
        socket.emit('join', getStorageItem('timerID'));


        const timerID = getStorageItem('timerID');
        const socketID = socket.id;

        if (!timerID || !socketID) {
            console.error('❌ Missing timerID or socketID.');
            return;
        }

        socket.emit('getSettings', {
            to: timerID,
            from: socketID
        });

        if (extraDebug) { console.log(`📤 Emitted getSettings to ${timerID} from ${socketID}`); }
    });

    // Handle incoming messages
    socket.on('getArgs', (data) => {
        if (extraDebug) { console.log('Message from server:', data); }
        if (typeof onMessageCallback === 'function') {
            //onMessageCallback(data);
            saveCueToolsSettings(data);
        }
    });

    socket.on('runFunction', (msg) => {
        handleRunFunctionMessage(msg);
    });

    // Handle disconnects
    socket.on('disconnect', (reason) => {
        console.warn('Disconnected from server:', reason);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
    });

    return socket;
}

function saveCueToolsSettings(getArgsPayload) {
    if (
        !getArgsPayload ||
        typeof getArgsPayload !== 'object' ||
        !getArgsPayload.options?.detail ||
        !Array.isArray(getArgsPayload.options.detail.socketAllowedSettings)
    ) {
        console.error('Invalid getArgs payload structure.');
        return;
    }
    const localTimerID = getStorageItem('timerID');
    const incomingTo = getArgsPayload.to;

    if (incomingTo !== localTimerID) {
        return;
    }

    const { socketAllowedSettings, ...settings } = getArgsPayload.options.detail;
    const uniqueKeys = [...new Set(socketAllowedSettings)];
    uniqueKeys.forEach((key) => {
        if (key in settings) {
            const value = settings[key];
            const storageKey = `cueTools_${key}`;
            setStorageItem(storageKey, value);
            if (extraDebug) { console.log(`✅ Stored ${storageKey}:`, value); }


            switch (key) {
                case 'matchClock':
                    handleMatchClockState(value);
                    break;
                case 'timeMatchClockHours':
                    handleMatchClockTime('hours', value);
                    break;
                case 'timeMatchClockMinutes':
                    handleMatchClockTime('minutes', value);
                    break;
                case 'timeMatchAdjustAtMatchMinutes':
                    handleMatchClockAdjust('minutes', value);
                    break;
                case 'timeMatchAdjustTimerSeconds':
                    handleMatchClockAdjust('seconds', value);
                    break;
                case 'timeMatchAdjust':
                    handleMatchClockAdjust('minutes', value);
                    break;
            }
        }
    });
}

function handleRunFunctionMessage(messageObject) {
    if (extraDebug) { console.log('runFunction Message:', messageObject); }
    if (
        !messageObject ||
        typeof messageObject !== 'object' ||
        !messageObject.options?.detail?.function
    ) {
        console.error('Invalid runFunction message structure.');
        return;
    }

    const localTimerID = getStorageItem('timerID');
    const incomingTo = messageObject.to;

    if (incomingTo !== localTimerID) {
        console.warn(`Ignoring runFunction: to="${incomingTo}" does not match local timerID="${localTimerID}"`);
        return;
    }

    const func = messageObject.options.detail.function;
    const value = messageObject.options.detail.value;

    switch (func) {
        case 'resetMatch':
            handleMatchReset();
            break;
        case 'resetMatchClock':
            handleMatchReset();
            break;
        case 'matchPause':
            handleMatchPause();
            break;
        case 'matchStart':
            handleMatchStart();
            break;
        case 'resume':
            handleShotClockResume();
            break;
        case 'pause':
            handleShotClockPause();
            break;
        case 'restart':
            handleShotClockRestart();
            break;
        case 'extension':
            handleShotClockExtension(value);
            break;
        default:
            console.warn(`Unknown function "${func}" received.`);
    }
}

//match extension handler
function handleMatchReset() {
    if (extraDebug) { console.log('Resetting match...'); }
}

function handleMatchPause() {
    if (extraDebug) { console.log('Pause match...'); }
}

function handleMatchStart() {
    if (extraDebug) { console.log('Starting match...'); }
}



function handleMatchClockState(state) {
    if (extraDebug) { console.log('Match Clock State Change: '); }
    if (state) {
        var matchClockTime = (parseInt(getStorageItem('cueTools_timeMatchClockMinutes')) * 60) + (parseInt(getStorageItem('cueTools_timeMatchClockhours')) * 3600);
        if (extraDebug) { console.log('Match Clock Time: ' + matchClockTime); }
        matchClock.set(matchClockTime);
    } else {
        matchClock.pause();
    }
}

function handleMatchClockTime(type, value) {
    if (extraDebug) { console.log(`Match Clock Time Change: ${type} to ${value}`); }


}

function handleMatchClockAdjust(type, value) {

}

function handleShotClockResume() {
    if (extraDebug) { console.log('Resuming timer...'); }
    var remaining = shotClock.getTime();
    bc.postMessage({ shotClock: remaining, useShotClock: true });
    shotClock.resume();
}

//shot clock extension handler
function handleShotClockPause() {
    if (extraDebug) { console.log('Pausing timer...'); }
    shotClock.pause();
}

function handleShotClockRestart() {
    if (extraDebug) { console.log('Restarting timer...'); }
    shotClock.reset(parseInt(getStorageItem('cueTools_timeClock')));
    var remaining = shotClock.getTime();
    bc.postMessage({ shotClock: remaining, useShotClock: true });
}

function handleShotClockState(state) {
    if (extraDebug) { console.log('Shot Clock State Change: '); }
    if (state) {
        var shotClockTime = parseInt(getStorageItem('cueTools_timeClock'));
        if (extraDebug) { console.log('Match Clock Time: ' + shotClockTime); }
        shotClock.set(shotClockTime);
        var remaining = shotClock.getTime();
        bc.postMessage({ shotClock: remaining, useShotClock: true });
    } else {
        matchClock.pause();
    }
}

function handleShotClockExtension(player) {
    if (!player) {
        console.warn('No player specified for extension.');
        return;
    }

    if (extraDebug) { console.log(`Extending time for player: ${player}`); }
    var timeAdjust = parseInt(getStorageItem('cueTools_timeExtension'));
    shotClock.adjust(timeAdjust);
    var remaining = shotClock.getTime();
    bc.postMessage({ shotClock: remaining, useShotClock: true });
}

shotClock.onTick((time) => {
    // const display = document.getElementById('shotClockDisplay');
    // if (display) {
    //     display.textContent = time;
    // }
    console.log('Shot Clock Time:', time);
    bc.postMessage({ shotClock: time, useShotClock: true });
});


function createTimer(name, initialSeconds = 45) {
    let remaining = initialSeconds;
    let interval = null;
    let isPaused = true;
    const tickCallbacks = new Set();

    function start() {
        if (interval) {
            console.warn(`${name} is already running.`);
            return;
        }
        isPaused = false;
        interval = setInterval(() => {
            if (!isPaused) {
                remaining--;

                tickCallbacks.forEach((fn) => {
                    try {
                        fn(remaining);
                    } catch (err) {
                        console.error(`❌ Error in ${name} tick callback:`, err);
                    }
                });

                if (remaining <= 0) {
                    clearInterval(interval);
                    interval = null;
                    console.log(`${name} completed.`);
                }
            }
        }, 1000);
        console.log(`${name} started with ${remaining} seconds.`);
    }

    function pause() {
        if (!interval) {
            console.warn(`${name} is not running.`);
            return;
        }
        isPaused = true;
        console.log(`${name} paused at ${remaining} seconds.`);
    }

    function resume() {
        if (!interval) {
            shotClock.start();
            return;
        }
        if (!isPaused) {
            console.warn(`${name} is not paused.`);
            return;
        }
        isPaused = false;
        console.log(`${name} resumed.`);
        var remaining = shotClock.getTime();
        bc.postMessage({ shotClock: remaining, useShotClock: true });
    }

    function reset(newSeconds = initialSeconds) {
        clearInterval(interval);
        interval = null;
        remaining = newSeconds;
        isPaused = true;
        console.log(`${name} reset to ${remaining} seconds.`);
    }

    function adjust(seconds) {
        if (typeof seconds !== 'number') {
            console.warn(`⚠️ Invalid adjustment value for ${name}.`);
            return;
        }
        remaining += seconds;
        if (remaining < 0) {
            remaining = 0;
        }
        console.log(`${name} adjusted by ${seconds} seconds. New time: ${remaining}`);
    }

    function set(seconds) {
        if (typeof seconds !== 'number' || seconds < 0) {
            console.warn(`⚠️ Invalid set value for ${name}.`);
            return;
        }
        remaining = seconds;
        console.log(`${name} time set to ${remaining} seconds.`);
    }

    function getTime() {
        if (extraDebug) { console.log(`${remaining} seconds.`); }
        return remaining;
    }

    function onTick(callback) {
        if (typeof callback === 'function') {
            tickCallbacks.add(callback);
        }
    }

    function offTick(callback) {
        tickCallbacks.delete(callback);
    }

    return {
        start,
        pause,
        resume,
        reset,
        adjust,
        set,
        getTime,
        onTick,
        offTick
    };
}

function cueToolsDisconnect(socket) {
    if (socket && socket.connected) {
        socket.disconnect();
        console.log('Disconnected from CueTools server.');
    } else {
        console.warn('No active connection to disconnect.');
    }
}


function startThemeCheck() {
    document.getElementsByTagName("body")[0].style.background = "#2b2e38";
    document.styleSheets[0].disabled = false;
}

function cLogoNameChange() {
    cLogoName = prompt("Rename \'Player 1 Logo\' checkbox label (13 character maximum)");
    if (cLogoName != null && cLogoName != "") {
        setStorageItem("clogoNameStored", cLogoName.substring(0, 13));
        document.getElementById("logoName").innerHTML = cLogoName.substring(0, 13);
    }
}

function cLogoNameChange2() {
    cLogoName2 = prompt("Rename \'Player 2 Logo\' checkbox label (13 character maximum)");
    if (cLogoName2 != null && cLogoName2 != "") {
        setStorageItem("clogoName2Stored", cLogoName2.substring(0, 13));
        document.getElementById("logoName2").innerHTML = cLogoName2.substring(0, 13);
    }
}

function resetScores() {
    if (confirm("Click OK to confirm score reset")) {

        // Reset input fields
        document.getElementById("p1Score").value = "0";
        document.getElementById("p2Score").value = "0";

        //  reset scores
        bc.postMessage({ player: '1', score: '0' });
        bc.postMessage({ player: '2', score: '0' });

        // Update global score variables
        p1ScoreValue = 0;
        p2ScoreValue = 0;

        // Store reset scores in localStorage
        setStorageItem("p1ScoreCtrlPanel", 0);
        setStorageItem("p2ScoreCtrlPanel", 0);

        resetExt('p1', 'noflash');
        resetExt('p2', 'noflash');
        resetBallTracker();
        resetBallSet();
    } else { }
}


function setStorageItem(key, value) {
    const prefix = INSTANCE_ID ? `${INSTANCE_ID}_` : '';
    localStorage.setItem(`${prefix}${key}`, value);
}

function getStorageItem(key, defaultValue = null) {
    const prefix = INSTANCE_ID ? `${INSTANCE_ID}_` : '';
    const value = localStorage.getItem(`${prefix}${key}`);
    return value !== null ? value : defaultValue;
}

function resetAll() {
    if (confirm("Click OK to confirm complete reset. This will clear all stored data for ALL scoreboard instance.")) {
        clearAllData();
    }
}
function clearAllData() {
    if (confirm('Are you sure you want to clear ALL locally stored data for CueSports Scoreboard, and reset to defaults?')) {
        removeAllData(INSTANCE_ID);
        location.reload(); // Reload the page to start fresh
    }
}
function removeAllData() {
    // Remove all localStorage items for this instance
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        localStorage.removeItem(key);
    }
}

function resetInstance() {
    if (confirm("Click OK to confirm complete reset. This will clear stored data for this scoreboard instance.")) {
        clearInstanceData();
    }
}

function clearInstanceData() {
    if (confirm('Are you sure you want to clear stored data for this scoreboard instance, and reset to defaults?')) {
        const INSTANCE_ID = urlParams.get('instance') || '';
        removeInstanceData(INSTANCE_ID);
        location.reload(); // Reload the page to start fresh
    }
}

function removeInstanceData(instanceId) {
    if (instanceId === null || instanceId === undefined) {
        // Remove all localStorage items
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            localStorage.removeItem(key);
        }
    } else {
        // Remove only items for this instance
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key.startsWith(instanceId)) {
                localStorage.removeItem(key);
            }
        }
    }
}

function checkForUpdate() {
    const updateStatus = document.getElementById('updateStatus');
    updateStatus.textContent = "Checking for updates...";

    fetch('https://api.github.com/repos/ratava/PoolStat-Scoreboard/releases/latest')
        .then(response => {
            if (!response.ok) {
                throw new Error(`GitHub API request failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const latestVersion = data.tag_name.replace(/^v/, '');
            if (compareVersions(latestVersion, versionNum) > 0) {
                updateStatus.innerHTML = `Update available! Latest version: ${latestVersion}<br>
                    <a href="${data.html_url}" target="_blank" rel="noopener noreferrer style="color: red;">Download Update</a>`;
            } else {
                updateStatus.textContent = "You have the latest version.";
            }
        })
        .catch(error => {
            updateStatus.textContent = "Error checking for updates. Please try again later.";
            console.error("Update check failed:", error);
        });
}

function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    return 0;
}

function updateLayout() {
    // Force layout recalculation
    const tabContents = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabContents.length; i++) {
        if (tabContents[i].style.display !== "none") {
            // Only update visible tabs
            LayoutRebuilder.ForceRebuildLayoutImmediate(tabContents[i]);
        }
    }
}
