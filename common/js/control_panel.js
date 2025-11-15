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
const warningSound = "https://timer.cuetools.app/warningDing.mp3";
const fiveSecondSound = "https://timer.cuetools.app/tickSound.mp3";
const completedSound = "https://timer.cuetools.app/outOfTime.mp3";
const simDataKeys = {
    "compId": "simCompIdTxt",
    "matchId": "simMatchIdTxt",
    "obsProfileName": "simProfileNameTxt",
    "obsSceneCollection": "simSceneCollectionTxt",
    "obsSceneName": "simSceneNameTxt",
    "streamKey": "simStreamKeyTxt",
    "streamStatus": "simStreamStatusEnabledToggle",
    "matchStatus": "simMatchStatusTxt",
    "eventName": "simEventNameTxt",
    "matchFormat": "simMatchFormatTxt",
    "drawRound": "simDrawRoundTxt",
    "homePlayer": "simHomePlayerNameTxt",
    "awayPlayer": "simAwayPlayerNameTxt",
    "homePlayerLogo": "simHomePlayerImageTxt",
    "awayPlayerLogo": "simAwayPlayerImageTxt",
    "homePlayerScore": "simHomePlayerScoreTxt",
    "awayPlayerScore": "simAwayPlayerScoreTxt",
    "breakingPlayer": "simBreakingPlayerToggle"
};

//main function to update scoreboard from PoolStat Live Stream
function updateMatch(updateJSON) {
    if (Object.keys(updateJSON).length == 19) {
        if (extraDebug) { console.log('Match Update Received'); }
        if (updateJSON["compId"] > 1) { setStorageItem("compId", updateJSON["compId"]); }
        if (updateJSON["matchId"] > 1) { setStorageItem("matchId", updateJSON["matchId"]); }
        if (updateJSON["obsProfileName"].length > 1) { setStorageItem("obsProfileName", updateJSON["obsProfileName"]); }
        if (updateJSON["obsSceneCollection"].length > 1) { setStorageItem("obsSceneCollection", updateJSON["obsSceneCollection"]); }
        if (updateJSON["obsSceneName"].length > 1) { setStorageItem("obsSceneName", updateJSON["obsSceneName"]); }

        if (updateJSON["streamKey"].length > 1) { setStorageItem("streamKey", updateJSON["streamKey"]); }
        if (updateJSON["streamStatus"] === true) {
            setStorageItem("streamStatus", updateJSON["streamStatus"]);
            changeOBSProfile(updateJSON["obsProfileName"]);
            changeOBSSceneCollection(getStorageItem("obsSceneCollection")); 
            changeOBSScene(updateJSON["obsSceneName"]);
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
        await obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`);
        const data = await obsWS.call('GetProfileList');
        await obsWS.disconnect();
        return data.profiles;
    } catch (err) {
        console.error('Error fetching profiles:', err);
        return null;
    }
}

// get list of scenes
async function getOBSSceneCollections() {
    const obsWS = new OBSWebSocket();
    try {
        await obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`);
        const data = await obsWS.call('GetSceneCollectionList');
        await obsWS.disconnect();
        return data.sceneCollections;
    } catch (err) {
        console.error('Error fetching scenes:', err);
        return null;
    }
}

// get list of scenes
async function getOBSScenes() {
    const obsWS = new OBSWebSocket();
    try {
        await obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`);
        const data = await obsWS.call('GetSceneList');
        await obsWS.disconnect();
        return data.scenes;
    } catch (err) {
        console.error('Error fetching scenes:', err);
        return null;
    }
}

// get stream config
async function getOBSStreamConfig() {
    const obsWS = new OBSWebSocket();
    try {
        await obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`);
        const data = await obsWS.call('GetStreamServiceSettings');
        await obsWS.disconnect();
        return data.streamServiceSettings;
    } catch (err) {
        console.error('Error fetching scenes:', err);
        return null;
    }
}

//  OBS config to PoolStat Live Stream
async function sendOBSConfig(data) {
    try {
        const profiles = await getOBSProfiles();
        const scenes = await getOBSScenes();
        const streamConfig = await getOBSStreamConfig();

        const messageJSON = {
            rigId: data.rigId,
            user: data.user,
            profiles: profiles,
            scenes: scenes,
            streamConfig: streamConfig
        };

        console.log('OBS Config Message:', JSON.stringify(messageJSON));
        client.publish('livestream/initrig', JSON.stringify(messageJSON));

    } catch (err) {
        console.error('Failed to send OBS config:', err);
    }
}

