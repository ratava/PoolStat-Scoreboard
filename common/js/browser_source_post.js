'use strict';
// CueSport ScoreBoard is a modified version of G4ScoreBoard by Iain MacLeod. The purpose of this modification was to simplify and enhance the UI/UX for users.
// I have removed the Salotto logo, as I myself have not asked for permission to use - but if you choose to use it, it can be uploaded as a custom logo.
// This implementation now uses 5 custom logos, 2 associated with players, and 3 for a slideshow functionality.

//  G4ScoreBoard addon for OBS version 1.6.0 Copyright 2022-2023 Norman Gholson IV
//  https://g4billiards.com http://www.g4creations.com
//  this is a purely javascript/html/css driven scoreboard system for OBS Studio
//  free to use and modify and use as long as this copyright statment remains intact. 
//  Salotto logo is the copyright of Salotto and is used with their permission.
//  for more information about Salotto please visit https://salotto.app

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										variable declarations
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

var countDownTime;
var shotClockxr = null;
const urlParams = new URLSearchParams(window.location.search);
const INSTANCE_ID = urlParams.get('instance') || '';
const bcr = new BroadcastChannel(`recv_${INSTANCE_ID}`); // browser_source -> control_panel channel 
const bc = new BroadcastChannel(`main_${INSTANCE_ID}`);
var playerNumber;

// Set default values immediately
function initializeDefaults() {
    const defaults = {
        "usePlayer1": "yes",
        "usePlayer2": "yes",
        "usePlayerToggle": "yes",
        "activePlayer": "1"
    };

    Object.entries(defaults).forEach(([key, value]) => {
        if (getStorageItem(key) === null) {
            console.log(`Setting default value for ${key}: ${value}`);
            setStorageItem(key, value);
        }
    });
}

// Call initialization immediately
initializeDefaults();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										broadcast channel events
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

