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

function updateTabVisibility() {
    // Get the state of the player settings
    // const player1Enabled = document.getElementById("usePlayer1Setting").checked;
    // const player2Enabled = document.getElementById("usePlayer2Setting").checked;
	// const clockEnabled = document.getElementById("useClockSetting").checked;
	// const poolStatEnabled = document.getElementById("poolStatCheckbox").checked;

    // Determine if both players are enabled
    // const bothPlayersEnabled = player1Enabled && player2Enabled;

    // Get tab elements
    // const scoringTab = document.getElementById("scoringTab");
	// const poolStatTab = document.getElementById("poolStatTab");

    // // Show or hide the scoring tab
    // scoringTab.style.display = bothPlayersEnabled ? "inline-block" : "none";
	// scoringTab.style.display = poolStatEnabled ? "none" : "inline-block";
	// poolStatTab.style.display = poolStatEnabled ? "inline-block" : "none";
}

// Call updateTabVisibility on page load to set initial tab visibility
document.addEventListener("DOMContentLoaded", function() {
	updateTabVisibility();
	//check if we are using PoolStat Live Stream and connect if setup.
	if (getStorageItem("PoolStatRigID") != null) {
		connectPSLiveStream();
	}
});

//main function to update scoreboard from PoolStat Live Stream
function poolstatUpdate(updateJSON) {
	if (Object.keys(updateJSON).length == 18) {
		console.log('Update Received');
		if (updateJSON["compId"].length > 1) {setStorageItem("compId", updateJSON["compId"]);}
		if (updateJSON["matchId"].length > 1) {setStorageItem("matchId", updateJSON["matchId"]);}
		if (updateJSON["obsProfileName"].length > 1) {setStorageItem("obsProfileName", updateJSON["obsProfileName"]);}
			
		
		if (updateJSON["streamKey"].length > 1) {setStorageItem("streamKey", updateJSON["streamKey"]);}
		if (updateJSON["streamStatus"] === true) {
			setStorageItem("streamStatus", updateJSON["streamStatus"]);
			changeOBSProfile(updateJSON["obsProfileName"]);
			updateStreamStatus();
		} else {
			setStorageItem("streamStatus", updateJSON["streamStatus"]);
			updateStreamStatus();
		}
		if (updateJSON["breakingPlayer"] != null) {setStorageItem("breakingPlayer", updateJSON["breakingPlayer"]);}
		if (updateJSON["homePlayerLogo"] != null) {setStorageItem("homePlayerLogo", updateJSON["homePlayerLogo"]);}
		if (updateJSON["awayPlayerLogo"] != null) {setStorageItem("awayPlayerLogo", updateJSON["awayPlayerLogo"]);}

		if (updateJSON["matchFormat"].length > 1) {document.getElementById("raceInfoTxt").textContent  = updateJSON["matchFormat"];}
		if (updateJSON["eventName"].length > 1) {document.getElementById("gameInfoTxt").textContent  = updateJSON["eventName"];}
		if (updateJSON["compId"] > 0) {document.getElementById("compIdTxt").textContent  = updateJSON["compId"];}
		if (updateJSON["matchId"] > 0) {document.getElementById("matchIdTxt").textContent  = updateJSON["matchId"];}		
		postInfo(document.getElementById("raceInfoTxt").textContent, document.getElementById("gameInfoTxt").textContent );
		if (updateJSON["homePlayer"].length > 1) {document.getElementById("p1NameTxt").textContent = updateJSON["homePlayer"];}
		if (updateJSON["awayPlayer"].length > 1) {document.getElementById("p2NameTxt").textContent = updateJSON["awayPlayer"];}
		postNames(document.getElementById("p1NameTxt").textContent, document.getElementById("p2NameTxt").textContent);
		pushScores(updateJSON["homePlayerScore"], updateJSON["awayPlayerScore"]);	
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


// send OBS config to PoolStat Live Stream
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
			if (extraDebug) {console.log('Connected to OBS WebSocket');}
		
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
		if (extraDebug) {console.log('Disconnected from OBS WebSocket');}
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
			if (extraDebug) {console.log('Connected to OBS WebSocket Profile');}
			return obsWS.call('GetProfileList');
		})
		.then(data => {
			console.log('Current Profile:', data.currentProfileName);
			if (data.currentProfileName !== newProfile) {
				return obsWS.call('SetCurrentProfile', { profileName: newProfile });
			} else {
				if (extraDebug) {console.log('Profile is already set to the desired profile.');}
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
			if (extraDebug) {console.log('Connected to OBS WebSocket startStream');}
			return obsWS.call('GetStreamStatus');
		})
		.then(data => {
			if (extraDebug) {console.log('Current Stream Status', data);}
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
	const psRigId = getStorageItem("PoolStatRigID");
	console.log(psRigId);
    const host = 'wss://btim.brellahost.com.au:9001/'
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
    }

    console.log('Connecting to PoolStat Live Stream server')
	psLiveStatus.textContent = 'Connecting to PoolStat Live Stream server';

    client = mqtt.connect(host, options)
  
    client.on('connect', function () {
    	console.log('Connected to PoolStat Live Stream');
	  	psLiveStatus.textContent = 'Connected to PoolStat Live Stream. Awaiting Match';

		console.log('Subscribing & Sending Status');
    	client.subscribe('livestream/matches');
		client.subscribe('livestream/rigConfig');
    	client.publish('livestream/status','Rig ' + psRigId + ' Online');
    })

    client.on('error', (err) => {
      console.log('Connection error: ', err);
      client.end();
    })

    client.on('message', function (topic, message) {
        var messageJSON = JSON.parse(message.toString());
        if (extraDebug) {console.log('Message Received: Topic-', topic, 'Message-', messageJSON);}
        switch (topic)	{
            case 'livestream/matches':
                if (JSON.parse(message.toString())) {
                    //check if the message for this Rig
                    if (messageJSON['rigId'] === psRigId) {
                        poolstatUpdate(JSON.parse(message.toString()));
                    } else {
                        //it is not ours so check if it matches our CompetitionID and if it does process it for 
                        //Ticker display
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
    )

    client.on('reconnect', () => {
      console.log('Reconnecting to PoolStat Live Stream');
	  psLiveStatus.textContent = 'Reconnecting to PoolStat Live Stream';
    })
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

document.addEventListener("DOMContentLoaded", function() {
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
});

// Function to save the opacity value to localStorage
function saveOpacity() {
	var opacityValue = document.getElementById('scoreOpacity').value;
	setStorageItem('overlayOpacity', opacityValue);
	document.getElementById('sliderValue').innerText = opacityValue + '%'; // Update displayed value
}

// Function to save the uiScaling localStorage
function saveScaling() {
	var scalingValue = document.getElementById('uiScaling').value;
	setStorageItem('uiScalingValue', scalingValue);
	document.getElementById('sliderUiScalingValue').innerText = scalingValue + '%';
}

function toggleCheckbox(checkboxId, inputElement) {
    const checkbox = document.getElementById(checkboxId);
	console.log(`File size ${inputElement.files.length}`);
    checkbox.disabled = !inputElement.files.length; // Enable if file is selected, disable otherwise
}

function playerColorChange(player) {
	var cvalue = document.getElementById("p" + player + "colorDiv").value;
	if (player == 1) {
		playerx = player;
		pColormsg = document.getElementById("p" + player + "colorDiv").value;
		bc.postMessage({ player: playerx, color: pColormsg });
		var selectedColor = document.getElementById("p" + player + "colorDiv").value;
		document.getElementById("p1colorDiv").style.background = `${selectedColor}`;
		//document.getElementById("p1Name").style.background = `linear-gradient(to right, ${selectedColor}, white)`;

		if (cvalue == "white" || cvalue == "") { document.getElementById("p1colorDiv").style.color = "black"; document.getElementById("p1colorDiv").style.textShadow = "none"; 
		} else { document.getElementById("p1colorDiv").style.color = "white"; };
		setStorageItem("p1colorSet", document.getElementById("p" + player + "colorDiv").value);
		document.getElementsByTagName("select")[0].options[0].value = cvalue;
	} else {
		playerx = player;
		pColormsg = document.getElementById("p" + player + "colorDiv").value;
		bc.postMessage({ player: playerx, color: pColormsg });
		var selectedColor = document.getElementById("p" + player + "colorDiv").value;
		document.getElementById("p2colorDiv").style.background = `${selectedColor}`;

		if (cvalue == "white" || cvalue == "") { document.getElementById("p2colorDiv").style.color = "black"; document.getElementById("p2colorDiv").style.textShadow = "none"; 
		} else { document.getElementById("p2colorDiv").style.color = "white"; };
		setStorageItem("p2colorSet", document.getElementById("p" + player + "colorDiv").value);
		document.getElementsByTagName("select")[1].options[0].value = cvalue;
	}
}

function playerSetting(player) {
    var usePlayerSetting = document.getElementById("usePlayer" + player + "Setting");
    var isChecked = usePlayerSetting.checked;
    var action = isChecked ? "remove" : "add";
    var storageValue = isChecked ? "yes" : "no";
    var usePlayer = isChecked ? "showPlayer" : "hidePlayer";
    
    setStorageItem("usePlayer" + player, storageValue);
    
    // Handle player-specific elements
    ["Name", "NameLabel", "colorDiv", "ColorLabel"].forEach(function(elem) {
        document.getElementById("p" + player + elem).classList[action]("noShow");
    });

    // Check if both players are enabled
    const player1Enabled = getStorageItem("usePlayer1") === "yes";
    const player2Enabled = getStorageItem("usePlayer2") === "yes";
    const bothPlayersEnabled = player1Enabled && player2Enabled;
    const bothPlayersDisabled = !player1Enabled && !player2Enabled;
    const anyPlayerDisabled = !player1Enabled || !player2Enabled;

    // Handle score display checkbox
    const scoreDisplayCheckbox = document.getElementById("scoreDisplay");
    if (anyPlayerDisabled) {
        scoreDisplayCheckbox.disabled = true;
        scoreDisplayCheckbox.checked = false;
        setStorageItem("scoreDisplay", "no");
    } else {
        scoreDisplayCheckbox.disabled = false;
    }

    // Handle clock, player toggle, and ball tracker checkboxes
    const clockCheckbox = document.getElementById("useClockSetting");
    const toggleCheckbox = document.getElementById("useToggleSetting");
    const ballTrackerCheckbox = document.getElementById("ballTrackerCheckbox");

    if (anyPlayerDisabled) {
        // Disable and uncheck the checkboxes
        clockCheckbox.disabled = true;
        clockCheckbox.checked = false;
        setStorageItem("useClock", "no");
        
        toggleCheckbox.disabled = true;
        toggleCheckbox.checked = false;
        setStorageItem("usePlayerToggle", "no");
        
        ballTrackerCheckbox.disabled = true;
        ballTrackerCheckbox.checked = false;
        setStorageItem("enableBallTracker", "no");

        // Hide related elements
        document.getElementById("clockInfo").classList.add("noShow");
        document.getElementById("extensionControls").classList.add("noShow");
        document.getElementById("clockControlLabel").classList.add("noShow");
        document.getElementById("playerToggle").classList.add("noShow");
        document.getElementById("playerToggleLabel").classList.add("noShow");
        document.getElementById("ballTrackerDirectionDiv").classList.add("noShow");
        document.getElementById("ballTrackerDirection").classList.add("noShow");
        document.getElementById("ballTrackerLabel").classList.add("noShow");
        document.getElementById("ballTrackerDiv").classList.add("noShow");
		document.getElementById("internationalBallTracker").classList.add("noShow");
		document.getElementById("worldBallTracker").classList.add("noShow");

        // Send messages to hide these features
        bc.postMessage({ clockDisplay: 'noClock' });
        bc.postMessage({ clockDisplay: 'hideActivePlayer' });
        bc.postMessage({ displayBallTracker: false });
    } else {
        // Enable the checkboxes
        clockCheckbox.disabled = false;
        toggleCheckbox.disabled = false;
        ballTrackerCheckbox.disabled = false;
    }
    
    // Show/hide  elements based on individual players being enabled
    document.getElementById("logoName").classList[player1Enabled ? "remove" : "add"]("noShow");
    document.getElementById("customLogo1").classList[player1Enabled ? "remove" : "add"]("noShow");
    document.getElementById("uploadCustomLogo").classList[player1Enabled ? "remove" : "add"]("noShow");
    document.getElementById("logoName2").classList[player2Enabled ? "remove" : "add"]("noShow");
    document.getElementById("customLogo2").classList[player2Enabled ? "remove" : "add"]("noShow");
    document.getElementById("uploadCustomLogo2").classList[player2Enabled ? "remove" : "add"]("noShow");

    // Hide shared elements based on both players being enabled
    document.getElementById("gameInfo").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");
    document.getElementById("teamInfo").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");
    document.getElementById("raceInfo").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");
    document.getElementById("raceInfoTxt").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");
    document.getElementById("sendPNames").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");
    document.getElementById("playerDetailLabel").classList[bothPlayersDisabled ? "add" : "remove"]("noShow");

    // Hide Race info when any player is disabled
    document.getElementById("raceInfo").classList[anyPlayerDisabled ? "add" : "remove"]("noShow");
    document.getElementById("raceInfoTxt").classList[anyPlayerDisabled ? "add" : "remove"]("noShow");

    bc.postMessage({playerDisplay: usePlayer, playerNumber: player});

    updateTabVisibility();
}

function poolStatConfigTicker() {
    var usePoolStatConfigTicker = document.getElementById("poolStatConfigTickerCheckbox");
    var isChecked = usePoolStatConfigTicker.checked;
    var storageValue = isChecked ? "yes" : "no";
    
	console.log(`Use PoolStat Ticker ${isChecked}`);
    setStorageItem("usePoolStatTicker", storageValue);
}

function poolStatConfigBreakingPlayer() {
    var usePoolStatConfigBreakingPlayer = document.getElementById("poolStatConfigBreakingPlayerCheckbox");
    var isChecked = usePoolStatConfigBreakingPlayer.checked;
    var storageValue = isChecked ? "yes" : "no";
    
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
	document.getElementById("p1NameTxt").textContent= "";
	document.getElementById("p2NameTxt").textContent= "";
	setStorageItem("p1NameCtrlPanel", "");
	setStorageItem("p2NameCtrlPanel", "");	
	setStorageItem("raceInfo", "");
	setStorageItem("gameInfo", "");	
	setStorageItem("compId", "");
	setStorageItem("matchId", "");	
	postNames("","");
	postInfo("","");	
}

function postNames(p1namemsg, p2namemsg) {
	console.log('p1: ' + p1namemsg);
	console.log('p2: ' + p2namemsg);
	bc.postMessage({ player: '1', name: p1namemsg });
	bc.postMessage({ player: '2', name: p2namemsg });
	setStorageItem("p1NameCtrlPanel", p1namemsg);
	setStorageItem("p2NameCtrlPanel", p2namemsg);
}

function postInfo(racemsg, gamemsg) {
	if (extraDebug) {console.log('racemsg: ' + racemsg);}
	if (extraDebug) {console.log('gamemsg: ' + gamemsg);}
	bc.postMessage({ race: racemsg });
	bc.postMessage({ game: gamemsg });	
	setStorageItem("raceInfo", raceInfoTxt.value);
	setStorageItem("gameInfo", gameInfoTxt.value);
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
                document.getElementById("p"+player+"Score").value = p1ScoreValue;
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
            document.getElementById("p"+player+"Score").value = p1ScoreValue;
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
                document.getElementById("p"+player+"Score").value = p2ScoreValue;
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
            document.getElementById("p"+player+"Score").value = p2ScoreValue;
        }
    }
	resetBallTracker()
}

function obsThemeChange() {
	if (document.getElementById("obsTheme").value == "28") {
		setStorageItem("obsTheme", "28");
		document.getElementById("obsTheme").value = "28";
		document.getElementsByTagName("body")[0].style.background = "#2b2e38";
		document.styleSheets[0].disabled = false;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;

	}
	if (document.getElementById("obsTheme").value == "27") {
		setStorageItem("obsTheme", "27");
		document.getElementById("obsTheme").value = "27";
		document.getElementsByTagName("body")[0].style.background = "#1f1e1f";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = false;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (document.getElementById("obsTheme").value == "acri") {
		setStorageItem("obsTheme", "acri");
		document.getElementById("obsTheme").value = "acri";
		document.getElementsByTagName("body")[0].style.background = "#181819";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = false;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (document.getElementById("obsTheme").value == "grey") {
		setStorageItem("obsTheme", "grey");
		document.getElementById("obsTheme").value = "grey";
		document.getElementsByTagName("body")[0].style.background = "#2f2f2f";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = false;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (document.getElementById("obsTheme").value == "light") {
		setStorageItem("obsTheme", "light");
		document.getElementById("obsTheme").value = "light";
		document.getElementsByTagName("body")[0].style.background = "#e5e5e5";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = false;
		document.styleSheets[5].disabled = true;
	}
	if (document.getElementById("obsTheme").value == "rachni") {
		setStorageItem("obsTheme", "rachni");
		document.getElementById("obsTheme").value = "rachni";
		document.getElementsByTagName("body")[0].style.background = "#232629";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = false;
	}
}

function startThemeCheck() {
	if (getStorageItem("obsTheme") == null) { setStorageItem("obsTheme", "27"); document.getElementById("obsTheme").value = "27"; };
	if (getStorageItem("obsTheme") == "28") {
		document.getElementById("obsTheme").value = "28";
		document.getElementsByTagName("body")[0].style.background = "#2b2e38";
		document.styleSheets[0].disabled = false;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (getStorageItem("obsTheme") == "27") {
		document.getElementById("obsTheme").value = "27";
		document.getElementsByTagName("body")[0].style.background = "#1f1e1f";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = false;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (getStorageItem("obsTheme") == "acri") {
		document.getElementById("obsTheme").value = "acri";
		document.getElementsByTagName("body")[0].style.background = "#181819";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = false;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (getStorageItem("obsTheme") == "grey") {
		document.getElementById("obsTheme").value = "grey";
		document.getElementsByTagName("body")[0].style.background = "#2f2f2f";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = false;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = true;
	}
	if (getStorageItem("obsTheme") == "light") {
		document.getElementById("obsTheme").value = "light";
		document.getElementsByTagName("body")[0].style.background = "#e5e5e5";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = false;
		document.styleSheets[5].disabled = true;
	}
	if (getStorageItem("obsTheme") == "rachni") {
		document.getElementById("obsTheme").value = "rachni";
		document.getElementsByTagName("body")[0].style.background = "#232629";
		document.styleSheets[0].disabled = true;
		document.styleSheets[1].disabled = true;
		document.styleSheets[2].disabled = true;
		document.styleSheets[3].disabled = true;
		document.styleSheets[4].disabled = true;
		document.styleSheets[5].disabled = false;
	}
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
    
    // Send reset scores
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

function resetBallSet() {
	document.getElementById('p1colorOpen').checked = true;
	bc.postMessage({ playerBallSet: 'p1Open' });
}	

function resetBallTracker() {
    // Retrieve the saved ball state from localStorage
    let ballState = JSON.parse(getStorageItem('ballState') || '{}');

    // Select all ball elements within the .ballTracker container
    const ballElements = document.querySelectorAll('.ball');

    ballElements.forEach(function(ball) {
        // Remove the 'faded' class to reset the ball
        ball.classList.remove('faded');
        
        // Update the ball state to false (not faded)
        ballState[ball.id] = false;
		bc.postMessage({ resetBall: ball.id });
    });

    // Save the updated state back to localStorage
    setStorageItem('ballState', JSON.stringify(ballState));

    console.log("All balls have been reset to their default condition.");
}

function clearLogo(xL) {
    // Remove the custom logo from localStorage
    localStorage.removeItem("customLogo" + xL);

    // Clear the preview image source
    var imgElem = document.getElementById("l" + xL + "Img");
    if (imgElem) {
        imgElem.src = "./common/images/placeholder.png";
    }

    // Reset the file input field so that a file can be re-selected
    var fileInput = document.getElementById("FileUploadL" + xL);
    if (fileInput) {
        fileInput.value = "";
    }

    // Reset the label text to its default state
    var defaultText = (xL === 1) ? "Upload Player 1 Logo" :
                      (xL === 2) ? "Upload Player 2 Logo" :
                      "L" + (xL-2);
    var textElem = document.getElementById("FileUploadLText" + xL);
    if (textElem) {
        textElem.textContent = defaultText;
    }

	// For player logos (1 and 2), uncheck their associated checkbuttons
    if (xL === 1 || xL === 2) {
        var checkbox = document.getElementById("customLogo" + xL);
        if (checkbox) {
            checkbox.checked = false;
        }
		if (xL ===1) {
			setStorageItem("useCustomLogo", "no");
			customLogoSetting();
		} else {
			setStorageItem("useCustomLogo2","no");
			customLogoSetting2();
		}
		var fileInput = document.getElementById("FileUploadL" + xL);
		toggleCheckbox("customLogo"+ xL, fileInput)
    }

    // Rebind the container's click so that it triggers a file input click
    var containerId;
    if (xL === 1) {
        containerId = "uploadCustomLogo";
    } else if (xL === 2) {
        containerId = "uploadCustomLogo2";
    } else {
        containerId = "logoSsImg" + xL;
    }
    var container = document.getElementById(containerId);
    if (container && fileInput) {
        container.onclick = function (e) {
            fileInput.click();
        };
		// Restore original styling by removing inline styles
        container.style.backgroundColor = "";
        container.style.color = "";
    }
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
		removeAllData(INSTANCE_ID );
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