async function sendInitRigRequest(jsonData) {
    try {
        const response = await fetch('https://play.poolstat.net.au/livestream/initrig', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: jsonData // jsonData should be a JSON string
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseJson = await response.json();
        console.log('Success:', responseJson);
        return responseJson;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function sendRigReg() {
    const psRigId = getStorageItem("PoolStatRigId");
    const psLoginName = getStorageItem("psLoginName");
    const rigName = getStorageItem("rigName");

    if (!psLoginName) {
        console.error('Missing required fields for Rig Registration');
        alert("Please enter a PoolStat Live Stream Portal Login Name for Rig Registration");
        return;
    }

    if (!rigName) {
        console.error('Missing required fields for Rig Registration');
        alert("Please enter a Rig Name for Rig Registration");
        return;
    }

    const messageJSON = {
        rigId: psRigId,
        user: psLoginName,
        request: "rigConfig",
        rigName: rigName
    };

    console.log('Sending Rig Registration Message:', JSON.stringify(messageJSON));
    sendInitRigRequest(JSON.stringify(messageJSON))
    .then(result => {
        // Handle the returned JSON
        console.log('Init Response:', result.message);
        alert(`Rig Registration Response: ${result.message}`);
    })
    .catch(error => {
        console.error('Request failed:', error);
    });
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
    let simJSON = { ...simDataKeys };
    for (const [key, value] of Object.entries(simJSON)) {
        console.log(`Key: ${key}, Value: ${value}`);
        simJSON[key] = document.getElementById(value).value;
    }
    //convert to boolean
    simJSON.streamStatus = (simJSON.streamStatus === 'true');

    if (ticker) {
        simJSON.rigId = genPsRigId();
    } else {
        simJSON.rigId = getStorageItem("PoolStatRigId");
    }
    if (extraDebug) { console.log('Sending Simulation Data', JSON.stringify(simJSON)); }
    client.publish('livestream/matches', JSON.stringify(simJSON));
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

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket'); }
            return obsWS.call('GetStreamServiceSettings');
        })
        .then(data => {
            if (extraDebug) { console.log('Current Stream Service Settings:', data); }
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
                    if (extraDebug) { console.log('Stream service is not RTMPStream, skipping stream key update.'); }
                    return Promise.resolve(); // Resolve to continue the chain
                }
            }
        })
        .then(() => {
            if (extraDebug) { console.log('Stream service settings updated (if applicable).'); }
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

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket Profile'); }
            return obsWS.call('GetProfileList');
        })
        .then(data => {
            if (extraDebug) { console.log('Current Profile:', data.currentProfileName); }
            if (data.currentProfileName !== newProfile) {
                return obsWS.call('SetCurrentProfile', { profileName: newProfile });
            } else {
                if (extraDebug) { console.log('Profile is already set to the desired profile.'); }
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            if (extraDebug) { console.log('Profile changed'); }
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('Error:', err);
        });

    obsWS.on('ConnectionClosed', () => {
        if (extraDebug) { console.log('Disconnected from OBS WebSocket'); }
    });
    obsWS.on('error', err => {
        console.error('OBS WebSocket error:', err);
    });
    return obsWS;
}

function changeOBSSceneCollection(newSceneCollection) {
    const obsWS = new OBSWebSocket();

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket Scene Collection'); }
            return obsWS.call('GetSceneCollectionList');
        })
        .then(data => {
            if (extraDebug) { console.log('Current Scene Collection:', data.currentSceneCollectionName); }
            if (data.currentSceneCollectionName !== newSceneCollection) {
                return obsWS.call('SetCurrentSceneCollection', { sceneCollectionName: newSceneCollection });
            } else {
                if (extraDebug) { console.log('Scene is already set to the desired scene.'); }
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            if (extraDebug) { console.log('Scene Collection changed'); }
            obsWS.disconnect();
        })
        .catch(err => {
            console.error('OBS WebSocket error Scene Collection:', err);
        });

    obsWS.on('ConnectionClosed', () => {
        if (extraDebug) { console.log('Disconnected from OBS WebSocket'); }
    });
    obsWS.on('error', err => {
        console.error('OBS WebSocket error Scene Collection:', err);
    });
    return obsWS;
}