// First, separate handlers into distinct functions
const handlers = {

    score(data) {
        console.log(`Player: ${data.player}, Score: ${data.score}`);
        const scoreElement = document.getElementById(`player${data.player}Score`);
        if (data.score > scoreElement.innerHTML) {
            scoreElement.innerHTML = data.score;
            scoreElement.classList.add("winBlink");
            scoreElement.textContent = data.score;
            setTimeout("clearWinBlink()", 500);
        } else {
            scoreElement.innerHTML = data.score;
        }
    },

    scaling(data) {
        console.log(`Scaling setting: ${data.scaling}`);
        document.documentElement.style.setProperty('--ui-scaling', data.scaling);
    },

    race(data) {
        console.log("Race info: " + data.race);

        if (data.race != "") {
            document.getElementById("raceInfo").classList.remove("noShow");
            document.getElementById("raceInfo").classList.add("fadeInElm");
            document.getElementById("raceInfo").innerHTML = data.race;
        } else {
            document.getElementById("raceInfo").classList.add("noShow");
            document.getElementById("raceInfo").classList.remove("fadeInElm");        
        }
        document.getElementById("customLogo1").classList.add("customLogoWide1");
        document.getElementById("customLogo2").classList.add("customLogoWide2");
    },

    game(data) {
        console.log("Game info: " + data.game);
        if (data.game != "") {
            document.getElementById("gameInfo").classList.remove("noShow");
            document.getElementById("gameInfo").classList.add("fadeInElm");
            document.getElementById("gameInfo").innerHTML = data.game;
        } else {
            document.getElementById("gameInfo").classList.add("noShow");
            document.getElementById("gameInfo").classList.remove("fadeInElm");        
        }
    },

    color(data) {
        console.log("Player: " + data.player + " using color: " + data.color);
        if (data.player == "1") { document.getElementById("player" + data.player + "Name").style.background = "linear-gradient(to left, white, " + data.color; };
        if (data.player == "2") { document.getElementById("player" + data.player + "Name").style.background = "linear-gradient(to right, white, " + data.color; };
    },

    name(data) {
        console.log("Player/Team: " + data.player + " named " + data.name);
        if (!data.name == "") {
            document.getElementById("player" + data.player + "Name").innerHTML = data.name;
        } else {
            document.getElementById("player" + data.player + "Name").innerHTML = "Player " + data.player;
        }
    },

    playerDisplay(data) {
        // Code to assist with displaying active player image when only two players are enabled, on reload.
        const player1Enabled = "yes"
        const player2Enabled = "yes"
        const bothPlayersEnabled = true
        const playerToggleEnabled = false
        const useclockEnabled = false

        console.log(`Player States in playerDisplay:`, {
            player1Enabled,
            player2Enabled,
            bothPlayersEnabled,
            playerToggleEnabled,
            useclockEnabled,
            rawPlayer1: getStorageItem("usePlayer1"),
            rawPlayer2: getStorageItem("usePlayer2")
        });
               
        if (data.playerDisplay == "showPlayer") {
            // Check if both players are enabled before fading in the player images
            if (bothPlayersEnabled && playerToggleEnabled) {
                const activePlayer = getStorageItem("activePlayer");
                console.log(`Show player ${activePlayer} as active`);
                document.getElementById("player1Image").classList.replace(activePlayer === "1" ? "fadeOutElm" : "fadeInElm", activePlayer === "1" ? "fadeInElm" : "fadeOutElm");
                document.getElementById("player2Image").classList.replace(activePlayer === "2" ? "fadeOutElm" : "fadeInElm", activePlayer === "2" ? "fadeInElm" : "fadeOutElm");
            }
            if (player1Enabled && getStorageItem("useCustomLogo")=="yes") {
                document.getElementById("customLogo1").classList.replace("fadeOutElm", "fadeInElm");
            }
            if (player2Enabled && getStorageItem("useCustomLogo2")=="yes") {
                document.getElementById("customLogo2").classList.replace("fadeOutElm", "fadeInElm");
            }
            if (bothPlayersEnabled && getStorageItem("raceInfo") && getStorageItem("scoreDisplay") === "yes") {
                document.getElementById("raceInfo").classList.replace("fadeOutElm", "fadeInElm");
            }

            showPlayer(data.playerNumber);

            // Add a small delay to check after showPlayer has completed
            setTimeout(() => {
                // Debug logs
                console.log("Display player 1:", getStorageItem("usePlayer1"));
                console.log("Display player 2:", getStorageItem("usePlayer2"));
                if (getStorageItem("usePlayer1") === "yes" && getStorageItem("usePlayer2") === "yes" && getStorageItem("scoreDisplay") === "yes") {
                    console.log("Both players enabled, so scores are enabled");
                    showScores();
                } else {
                    console.log("Not all players enabled, scores remain hidden");
                }
            }, 50); // Small delay to ensure localStorage is updated
        };

    },

    scoreDisplay(data) {
        if (data.scoreDisplay == "yes") {
            showScores();
        } else {
            hideScores();
        }
    },

    toggle(data) {
        // Check if the message contains a 'toggle' property
        if (data.toggle) {
            const elementId = data.toggle;
            // Find the element on this page with the corresponding id
            const elementToToggle = document.getElementById(elementId);
            if (elementToToggle) {
                // Toggle the 'faded' class on this element
                elementToToggle.classList.toggle('faded');
                console.log('Toggled element with id:', elementId, 'on browser_source.html');
            } else {
                console.log('Element with id', elementId, 'not found on browser_source.html');
            }
        }
    },
 
};

