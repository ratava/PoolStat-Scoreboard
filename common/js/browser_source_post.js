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
const tickerMessageArray = [];

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

    raceInfo(data) {
        console.log("Race Info data: " + data.raceInfo);
        if (data.raceInfo.useRaceInfo === "true") { //enabled
            document.getElementById("raceInfo").classList.remove("noShow");
        } else {
            document.getElementById("raceInfo").classList.add("noShow");
        }
        document.getElementById("raceInfo").style.left = data.raceInfo.raceInfoLeftTxt;
        document.getElementById("raceInfo").style.top = data.raceInfo.raceInfoTopTxt;
        document.getElementById("raceInfo").style.height = data.raceInfo.raceInfoHeightTxt;
        document.getElementById("raceInfo").style.width = data.raceInfo.raceInfoWidthTxt;
        document.getElementById("raceInfo").style.fontSize = data.raceInfo.raceInfoFontTxt;
        if (data.raceInfo.raceInfoBGNoneCB === "true") { // no background
            document.getElementById("raceInfo").style.backgroundColor = '';
            document.getElementById("raceInfo").style.border = 'none';
            document.getElementById("raceInfo").style.boxShadow = 'none';
            document.getElementById("raceInfo").style.textShadow = 'none';
        } else {
            document.getElementById("raceInfo").style.backgroundColor = data.raceInfo.raceInfoBGTxt;
        }
        document.getElementById("raceInfo").style.color = data.raceInfo.raceInfoFGTxt;
        document.getElementById("raceInfo").style.cssText = document.getElementById("raceInfo").style.cssText + " " + data.raceInfo.raceInfoCSSTxt;
    },

    gameInfo(data) {
        console.log("Game Info data: " + data.gameInfo);
        if (data.gameInfo.useGameInfo === "true") { //enabled
            document.getElementById("gameInfo").classList.remove("noShow");
        } else {
            document.getElementById("gameInfo").classList.add("noShow");
        }
        document.getElementById("gameInfo").style.left = data.gameInfo.gameInfoLeftTxt;
        document.getElementById("gameInfo").style.top = data.gameInfo.gameInfoTopTxt;
        document.getElementById("gameInfo").style.height = data.gameInfo.gameInfoHeightTxt;
        document.getElementById("gameInfo").style.width = data.gameInfo.gameInfoWidthTxt;        
        document.getElementById("gameInfo").style.fontSize = data.gameInfo.gameInfoFontTxt;
        if (data.gameInfo.gameInfoLeftTxt === "true") { // no background
            document.getElementById("gameInfo").style.backgroundColor = '';
            document.getElementById("gameInfo").style.border = 'none';
            document.getElementById("gameInfo").style.boxShadow = 'none';
            document.getElementById("gameInfo").style.textShadow = 'none';
        } else {
            document.getElementById("gameInfo").style.backgroundColor = data.gameInfo.gameInfoBGTxt;
        }
        document.getElementById("gameInfo").style.color = data.gameInfo.gameInfoFGTxt;
        document.getElementById("gameInfo").style.cssText = document.getElementById("gameInfo").style.cssText + " " + data.gameInfo.gameInfoCSSTxt;
    },

    ticker(data) {
        console.log("Ticker data: " + data.ticker);
        if (data.ticker.usePoolStatTicker === "true") { //enabled
            document.getElementById("ticker").classList.remove("noShow");
        } else {
            document.getElementById("ticker").classList.add("noShow");
        }
        document.getElementById("ticker").style.left = data.ticker.tickerLeftTxt;
        document.getElementById("ticker").style.top = data.ticker.tickerTopTxt;
        document.getElementById("ticker").style.height = data.ticker.tickerHeightTxt;
        document.getElementById("ticker").style.width = data.ticker.tickerWidthTxt;
        document.getElementById("ticker").style.fontSize = data.ticker.tickerFontTxt;
        if (data.ticker.tickerLeftTxt === "true") { // no background
            document.getElementById("ticker").style.backgroundColor = '';
            document.getElementById("ticker").style.border = 'none';
            document.getElementById("ticker").style.boxShadow = 'none';
            document.getElementById("ticker").style.textShadow = 'none';

        } else {
            document.getElementById("ticker").style.backgroundColor = data.ticker.tickerBGTxt;
        }
        document.getElementById("ticker").style.color = data.ticker.tickerFGTxt;
        document.getElementById("ticker").style.cssText = document.getElementById("ticker").style.cssText + " " + data.ticker.tickerCSSTxt;
    },

    hpName(data) {
        console.log("HP Name data: " + data.hpName);
        document.getElementById("hpName").style.left = data.hpName.hpNameLeftTxt;
        document.getElementById("hpName").style.top = data.hpName.hpNameTopTxt;
        document.getElementById("hpName").style.height = data.hpName.hpNameHeightTxt;
        document.getElementById("hpName").style.width = data.hpName.hpNameWidthTxt;        
        document.getElementById("hpName").style.fontSize = data.hpName.hpNameFontTxt;
        if (data.hpName.hpNameBGNoneCB === "true") { // no background
            document.getElementById("hpName").style.backgroundColor = '';
            document.getElementById("hpName").style.backgroundImage = '';
            document.getElementById("hpName").style.border = 'none';
            document.getElementById("hpName").style.boxShadow = 'none';
            document.getElementById("hpName").style.textShadow = 'none';
        } else {
            document.getElementById("hpName").style.backgroundColor = data.hpName.hpNameBGTxt;
        }
        if (data.hpName.hpNameBGGradientCB === "true") { // gradient
            document.getElementById("hpName").style.backgroundColor = '';
            document.getElementById("hpName").style.backgroundImage = `linear-gradient(to left, white, ${data.hpName.hpNameBGTxt})`;
        }
        document.getElementById("hpName").style.color = data.hpName.hpNameFGTxt;
        document.getElementById("hpName").style.cssText = document.getElementById("hpName").style.cssText + " " + data.hpName.hpNameCSSTxt;
    },

    apName(data) {
        console.log("AP Name data: " + data.apName);
        document.getElementById("apName").style.right = data.apName.apNameLeftTxt;
        document.getElementById("apName").style.top = data.apName.apNameTopTxt;
        document.getElementById("apName").style.height = data.apName.apNameHeightTxt;
        document.getElementById("apName").style.width = data.apName.apNameWidthTxt;
        document.getElementById("apName").style.fontSize = data.apName.apNameFontTxt;
        if (data.apName.apNameBGNoneCB === "true") { // no background
            document.getElementById("apName").style.backgroundColor = '';
            document.getElementById("apName").style.backgroundImage = '';
            document.getElementById("apName").style.border = 'none';
            document.getElementById("apName").style.boxShadow = 'none';
            document.getElementById("apName").style.textShadow = 'none';
        } else {
            document.getElementById("apName").style.backgroundColor = data.apName.apNameBGTxt;
        }
        if (data.apName.apNameBGGradientCB === "true") { // gradient
            document.getElementById("apName").style.backgroundColor = '';
            document.getElementById("apName").style.backgroundImage = `linear-gradient(to right, white, ${data.apName.apNameBGTxt})`;
        }
        document.getElementById("apName").style.color = data.apName.apNameFGTxt;
        document.getElementById("apName").style.cssText = document.getElementById("apName").style.cssText + " " + data.apName.apNameCSSTxt;
    },

    hpScore(data) {
        console.log("HP Score data: " + data.hpScore);
        document.getElementById("hpScore").style.left = data.hpScore.hpScoreLeftTxt;
        document.getElementById("hpScore").style.top = data.hpScore.hpScoreTopTxt;
        document.getElementById("hpScore").style.height = data.hpScore.hpScoreHeightTxt;
        document.getElementById("hpScore").style.width = data.hpScore.hpScoreWidthTxt;
        document.getElementById("hpScore").style.fontSize = data.hpScore.hpScoreFontTxt;
        if (data.hpScore.hpScoreBGNoneCB === "true") { // no background
            document.getElementById("hpScore").style.backgroundColor = '';
            document.getElementById("hpScore").style.border = 'none';
            document.getElementById("hpScore").style.boxShadow = 'none';
            document.getElementById("hpScore").style.textShadow = 'none';
        } else {
            document.getElementById("hpScore").style.backgroundColor = data.hpScore.hpScoreBGTxt;
        }
        document.getElementById("hpScore").style.color = data.hpScore.hpScoreFGTxt;
        document.getElementById("hpScore").style.cssText = document.getElementById("hpScore").style.cssText + " " + data.hpScore.hpScoreCSSTxt;
    },
    
    apScore(data) {
        console.log("AP Score data: " + data.apScore);
        document.getElementById("apScore").style.right = data.apScore.apScoreLeftTxt;
        document.getElementById("apScore").style.top = data.apScore.apScoreTopTxt;
        document.getElementById("apScore").style.height = data.apScore.apScoreHeightTxt;
        document.getElementById("apScore").style.width = data.apScore.apScoreWidthTxt;
        document.getElementById("apScore").style.fontSize = data.apScore.apScoreFontTxt;
        if (data.apScore.apScoreBGNoneCB === "true") { // no background
            document.getElementById("apScore").style.backgroundColor = '';
            document.getElementById("apScore").style.border = 'none';
            document.getElementById("apScore").style.boxShadow = 'none';
            document.getElementById("apScore").style.textShadow = 'none';            
        } else {
            document.getElementById("apScore").style.backgroundColor = data.apScore.apScoreBGTxt;
        }
        document.getElementById("apScore").style.color = data.apScore.apScoreFGTxt;
        document.getElementById("apScore").style.cssText = document.getElementById("apScore").style.cssText + " " + data.apScore.apScoreCSSTxt;
    },

    hpImage(data) {
        console.log("HP Image data: " + data.hpImage);
        document.getElementById("hpImage").style.left = data.hpImage.hpImageLeftTxt;
        document.getElementById("hpImage").style.top = data.hpImage.hpImageTopTxt;
        document.getElementById("hpImage").style.height = data.hpImage.hpImageHeightTxt;
        document.getElementById("hpImage").style.width = data.hpImage.hpImageWidthTxt;
        document.getElementById("hpImage").style.cssText = document.getElementById("hpImage").style.cssText + " " + data.hpImage.hpImageCSSTxt;
    },
    
    apImage(data) {
        console.log("HP Image data: " + data.apImage);
        document.getElementById("apImage").style.right = data.apImage.apImageLeftTxt;
        document.getElementById("apImage").style.top = data.apImage.apImageTopTxt;
        document.getElementById("apImage").style.height = data.apImage.apImageHeightTxt;
        document.getElementById("apImage").style.width = data.apImage.apImageWidthTxt;
        document.getElementById("apImage").style.cssText = document.getElementById("apImage").style.cssText + " " + data.apImage.apImageCSSTxt;
    },

    
    score(data) {
        console.log(`Player: ${data.player}, Score: ${data.score}`);
        if (data.player == 1) {data.player = "hpScore";}
        if (data.player == 2) {data.player = "apScore";}
        const scoreElement = document.getElementById(data.player);
        // if (data.score > scoreElement.innerHTML) {
        //     scoreElement.innerHTML = data.score;
        //     scoreElement.classList.add("winBlink");
        //     scoreElement.textContent = data.score;
        //     setTimeout("clearWinBlink()", 500);
        // } else {
            scoreElement.innerHTML = data.score;
        // }
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

    name(data) {
        console.log("Player/Team: " + data.player + " named " + data.name);
        if (data.player == 1) {data.player = "hpName";}
        if (data.player == 2) {data.player = "apName";}
        if (data.name === null || data.name === undefined) {console.log('foobar'); data.name = " "};
        document.getElementById(data.player).innerHTML = data.name;
    },

    playerDisplay(data) {
        // Code to assist with displaying active player image when only two players are enabled, on reload.
        // const player1Enabled = "yes"
        // const player2Enabled = "yes"
        // const bothPlayersEnabled = true
        // const playerToggleEnabled = false
        // const useclockEnabled = false

        // console.log(`Player States in playerDisplay:`, {
        //     player1Enabled,
        //     player2Enabled,
        //     bothPlayersEnabled,
        //     playerToggleEnabled,
        //     useclockEnabled,
        //     rawPlayer1: getStorageItem("usePlayer1"),
        //     rawPlayer2: getStorageItem("usePlayer2")
        // });
               
        // if (data.playerDisplay == "showPlayer") {
        //     // Check if both players are enabled before fading in the player images
        //     if (bothPlayersEnabled && playerToggleEnabled) {
        //         const activePlayer = getStorageItem("activePlayer");
        //         console.log(`Show player ${activePlayer} as active`);
        //         document.getElementById("player1Image").classList.replace(activePlayer === "1" ? "fadeOutElm" : "fadeInElm", activePlayer === "1" ? "fadeInElm" : "fadeOutElm");
        //         document.getElementById("player2Image").classList.replace(activePlayer === "2" ? "fadeOutElm" : "fadeInElm", activePlayer === "2" ? "fadeInElm" : "fadeOutElm");
        //     }
        //     if (player1Enabled && getStorageItem("useCustomLogo")=="yes") {
        //         document.getElementById("customLogo1").classList.replace("fadeOutElm", "fadeInElm");
        //     }
        //     if (player2Enabled && getStorageItem("useCustomLogo2")=="yes") {
        //         document.getElementById("customLogo2").classList.replace("fadeOutElm", "fadeInElm");
        //     }
        //     if (bothPlayersEnabled && getStorageItem("raceInfo") && getStorageItem("scoreDisplay") === "yes") {
        //         document.getElementById("raceInfo").classList.replace("fadeOutElm", "fadeInElm");
        //     }

        //     showPlayer(data.playerNumber);

        //     // Add a small delay to check after showPlayer has completed
        //     setTimeout(() => {
        //         // Debug logs
        //         console.log("Display player 1:", getStorageItem("usePlayer1"));
        //         console.log("Display player 2:", getStorageItem("usePlayer2"));
        //         if (getStorageItem("usePlayer1") === "yes" && getStorageItem("usePlayer2") === "yes" && getStorageItem("scoreDisplay") === "yes") {
        //             console.log("Both players enabled, so scores are enabled");
        //             showScores();
        //         } else {
        //             console.log("Not all players enabled, scores remain hidden");
        //         }
        //     }, 50); // Small delay to ensure localStorage is updated
        // };

    },

    scoreDisplay(data) {
        // if (data.scoreDisplay == "yes") {
        //     showScores();
        // } else {
        //     hideScores();
        // }
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

    tickerMessage(data) {
        console.log('a ' + data);
        tickerMessageArray.push(data.tickerMessage);
        console.log(tickerMessageArray)

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
    
    bcr.postMessage({"refresh":"now"});

});

function clearTicker() {
    document.getElementById("ticker").classList.remove("fadeInElm");
    document.getElementById("ticker").classList.add("fadeOutElm");
    document.getElementById("tickerContent").innerHTML = "";    
}

function displayTickerMessage() {
    while (tickerMessageArray.length > 0) {
        var message = tickerMessageArray.shift();
        document.getElementById("ticker").classList.remove("fadeOutElm");
        document.getElementById("ticker").classList.add("fadeInElm");
        document.getElementById("tickerContent").insertAdjacentHTML('beforeend',message);
        setTimeout(clearTicker, 7000)

    }
}
setInterval(displayTickerMessage, 7500);
    

// Setting defaults in storage so functions execute correctly, in the event values are not being retrieved from storage successfully due to initialization or similar
// if (getStorageItem("usePlayer1") === null) {
//     setStorageItem("usePlayer1", "yes");
// }
// if (getStorageItem("usePlayer2") === null) {
//     setStorageItem("usePlayer2", "yes");
// }
// if (getStorageItem("usePlayerToggle") === null) {
//     setStorageItem("usePlayerToggle", "yes");
// }
// if (getStorageItem("activePlayer") === null) {
//     setStorageItem("activePlayer", "1");
// }

// if (getStorageItem("poolStat") === null) {
//     setStorageItem("poolStat", "yes");
// }

// setCustomLogo("customLogo1", "useCustomLogo", "usePlayer1");
// setCustomLogo("customLogo2", "useCustomLogo2", "usePlayer2");

if (getStorageItem("p1NameCtrlPanel") != "" || getStorageItem("p1NameCtrlPanel") != null) {
	document.getElementById("hpName").innerHTML = getStorageItem("p1NameCtrlPanel");
}
if (getStorageItem("p1NameCtrlPanel") == "" || getStorageItem("p1NameCtrlPanel") == null) {
	document.getElementById("hpName").innerHTML = " ";
}

if (getStorageItem("p2NameCtrlPanel") != "" || getStorageItem("p2NameCtrlPanel") != null) {
	document.getElementById("apName").innerHTML = getStorageItem("p2NameCtrlPanel");
}
if (getStorageItem("p2NameCtrlPanel") == "" || getStorageItem("p2NameCtrlPanel") == null) {
	document.getElementById("apName").innerHTML = " ";
}

// Code to assist with displaying active player image when only two players are enabled, on reload.
// const player1Enabled = getStorageItem("usePlayer1") === "yes";
// const player2Enabled = getStorageItem("usePlayer2") === "yes";
// const bothPlayersEnabled = player1Enabled && player2Enabled;
// const playerToggleEnabled = getStorageItem("usePlayerToggle") === "yes";

// // Add debug logging
// console.log('Player States:', {
//     player1Enabled,
//     player2Enabled,
//     bothPlayersEnabled,
//     playerToggleEnabled,
//     usePlayer1: getStorageItem("usePlayer1"),
//     usePlayer2: getStorageItem("usePlayer2"),
//     usePlayerToggle: getStorageItem("usePlayerToggle"),
//     activePlayer: getStorageItem("activePlayer")
// });

// // Ensure we have valid values
// if (player1Enabled === null || player2Enabled === null) {
//     console.warn('Player states not properly initialized, reinitializing defaults');
//     initializeDefaults();
//     // Recheck values after initialization
//     const player1Enabled = getStorageItem("usePlayer1") === "yes";
//     const player2Enabled = getStorageItem("usePlayer2") === "yes";
//     const bothPlayersEnabled = player1Enabled && player2Enabled;
//     const playerToggleEnabled = getStorageItem("usePlayerToggle") === "yes";
// }

// if (bothPlayersEnabled && playerToggleEnabled) {
//     const activePlayer = getStorageItem("activePlayer");
//     console.log(`Show player image in autostart condition. PlayerToggle: ${playerToggleEnabled}. Players both enabled: ${bothPlayersEnabled}`);
//     // Show active player image, hide inactive player image
//     if (activePlayer === "1") {
//         document.getElementById("player1Image").classList.remove("fadeOutElm");
//         document.getElementById("player1Image").classList.add("fadeInElm");
//         document.getElementById("player2Image").classList.remove("fadeInElm");
//         document.getElementById("player2Image").classList.add("fadeOutElm");
//     } else {
//         document.getElementById("player1Image").classList.remove("fadeInElm");
//         document.getElementById("player1Image").classList.add("fadeOutElm");
//         document.getElementById("player2Image").classList.remove("fadeOutElm");
//         document.getElementById("player2Image").classList.add("fadeInElm");
//     }
// } else {
//     // Hide both players if not enabled
//     document.getElementById("player1Image").classList.remove("fadeInElm");
//     document.getElementById("player1Image").classList.add("fadeOutElm");
//     document.getElementById("player2Image").classList.remove("fadeInElm");
//     document.getElementById("player2Image").classList.add("fadeOutElm");
// }

if (getStorageItem("p1ScoreCtrlPanel") != null && getStorageItem("usePoolStat") != "yes") {
	document.getElementById("hpScore").innerHTML = getStorageItem("p1ScoreCtrlPanel");
} else {
    if (getStorageItem("usePoolStat") != "yes") {
	    document.getElementById("hpScore").innerHTML = 0;
    }
}


if (getStorageItem("p2ScoreCtrlPanel") != null && getStorageItem("usePoolStat") != "yes") {
	document.getElementById("apScore").innerHTML = getStorageItem("p2ScoreCtrlPanel");
} else {
    if (getStorageItem("usePoolStat") != "yes") {
    	document.getElementById("apScore").innerHTML = 0;
    }
}

// if (getStorageItem("gameInfo") != "" ) {
// 	document.getElementById("gameInfo").classList.remove("noShow");
//     document.getElementById("gameInfo").classList.add("fadeInElm");
//     document.getElementById("gameInfo").innerHTML = getStorageItem("gameInfo");
// } else {
//     document.getElementById("gameInfo").classList.add("noShow");
//     document.getElementById("gameInfo").classList.remove("fadeInElm");
// }


// if (getStorageItem("raceInfo") != "" && getStorageItem("raceInfo") != null && bothPlayersEnabled && getStorageItem("scoreDisplay") === "yes") {
// 	document.getElementById("raceInfo").classList.remove("noShow");
// 	document.getElementById("raceInfo").classList.add("fadeInElm");
//     document.getElementById("raceInfo").innerHTML = getStorageItem("raceInfo");
// }

// function updateIconsVisibility(show) {
//     const action = show ? "fadeInElm" : "fadeOutElm";
//     document.getElementById("p1ExtIcon").classList.replace(show ? "fadeOutElm" : "fadeInElm", action);
//     document.getElementById("p2ExtIcon").classList.replace(show ? "fadeOutElm" : "fadeInElm", action);
// }

// if (getStorageItem(("usePlayer1")) != "yes") {
// 	document.getElementById("player1Name").classList.replace("fadeInElm", "fadeOutElm");
// 	document.getElementById("player1Score").classList.replace("fadeInElm", "fadeOutElm");
// 	document.getElementById("player2Score").classList.replace("fadeInElm", "fadeOutElm");
// }
// if (getStorageItem(("usePlayer2")) != "yes") {
// 	document.getElementById("player2Name").classList.replace("fadeInElm", "fadeOutElm");
// 	document.getElementById("player1Score").classList.replace("fadeInElm", "fadeOutElm");
// 	document.getElementById("player2Score").classList.replace("fadeInElm", "fadeOutElm");
// }

// if (getStorageItem('p1colorSet') != "") {
// 	document.getElementById("player1Name").style.background = "linear-gradient(to left, white, " + getStorageItem('p1colorSet');
// }
// if (getStorageItem('p2colorSet') != "") {
// 	document.getElementById("player2Name").style.background = "linear-gradient(to right, white, " + getStorageItem('p2colorSet');
// }


// function setCustomLogo(logoId, useCustomLogoKey, usePlayerKey) {
//     if (getStorageItem(logoId) !== null && getStorageItem(logoId) !== "") {
//         document.getElementById(logoId).src = getStorageItem(logoId);
//         if (getStorageItem(useCustomLogoKey) === "yes" && getStorageItem(usePlayerKey) === "yes") {
//             document.getElementById(logoId).classList.replace("fadeOutElm", "fadeInElm");
//         }
//     } else {
//         document.getElementById(logoId).src = "./common/images/placeholder.png";
//     }
// }

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