function changeOBSScene(newScene) {
    const obsWS = new OBSWebSocket();

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
        .then(() => {
            if (extraDebug) { console.log('Connected to OBS WebSocket Scene'); }
            return obsWS.call('GetCurrentProgramScene');
        })
        .then(data => {
            console.log('Current Scene:', data.currentSceneName);
            if (data.currentSceneName !== newScene) {
                return obsWS.call('SetCurrentProgramScene', { sceneName: newScene });
            } else {
                if (extraDebug) { console.log('Scene is already set to the desired scene.'); }
                return Promise.resolve(); // Resolve to continue the chain
            }
        })
        .then(() => {
            if (extraDebug) { console.log('Scene changed'); }
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

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
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

    obsWS.connect(`ws://127.0.0.1:${getStorageItem("obsWebSocketPort")}`)
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
    const host = 'wss://btim.brellahost.com.au:9001/';
    const statusTopic = `clients/${psRigId}/status`;
    const options = {
        keepalive: 20,
        clientId: psRigId,
        protocolId: 'MQTT',
        protocolVersion: 5,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        will: {
            topic: statusTopic,
            payload: 'offline',
            qos: 1,
            retain: true
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
        client.subscribe('livestream/initrig');
        client.publish(statusTopic, 'online', { qos: 1, retain: true });
    });

    client.on('error', (err) => {
        console.log('Connection error: ', err);
        client.end();
    });

    client.on('close', () => {
        console.log('Disconnected from MQTT broker');
        // If clean disconnect, explicitly publish offline status (LWT handles unclean)
        client.publish(statusTopic, 'offline', { qos: 1, retain: true });
    });

    client.on('message', function (topic, message) {
        var messageJSON = JSON.parse(message.toString());
        if (extraDebug) { console.log('Message Received: Topic-', topic, 'Message-', messageJSON); }
        switch (topic) {
            case 'livestream/matches':
                if (JSON.parse(message.toString())) {
                    //check if the message for this Rig
                    if (messageJSON['rigId'] === psRigId) {
                        updateMatch(JSON.parse(message.toString()));
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
            case 'livestream/initrig':
                if (JSON.parse(message.toString())) {
                    //check if the message for this Rig
                    if (messageJSON['rigId'] === psRigId && messageJSON['request'] === 'rigConfig') {
                        sendOBSConfig({ rigId: messageJSON['rigId'], user: messageJSON['user'] });
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
    //buildSections();
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

    if (getStorageItem("poolStatConfigCueTools") === "true" && getStorageItem('timerID') != null) {
        const socket = cueToolsConnect((data) => {
        });
    }
});

function buildSections() {
    const sections = [
        {
            id: 'bannerBox',
            title: 'Top Banner Box',
            type: 'table',
            fields: [
                { type: 'text', label: 'Right', idSuffix: 'LeftTxt', width: 50 },
                { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                { type: 'checkbox', label: 'Enable Banner', idSuffix: 'EnabledCB' },
                { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
            ]
        },
        {
            id: 'raceInfo',
            title: 'Race Info',
            type: 'table',
            fields: [
                { type: 'text', label: 'Centre', idSuffix: 'LeftTxt', width: 50 },
                { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
            ]
        },
        {
            id: 'gameInfo',
            title: 'Game Info',
            type: 'table',
            fields: [
                { type: 'text', label: 'Centre', idSuffix: 'LeftTxt', width: 50 },
                { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
            ]
        },
        {
            id: 'drawRound',
            title: 'Draw - Round',
            type: 'table',
            fields: [
                { type: 'text', label: 'Centre', idSuffix: 'LeftTxt', width: 50 },
                { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
            ]
        },
        {
            id: 'ticker',
            title: 'Ticker',
            columns: [
                [
                    { type: 'text', label: 'Centre', idSuffix: 'LeftTxt', width: 50 },
                    { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                    { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                    { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                    { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                ],
                [
                    { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                    { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                    { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                    { type: 'checkbox', label: 'Auto Hide', idSuffix: 'AutoHideCB' },
                    { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' }
                ]
            ]
        },
        {
            id: 'hpName',
            title: 'Home Player Name',
            columns: [
                [
                    { type: 'text', label: 'Left', idSuffix: 'LeftTxt', width: 50 },
                    { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                    { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                    { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                    { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                ],
                [
                    { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                    { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                    { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                ],
                [
                    { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
                    { type: 'checkbox', label: 'Gradient', idSuffix: 'BGGradientCB' }
                ]
            ]
        },
        {
            id: 'apName',
            title: 'Away Player Name',
            fields: [
                { type: 'text', label: 'Left', idSuffix: 'LeftTxt', width: 50 },
                { type: 'text', label: 'Top', idSuffix: 'TopTxt', width: 50 },
                { type: 'text', label: 'Height', idSuffix: 'HeightTxt', width: 50 },
                { type: 'text', label: 'Width', idSuffix: 'WidthTxt', width: 50 },
                { type: 'text', label: 'Font Size', idSuffix: 'FontTxt', width: 50 },
                { type: 'text', label: 'Additional CSS', idSuffix: 'CSSTxt', width: 100 },
                { type: 'color', label: 'Foreground Colour', idSuffix: 'FGTxt', colorspace: 'limited-srgb' },
                { type: 'color', label: 'Background Colour', idSuffix: 'BGTxt', colorspace: 'limited-srgb' },
                { type: 'checkbox', label: 'No BG', idSuffix: 'BGNoneCB' },
                { type: 'checkbox', label: 'Gradient', idSuffix: 'BGGradientCB' }
            ]
        },
        {
            id: 'homePlayerScore',
            title: 'Home Player Score',
            columns: [
                [
                    { label: 'Left', type: 'text', id: 'hpScoreLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'hpScoreTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'hpScoreHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'hpScoreWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'hpScoreFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'hpScoreCSSTxt', style: 'width:100px' },
                    { label: 'Foreground Colour', type: 'color', id: 'hpScoreFGTxt' },
                    { label: 'Background Colour', type: 'color', id: 'hpScoreBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'hpScoreBGNoneCB' }
                ]
            ]
        },
        {
            id: 'awayPlayerScore',
            title: 'Away Player Score',
            columns: [
                [
                    { label: 'Right', type: 'text', id: 'apScoreLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'apScoreTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'apScoreHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'apScoreWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'apScoreFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'apScoreCSSTxt', style: 'width:100px' },
                    { label: 'Foreground Colour', type: 'color', id: 'apScoreFGTxt' },
                    { label: 'Background Colour', type: 'color', id: 'apScoreBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'apScoreBGNoneCB' }
                ]
            ]
        },
        {
            id: 'homePlayerImage',
            title: 'Home Player Image',
            columns: [
                [
                    { label: 'Left', type: 'text', id: 'hpImageLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'hpImageTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'hpImageHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'hpImageWidthTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'hpImageCSSTxt', style: 'width:100px' },
                    { label: 'Enable Image', type: 'checkbox', id: 'hpImageEnableCB' },
                    { label: 'Auto Name Move', type: 'checkbox', id: 'hpImageAutoMoveCB' }
                ]
            ]
        },
        {
            id: 'awayPlayerImage',
            title: 'Away Player Image',
            columns: [
                [
                    { label: 'Right', type: 'text', id: 'apImageLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'apImageTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'apImageHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'apImageWidthTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'apImageCSSTxt', style: 'width:100px' },
                    { label: 'Enable Image', type: 'checkbox', id: 'apImageEnableCB' },
                    { label: 'Auto Name Move', type: 'checkbox', id: 'apImageAutoMoveCB' }
                ]
            ]
        },
        {
            id: 'breakingPlayerIndicator',
            title: 'Breaking Player Indicator',
            columns: [
                [
                    { label: 'Height', type: 'text', id: 'bpHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'bpWidthTxt', style: 'width:50px' },
                    { label: 'Additional CSS', type: 'text', id: 'bpCSSTxt', style: 'width:100px' }
                ],
                [
                    { label: 'Background Colour', type: 'color', id: 'bpBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'bpBGNoneCB' }
                ]
            ]
        },

        // CueTools logo section
        {
            id: 'cueToolsLogo',
            type: 'html',
            html: `
                <a href="https://cuetools.app/">
                    <img src="./common/images/cuetools-logo.png"
                        alt="CueTools Logo"
                        title="CueTools Logo"
                        width="100px"
                        height="50px"/>
                </a>
            `
        },

        // Match Clock
        {
            id: 'matchClock',
            title: 'Match Clock',
            columns: [
                [
                    { label: 'Right', type: 'text', id: 'matchClockLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'matchClockTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'matchClockHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'matchClockWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'matchClockFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'matchClockCSSTxt', style: 'width:100px' },
                    { label: 'Background Colour', type: 'color', id: 'matchClockBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'matchClockBGNoneCB' }
                ],
                [
                    { label: 'Normal Colour', type: 'color', id: 'matchClockNormalTxt' },
                    { label: '5 Second Colour', type: 'color', id: 'matchClock5SecondTxt' },
                    { label: 'Completed Colour', type: 'color', id: 'matchClockCompletedTxt' }
                ]
            ]
        },

        // Shot Clock
        {
            id: 'shotClock',
            title: 'Shot Clock',
            columns: [
                [
                    { label: 'Left', type: 'text', id: 'shotClockLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'shotClockTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'shotClockHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'shotClockWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'shotClockFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'shotClockCSSTxt', style: 'width:100px' },
                    { label: 'Background Colour', type: 'color', id: 'shotClockBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'shotClockBGNoneCB' }
                ],
                [
                    { label: 'Normal Colour', type: 'color', id: 'shotClockNormalTxt' },
                    { label: 'Warning Colour', type: 'color', id: 'shotClockWarningTxt' },
                    { label: '5 Second Colour', type: 'color', id: 'shotClock5SecondTxt' },
                    { label: 'Completed Colour', type: 'color', id: 'shotClockCompletedTxt' }
                ]
            ]
        },

        // Home Player Extension
        {
            id: 'homePlayerExt',
            title: 'Home Player - Extension',
            columns: [
                [
                    { label: 'Left', type: 'text', id: 'hpExtLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'hpExtTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'hpExtHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'hpExtWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'hpExtFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'hpExtCSSTxt', style: 'width:100px' },
                    { label: 'Foreground Colour', type: 'color', id: 'hpExtFGTxt' },
                    { label: 'Background Colour', type: 'color', id: 'hpExtBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'hpExtBGNoneCB' }
                ]
            ]
        },

        // Away Player Extension
        {
            id: 'awayPlayerExt',
            title: 'Away Player - Extension',
            columns: [
                [
                    { label: 'Right', type: 'text', id: 'apExtLeftTxt', style: 'width:50px' },
                    { label: 'Top', type: 'text', id: 'apExtTopTxt', style: 'width:50px' },
                    { label: 'Height', type: 'text', id: 'apExtHeightTxt', style: 'width:50px' },
                    { label: 'Width', type: 'text', id: 'apExtWidthTxt', style: 'width:50px' },
                    { label: 'Font Size', type: 'text', id: 'apExtFontTxt', style: 'width:50px' }
                ],
                [
                    { label: 'Additional CSS', type: 'text', id: 'apExtCSSTxt', style: 'width:100px' },
                    { label: 'Foreground Colour', type: 'color', id: 'apExtFGTxt' },
                    { label: 'Background Colour', type: 'color', id: 'apExtBGTxt' },
                    { label: 'No BG', type: 'checkbox', id: 'apExtBGNoneCB' }
                ]
            ]
        }
    ];

    const container = document.getElementById('configContainer'); // container div in your HTML

    container.innerHTML = ''; // clear existing content


    console.log('Building Sections');
    console.log(Array.isArray(sections)); // should print true
    console.log(sections);


    sections.forEach(section => {
        // Create collapsible button
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'collapsible';
        button.textContent = section.title;
        container.appendChild(button);

        // Create content div
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        // Use table if section.table === true, else columns
        if (section.table) {
            const table = document.createElement('table');
            table.className = 'table-container';

            section.fields.forEach(field => {
                const row = document.createElement('tr');

                const tdLabel = document.createElement('td');
                const label = document.createElement('label');
                label.htmlFor = section.id + field.idSuffix;
                label.textContent = field.label;
                tdLabel.appendChild(label);

                const tdInput = document.createElement('td');
                const input = document.createElement('input');
                input.type = field.type || 'text';
                input.id = section.id + field.idSuffix;
                if (field.width) input.style.width = field.width + 'px';
                if (field.colorspace) input.setAttribute('colorspace', field.colorspace);
                if (field.checked) input.checked = true;
                input.onchange = () => positionConfigChange(input);
                tdInput.appendChild(input);

                row.appendChild(tdLabel);
                row.appendChild(tdInput);
                table.appendChild(row);
            });

            contentDiv.appendChild(table);

        }
        if (Array.isArray(section.columns)) {
            section.columns.forEach(colFields => {
                const colDiv = document.createElement('div');
                colDiv.className = 'column';

                if (Array.isArray(colFields)) {
                    colFields.forEach(field => {
                        const div = document.createElement('div');

                        const label = document.createElement('label');
                        label.htmlFor = section.id + field.idSuffix;
                        label.textContent = field.label;
                        div.appendChild(label);

                        const input = document.createElement('input');
                        input.type = field.type || 'text';
                        input.id = section.id + field.idSuffix;
                        if (field.width) input.style.width = field.width + 'px';
                        if (field.colorspace) input.setAttribute('colorspace', field.colorspace);
                        if (field.checked) input.checked = true;
                        input.onchange = () => positionConfigChange(input);
                        div.appendChild(input);

                        colDiv.appendChild(div);
                    });
                }

                contentDiv.appendChild(colDiv);
            });
        }

        container.appendChild(contentDiv);
    });
}

function positionConfigChange(inputElement) {
    console.log(inputElement.value + " " + inputElement.id);
    if (inputElement.id.includes('CB')) {
        if (inputElement.checked) {
            setStorageItem(inputElement.id, "true", true);
        } else {
            setStorageItem(inputElement.id, "false", true);
        }
    } else {
        setStorageItem(inputElement.id, inputElement.value, true);
    }
    intiializePositionConfig();
}

function configSimUpdate(inputElement) {
    console.log(inputElement.value + " " + inputElement.id);
    if (inputElement.id.includes('CB')) {
        if (inputElement.checked) {
            setStorageItem(inputElement.id, "true", true);
        } else {
            setStorageItem(inputElement.id, "false", true);
        }
    } else {
        setStorageItem(inputElement.id, inputElement.value, true);
    }
}

function saveTimerID(inputElement) {
    console.log(inputElement.value + " " + inputElement.id);
    setStorageItem(inputElement.id, inputElement.value);
}

function poolStatConfigLoginName() {
    var psLoginName = document.getElementById("psLoginNameTxt");
    console.log(`Login Name ${psLoginName.value}`);
    setStorageItem("psLoginName", psLoginName.value);
}

function poolStatConfigRigName() {
    var usePoolStatConfigRigName = document.getElementById("rigNameTxt");
    console.log(`Rig Name ${usePoolStatConfigRigName.value}`);
    setStorageItem("rigName", usePoolStatConfigRigName.value);
}

function poolStatConfigObsWebSocketPort() {
    var usePoolStatConfigObsWebSocketPort = document.getElementById("obsWebSocketPortTxt");
    console.log(`OBS WebSocket Port ${usePoolStatConfigObsWebSocketPort.value}`);
    setStorageItem("obsWebSocketPort", usePoolStatConfigObsWebSocketPort.value);
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

function poolStatConfigBannerBox() {
    var usePoolStatConfigBannerBox = document.getElementById("bannerBoxEnableCB");
    var isChecked = usePoolStatConfigBannerBox.checked;
    var storageValue = isChecked ? "true" : "false";
    console.log(`Use PoolStat Banner Box ${isChecked}`);
    setStorageItem("usePoolStatBannerBox", storageValue);
}

function poolStatConfigCustomImage(image) {
    if (image === '1') {
        var usePoolStatConfigImage = document.getElementById("customImage1EnableCB");
        var isChecked = usePoolStatConfigImage.checked;
        var storageValue = isChecked ? "true" : "false";
        console.log(`Use PoolStat Custom Image 1 ${isChecked}`);
        setStorageItem("usePoolStatCustomImage1", storageValue);
    } else if (image === '2') {
        var usePoolStatConfigImage = document.getElementById("customImage2EnableCB");
        var isChecked = usePoolStatConfigImage.checked;
        var storageValue = isChecked ? "true" : "false";
        console.log(`Use PoolStat Custom Image 2 ${isChecked}`);
        setStorageItem("usePoolStatCustomImage2", storageValue);
    }
}

function poolStatConfigCueTools(option) {
    if (option === 'timer') {
        var poolStatConfigCueTools = document.getElementById("cueToolsEnableCB");
        var isChecked = poolStatConfigCueTools.checked;
        var storageValue = isChecked ? "true" : "false";
        if (extraDebug) { console.log(`Use CueTools Timeer ${isChecked}`); }
        setStorageItem("poolStatConfigCueTools", storageValue);
    } else if (option === 'sound') {
        var cueToolsSoundEffectsCB = document.getElementById("cueToolsSoundEffectsCB");
        var isChecked = cueToolsSoundEffectsCB.checked;
        var storageValue = isChecked ? "true" : "false";
        if (extraDebug) { console.log(`Use CueTools Sound Effect ${isChecked}`); }
        setStorageItem("cueToolsSoundEffects", storageValue);
    }
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

//Cuetools Timer Integration
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
        cueToolsStatus.textContent = `Connected to CueTools Timer ID: ${getStorageItem('timerID')}`;
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

    socket.on("reconnect_attempt", () => {
        if (extraDebug) { console.log("Attempting to reconnect to CueTools server..."); }
        cueToolsStatus.textContent = 'Reconnecting to CueTools server...';
    });

    socket.on("reconnect", (attemptNumber) => {
        if (extraDebug) { console.log(`Reconnected to CueTools server after ${attemptNumber} attempts.`); }
        cueToolsStatus.textContent = `Reconnected to CueTools Timer ID: ${getStorageItem('timerID')}`;
        // Re-emit join event after reconnection
        socket.emit('join', getStorageItem('timerID'));
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
    uniqueKeys.forEach((key) => {  //save everything to local storage first
        if (key in settings) {
            const value = settings[key];
            const storageKey = `cueTools_${key}`;
            setStorageItem(storageKey, value);
            if (extraDebug) { console.log(`✅ Stored ${storageKey}:`, value); }
        }
    });

    uniqueKeys.forEach((key) => { //now handle specific settings that need action
        if (key in settings) {
            const value = settings[key];
            switch (key) {
                case 'matchClock':
                    handleMatchClockState(value);
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
                case 'timeClock':
                    handleShotClockState(value);
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

// Match Clock Functions

function handleMatchClockState(state) {
    if (extraDebug) { console.log('Match Clock State Change: ' + state); }
    setStorageItem('cueTools_matchClock', state);
}

function handleMatchReset() {
    if (extraDebug) { console.log('Resetting match...'); }
    console.log(getStorageItem('cueTools_timeMatchClockMinutes') + ' ' + getStorageItem('cueTools_timeMatchClockHours'));
    var minutes = parseInt(getStorageItem('cueTools_timeMatchClockMinutes'));
    var hours = parseInt(getStorageItem('cueTools_timeMatchClockHours'));
    if (isNaN(minutes)) { minutes = 0; }
    if (isNaN(hours)) { hours = 0; }
    matchClock.reset((minutes * 60) + (hours * 3600));
}

function handleMatchPause() {
    if (extraDebug) { console.log('Pause match...'); }
    matchClock.pause();
}

function handleMatchStart() {
    if (extraDebug) { console.log('Starting match...'); }
    matchClock.start();
}

function handleMatchClockTime(type, value) {
    if (extraDebug) { console.log(`Match Clock Time Change: ${type} to ${value}`); }
    var hours = parseInt(getStorageItem('cueTools_timeMatchClockHours'));
    var minutes = parseInt(getStorageItem('cueTools_timeMatchClockMinutes'));
    if (isNaN(minutes)) { minutes = 0; }
    if (isNaN(hours)) { hours = 0; }

    var time = (hours * 3600) + (minutes * 60);
    matchClock.reset(time);
    var remaining = matchClock.getTime();
    checkMatchClockTick(remaining);
    var displayTime;
    if (time > 60) {
        displayTime = Math.round(remaining / 60).toString() + "min";
    } else {
        displayTime = time.toString() + "sec";
    }
    bc.postMessage({ matchClock: displayTime, useMatchClock: getStorageItem('cueTools_matchClock') === 'true' });
}

function handleMatchClockAdjust(type, value) {

}

function checkMatchClockTick(time) {
    var mcWarningTime = 60;
    var normal = getStorageItem('shotClockNormalTxt');
    var warning = getStorageItem('shotClockWarningTxt');
    var fiveSecond = getStorageItem('shotClock5SecondTxt');
    var completed = getStorageItem('shotClockCompletedTxt');

    if (time > mcWarningTime) {
        bc.postMessage({ matchClockColour: normal });
    }

    if (time == mcWarningTime) {
        bc.postMessage({ matchClockColour: warning });
        bc.postMessage({ playSound: warningSound });
    }

    if (time < mcWarningTime && time > 20) {
        bc.postMessage({ matchClockColour: normal });
    }

    if (time <= 20 && time > 0) {
        bc.postMessage({ matchClockColour: fiveSecond });
        bc.postMessage({ playSound: fiveSecondSound });
    }

    if (time == 0) {
        bc.postMessage({ matchClockColour: completed });
        bc.postMessage({ playSound: completedSound });
    }
}

matchClock.onTick((time) => {
    if (extraDebug) { console.log('Match Clock Time:', time); }
    var displayTime;
    if (time > 60) {
        displayTime = Math.round(remaining / 60).toString() + "min";
    } else {
        displayTime = time.toString() + "sec";
    }
    if (displayTime === '0sec') { displayTime = 'End'; }
    if (extraDebug) { console.log('Display Time:', displayTime); }
    bc.postMessage({ matchClock: displayTime, useMatchClock: getStorageItem('cueTools_matchClock') === 'true' });
    checkMatchClockTick(time);
});

// Shot Clock Functions
function handleShotClockResume() {
    if (extraDebug) { console.log('Resuming timer...'); }
    var remaining = shotClock.getTime();
    checkShotClockColour(remaining);
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
    checkShotClockColour(remaining);
    bc.postMessage({ shotClock: remaining, useShotClock: true });
    bc.postMessage({ shotClockExtensionReset: true });
}

function handleShotClockState(state) {
    if (extraDebug) { console.log('Shot Clock State Change: '); }
    if (state) {
        var shotClockTime = parseInt(getStorageItem('cueTools_timeClock'));
        if (extraDebug) { console.log('Shot Clock Time: ' + shotClockTime); }
        shotClock.set(shotClockTime);
        var remaining = shotClock.getTime();
        checkShotClockColour(remaining);
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
    bc.postMessage({ shotClockExtension: player });
}

function checkShotClockColour(time) {
    var scWarningTime = parseInt(getStorageItem('cueTools_timeWarning'));
    var normal = getStorageItem('shotClockNormalTxt');
    var warning = getStorageItem('shotClockWarningTxt');
    var fiveSecond = getStorageItem('shotClock5SecondTxt');
    var completed = getStorageItem('shotClockCompletedTxt');

    if (time > scWarningTime) {
        bc.postMessage({ shotClockColour: normal });
    }

    if (time == scWarningTime) {
        bc.postMessage({ shotClockColour: warning });
        bc.postMessage({ playSound: warningSound });
    }

    if (time < scWarningTime && time > 5) {
        bc.postMessage({ shotClockColour: normal });
    }

    if (time <= 5 && time > 0) {
        bc.postMessage({ shotClockColour: fiveSecond });
        bc.postMessage({ playSound: fiveSecondSound });
    }

    if (time == 0) {
        bc.postMessage({ shotClockColour: completed });
        bc.postMessage({ playSound: completedSound });
    }
}


shotClock.onTick((time) => {
    if (extraDebug) { console.log('Shot Clock Time:', time); }
    bc.postMessage({ shotClock: time, useShotClock: true });
    checkShotClockColour(time);
});




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


function setStorageItem(key, value, saveIcon = false) {
    if (saveIcon) {
        document.getElementById("saveIcon").classList.remove("fadeOutElm");
        document.getElementById("saveIcon").classList.add("fadeInElm");
    }
    const prefix = INSTANCE_ID ? `${INSTANCE_ID}_` : '';
    localStorage.setItem(`${prefix}${key}`, value);
    // if (saveIcon) {
    //     document.getElementById("saveIcon").classList.add("fadeOutElm");
    //     document.getElementById("saveIcon").classList.remove("fadeInElm");
    // }
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