// Main event handler
bc.onmessage = (event) => {
    console.log('Received event data:', event.data);

    // Process each property in the event data
    Object.entries(event.data).forEach(([key, value]) => {
        if (value != null && handlers[key]) {
            handlers[key](event.data);
        }
    });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			
//							autostart stuff
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

$(document).ready(function() {
    // Initialize draggable elements
    $("#scoreBoard").draggable();
    $("#gameInfo").draggable();
    $("#logoSlideshowDiv").draggable();
	$("#ballTracker").draggable();

});

// Setting defaults in storage so functions execute correctly, in the event values are not being retrieved from storage successfully due to initialization or similar
if (getStorageItem("usePlayer1") === null) {
    setStorageItem("usePlayer1", "yes");
}
if (getStorageItem("usePlayer2") === null) {
    setStorageItem("usePlayer2", "yes");
}
if (getStorageItem("usePlayerToggle") === null) {
    setStorageItem("usePlayerToggle", "yes");
}
if (getStorageItem("activePlayer") === null) {
    setStorageItem("activePlayer", "1");
}

if (getStorageItem("poolStat") === null) {
    setStorageItem("poolStat", "yes");
}

setCustomLogo("customLogo1", "useCustomLogo", "usePlayer1");
setCustomLogo("customLogo2", "useCustomLogo2", "usePlayer2");

if (getStorageItem("p1NameCtrlPanel") != "" || getStorageItem("p1NameCtrlPanel") != null) {
	document.getElementById("player1Name").innerHTML = getStorageItem("p1NameCtrlPanel");
}
if (getStorageItem("p1NameCtrlPanel") == "" || getStorageItem("p1NameCtrlPanel") == null) {
	document.getElementById("player1Name").innerHTML = " ";
}

if (getStorageItem("p2NameCtrlPanel") != "" || getStorageItem("p2NameCtrlPanel") != null) {
	document.getElementById("player2Name").innerHTML = getStorageItem("p2NameCtrlPanel");
}
if (getStorageItem("p2NameCtrlPanel") == "" || getStorageItem("p2NameCtrlPanel") == null) {
	document.getElementById("player2Name").innerHTML = " ";
}

// Code to assist with displaying active player image when only two players are enabled, on reload.
const player1Enabled = getStorageItem("usePlayer1") === "yes";
const player2Enabled = getStorageItem("usePlayer2") === "yes";
const bothPlayersEnabled = player1Enabled && player2Enabled;
const playerToggleEnabled = getStorageItem("usePlayerToggle") === "yes";

// Add debug logging
console.log('Player States:', {
    player1Enabled,
    player2Enabled,
    bothPlayersEnabled,
    playerToggleEnabled,
    usePlayer1: getStorageItem("usePlayer1"),
    usePlayer2: getStorageItem("usePlayer2"),
    usePlayerToggle: getStorageItem("usePlayerToggle"),
    activePlayer: getStorageItem("activePlayer")
});

// Ensure we have valid values
if (player1Enabled === null || player2Enabled === null) {
    console.warn('Player states not properly initialized, reinitializing defaults');
    initializeDefaults();
    // Recheck values after initialization
    const player1Enabled = getStorageItem("usePlayer1") === "yes";
    const player2Enabled = getStorageItem("usePlayer2") === "yes";
    const bothPlayersEnabled = player1Enabled && player2Enabled;
    const playerToggleEnabled = getStorageItem("usePlayerToggle") === "yes";
}

if (bothPlayersEnabled && playerToggleEnabled) {
    const activePlayer = getStorageItem("activePlayer");
    console.log(`Show player image in autostart condition. PlayerToggle: ${playerToggleEnabled}. Players both enabled: ${bothPlayersEnabled}`);
    // Show active player image, hide inactive player image
    if (activePlayer === "1") {
        document.getElementById("player1Image").classList.remove("fadeOutElm");
        document.getElementById("player1Image").classList.add("fadeInElm");
        document.getElementById("player2Image").classList.remove("fadeInElm");
        document.getElementById("player2Image").classList.add("fadeOutElm");
    } else {
        document.getElementById("player1Image").classList.remove("fadeInElm");
        document.getElementById("player1Image").classList.add("fadeOutElm");
        document.getElementById("player2Image").classList.remove("fadeOutElm");
        document.getElementById("player2Image").classList.add("fadeInElm");
    }
} else {
    // Hide both players if not enabled
    document.getElementById("player1Image").classList.remove("fadeInElm");
    document.getElementById("player1Image").classList.add("fadeOutElm");
    document.getElementById("player2Image").classList.remove("fadeInElm");
    document.getElementById("player2Image").classList.add("fadeOutElm");
}

if (getStorageItem("p1ScoreCtrlPanel") != null && getStorageItem("usePoolStat") != "yes") {
	document.getElementById("player1Score").innerHTML = getStorageItem("p1ScoreCtrlPanel");
} else {
    if (getStorageItem("usePoolStat") != "yes") {
	    document.getElementById("player1Score").innerHTML = 0;
    }
}


if (getStorageItem("p2ScoreCtrlPanel") != null && getStorageItem("usePoolStat") != "yes") {
	document.getElementById("player2Score").innerHTML = getStorageItem("p2ScoreCtrlPanel");
} else {
    if (getStorageItem("usePoolStat") != "yes") {
    	document.getElementById("player2Score").innerHTML = 0;
    }
}

if (getStorageItem("gameInfo") != "" ) {
	document.getElementById("gameInfo").classList.remove("noShow");
    document.getElementById("gameInfo").classList.add("fadeInElm");
    document.getElementById("gameInfo").innerHTML = getStorageItem("gameInfo");
} else {
    document.getElementById("gameInfo").classList.add("noShow");
    document.getElementById("gameInfo").classList.remove("fadeInElm");
}


if (getStorageItem("raceInfo") != "" && getStorageItem("raceInfo") != null && bothPlayersEnabled && getStorageItem("scoreDisplay") === "yes") {
	document.getElementById("raceInfo").classList.remove("noShow");
	document.getElementById("raceInfo").classList.add("fadeInElm");
    document.getElementById("raceInfo").innerHTML = getStorageItem("raceInfo");
    
	document.getElementById("customLogo1").classList.add("customLogoWide1");
	document.getElementById("customLogo2").classList.add("customLogoWide2");
}

function updateIconsVisibility(show) {
    const action = show ? "fadeInElm" : "fadeOutElm";
    document.getElementById("p1ExtIcon").classList.replace(show ? "fadeOutElm" : "fadeInElm", action);
    document.getElementById("p2ExtIcon").classList.replace(show ? "fadeOutElm" : "fadeInElm", action);
}

if (getStorageItem("useClock") == "yes" && bothPlayersEnabled) {
    console.log("Icons shown due to conditions met.");
    updateIconsVisibility(true);
} else {
    console.log("Icons not shown due to conditions not met.");
    updateIconsVisibility(false);
}

if (getStorageItem(("usePlayer1")) != "yes") {
	document.getElementById("player1Name").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("player1Score").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("player2Score").classList.replace("fadeInElm", "fadeOutElm");
}
if (getStorageItem(("usePlayer2")) != "yes") {
	document.getElementById("player2Name").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("player1Score").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("player2Score").classList.replace("fadeInElm", "fadeOutElm");
}

if (getStorageItem('p1colorSet') != "") {
	document.getElementById("player1Name").style.background = "linear-gradient(to left, white, " + getStorageItem('p1colorSet');
	console.log("p1color: " + getStorageItem('p1colorSet'));
}
if (getStorageItem('p2colorSet') != "") {
	document.getElementById("player2Name").style.background = "linear-gradient(to right, white, " + getStorageItem('p2colorSet');
	console.log("p2color: " + getStorageItem('p2colorSet'));
}


function setCustomLogo(logoId, useCustomLogoKey, usePlayerKey) {
    if (getStorageItem(logoId) !== null && getStorageItem(logoId) !== "") {
        document.getElementById(logoId).src = getStorageItem(logoId);
        if (getStorageItem(useCustomLogoKey) === "yes" && getStorageItem(usePlayerKey) === "yes") {
            document.getElementById(logoId).classList.replace("fadeOutElm", "fadeInElm");
        }
    } else {
        document.getElementById(logoId).src = "./common/images/placeholder.png";
    }
}

// Call the initialization function on window load
window.addEventListener("load", initializeBrowserSourceExtensionStatus);


// Add this function to initialize and update the player extension button styling
function initializeBrowserSourceExtensionStatus() {
    // Get the extension icon elements for player 1 and 2
    let p1ExtIcon = document.getElementById("p1ExtIcon");
    let p2ExtIcon = document.getElementById("p2ExtIcon");

    // Check localStorage for stored extension status values
    // (Assuming you set "playerExtension1" and "playerExtension2" to "enabled" when active)
    let extStatus1 = getStorageItem("p1Extension");
    let extStatus2 = getStorageItem("p2Extension");

    // Update styling for Player 1's extension element
    if (p1ExtIcon) {
        if (extStatus1 && extStatus1 === "enabled") {
            // p1ExtIcon.textContent = "Reset";
            p1ExtIcon.style.backgroundColor = "darkred";
            p1ExtIcon.style.color = "white";
        } else {
            // p1ExtIcon.textContent = "Extend";
            p1ExtIcon.style.backgroundColor = "";
            p1ExtIcon.style.color = "";
        }
    }
    
    // Update styling for Player 2's extension element
    if (p2ExtIcon) {
        if (extStatus2 && extStatus2 === "enabled") {
            // p2ExtIcon.textContent = "Reset";
            p2ExtIcon.style.backgroundColor = "darkred";
            p2ExtIcon.style.color = "white";
        } else {
            // p2ExtIcon.textContent = "Extend";
            p2ExtIcon.style.backgroundColor = "";
            p2ExtIcon.style.color = "";
        }
    }
}