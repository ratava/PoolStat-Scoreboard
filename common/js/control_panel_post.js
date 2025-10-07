'use strict';
// PoolStat Scoreboard is a modified version of CueSport Scoreboard by Iain Macleod which was based on g4Scoreboard. The purpose of this modification is to provide an OBS interface for
// PoolStat. A Pool scoring system used in Australia. Data is provided by a live screaming portal.

// CueSport Scoreboard for OBS version 2.3.0 Copyright 2025 Iain Macleod
// G4ScoreBoard addon for OBS version 1.6.1 Copyright 2022-2023 Norman Gholson IV
// https://g4billiards.com http://www.g4creations.com
// this is a purely javascript/html/css driven scoreboard system for OBS Studio
// free to use and modify and use as long as this copyright statment remains intact. 
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// variable declarations
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var cLogoName = "Player 1 Logo";  // 13 character limit. it will auto trim to 13 characters.
var cLogoName2 = "Player 2 Logo";
// Get instance from URL or use 'default'
const urlParams = new URLSearchParams(window.location.search);
const INSTANCE_ID = urlParams.get('instance') || '';
const bc = new BroadcastChannel(`main_${INSTANCE_ID}`);
const bcr = new BroadcastChannel(`recv_${INSTANCE_ID}`); // return channel from browser_source 
var hotkeyP1ScoreUp;
var hotkeyP1ScoreDown;
var hotkeyP2ScoreUp;
var hotkeyP2ScoreDown;
var hotkeyScoreReset;
var hotkeyP1Extension;
var hotkeyP2Extension;
var hotkey30Clock;
var hotkey60Clock;
var hotkeyStopClock;
var hotkeySwap;
var hotkeyPlayerToggle;
var hotkeyP1ScoreUpOld = hotkeyP1ScoreUp;
var hotkeyP2ScoreUpOld = hotkeyP2ScoreUp;
var hotkeyP1ScoreDownOld = hotkeyP1ScoreDown;
var hotkeyP2ScoreDownOld = hotkeyP2ScoreDown;
var hotkeyScoreResetOld = hotkeyScoreReset;
var hotkeyP1ExtensionOld = hotkeyP1Extension;
var hotkeyP2ExtensionOld = hotkeyP2Extension;
var hotkey30ClockOld = hotkey30Clock;
var hotkey60ClockOld = hotkey60Clock;
var hotkeyStopClockOld = hotkeyStopClock;
var hotkeySwapOld = hotkeySwap;
var hotkeyPlayerToggleOld = hotkeyPlayerToggle; // Track old state
var tev;
var p1ScoreValue;
var p2ScoreValue;
var warningBeep = new Audio("./common/sound/beep2.mp3");
var foulSound = new Audio("./common/sound/buzz.mp3");
var timerIsRunning;
var msg;
var msg2;
var racemsg;
var gamemsg;
var uiScalingSlider = document.getElementById("uiScaling")
var sliderUiScalingValue;
var slider = document.getElementById("scoreOpacity");
var sliderValue;
var countDownTime;
var shotClockxr = null;
var playerNumber;
var p1namemsg;
var p2namemsg;
var playerx;
var c1value;
var c2value;
var pColormsg;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// onload stuff
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function genPsRigId() {
    return 'xxxx-xxxx-xxxx'
    .replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, 
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

window.onload = function() {
	// Set local storage values if not previously configured
	if (getStorageItem("usePlayer1") === null) {
		setStorageItem("usePlayer1", "yes");
	}
	if (getStorageItem("usePlayer2") === null) {
		setStorageItem("usePlayer2", "yes");
	}
	
	if (getStorageItem("scoreDisplay") === null) {
		setStorageItem("scoreDisplay", "yes");
	}

	if (getStorageItem("useRaceInfo")==="true" || getStorageItem("useRaceInfo") === null) {
		document.getElementById("raceInfoEnableCB").checked = true;
		setStorageItem("useRaceInfo", "true");
	} else {
		document.getElementById("raceInfoEnableCB").checked = false;
		setStorageItem("useRaceInfo", "false");
	}
	
	if (getStorageItem("useGameInfo")==="true" || getStorageItem("useGameInfo") === null) {
		document.getElementById("gameInfoEnableCB").checked = true;
		setStorageItem("useGameInfo", "true");
	} else {
		document.getElementById("gameInfoEnableCB").checked = false;
		setStorageItem("useGameInfo", "false");
	}

	if (getStorageItem("usePoolStatTicker")==="true" || getStorageItem("usePoolStatTicker") === null) {
		document.getElementById("tickerEnableCB").checked = true;
		setStorageItem("usePoolStatTicker", "true");
	} else {
		document.getElementById("tickerEnableCB").checked = false;
		setStorageItem("usePoolStatTicker", "false");
	}
	
	if (getStorageItem("usePoolStatBreakingPlayer")==="true" || getStorageItem("usePoolStatBreakingPlayer") === null) {
		document.getElementById("bpEnableCB").checked = true;
		setStorageItem("usePoolStatBreakingPlayer", "true");
	} else {
		document.getElementById("bpEnableCB").checked = false;
		setStorageItem("usePoolStatBreakingPlayer", "false");
	}

	if (getStorageItem("p1Score") === null) {
		setStorageItem("p1Score", "0");
	}
	if (getStorageItem("p2Score") === null) {
		setStorageItem("p2Score", "0");
	}

	var savedOpacity = getStorageItem('overlayOpacity');
	if (savedOpacity) {
		document.getElementById('scoreOpacity').value = savedOpacity;
		document.getElementById('sliderValue').innerText = savedOpacity + '%'; // Update displayed value
	}

	var savedScaling = getStorageItem('uiScalingValue');
	if (savedScaling) {
		document.getElementById('uiScaling').value = savedScaling;
		document.getElementById('sliderUiScalingValue').innerText = savedScaling + '%'; // Update displayed value
	}

	if (getStorageItem("usePoolStatTicker") === null) {
		setStorageItem("usePoolStatTicker", "no");
		console.log ('PoolStat Ticker initalised')
	}

	if (getStorageItem("PoolStatRigId") === null) {
		const psRigId = genPsRigId();
		setStorageItem("PoolStatRigId", psRigId);
		console.log ('PoolStat Rig ID: ' + psRigId)
		document.getElementById("psRigId").textContent = psRigId;
	} else {
		console.log('PS Rig ID: ' + getStorageItem("PoolStatRigId"));
		document.getElementById("psRigIdTxt").textContent = getStorageItem("PoolStatRigId");
	}	
	
	intiializePositionConfig();
	// Initialize the logo and extension status for each logo (players + slideshow logos) and player
	console.log(`Instance: ${INSTANCE_ID}`)
};

function intiializePositionConfig() {
	const configArray = [
		"raceInfoLeftTxt",
		"raceInfoTopTxt",
		"raceInfoHeightTxt",
		"raceInfoWidthTxt",
		"raceInfoFontTxt",
		"raceInfoCSSTxt",
		"raceInfoFGTxt",
		"raceInfoBGTxt",
		"raceInfoBGNoneCB",
		"gameInfoLeftTxt",
		"gameInfoTopTxt",
		"gameInfoHeightTxt",
		"gameInfoWidthTxt",
		"gameInfoFontTxt",
		"gameInfoCSSTxt",
		"gameInfoFGTxt",
		"gameInfoBGTxt",
		"gameInfoBGNoneCB",
		"tickerLeftTxt",
		"tickerTopTxt",
		"tickerHeightTxt",
		"tickerWidthTxt",
		"tickerFontTxt",
		"tickerCSSTxt",
		"tickerFGTxt",
		"tickerBGTxt",
		"tickerBGNoneCB",
		"hpNameLeftTxt",
		"hpNameTopTxt",
		"hpNameHeightTxt",
		"hpNameWidthTxt",
		"hpNameFontTxt",
		"hpNameCSSTxt",
		"hpNameFGTxt",
		"hpNameBGTxt",
		"hpNameBGNoneCB",
		"hpNameBGGradientCB",
		"apNameLeftTxt",
		"apNameTopTxt",
		"apNameHeightTxt",
		"apNameWidthTxt",
		"apNameFontTxt",
		"apNameCSSTxt",
		"apNameFGTxt",
		"apNameBGTxt",
		"apNameBGNoneCB",
		"apNameBGGradientCB",
		"hpScoreLeftTxt",
		"hpScoreTopTxt",
		"hpScoreHeightTxt",
		"hpScoreWidthTxt",
		"hpScoreFontTxt",
		"hpScoreCSSTxt",
		"hpScoreFGTxt",
		"hpScoreBGTxt",
		"hpScoreBGNoneCB",
		"apScoreLeftTxt",
		"apScoreTopTxt",
		"apScoreHeightTxt",
		"apScoreWidthTxt",
		"apScoreFontTxt",
		"apScoreCSSTxt",
		"apScoreFGTxt",
		"apScoreBGTxt",
		"apScoreBGNoneCB"
	];

	configArray.forEach(function(item) {
		switch (item) {
			case "raceInfoLeftTxt":
				if (getStorageItem("raceInfoLeftTxt") == null) {setStorageItem("raceInfoLeftTxt", "340px")}
			case "raceInfoTopTxt":
				if (getStorageItem("raceInfoTopTxt") == null) {setStorageItem("raceInfoTopTxt", "20px")}
			case "raceInfoHeightTxt":
				if (getStorageItem("raceInfoHeightTxt") == null) {setStorageItem("raceInfoHeightTxt", "40px")}
			case "raceInfoFontTxt":
				if (getStorageItem("raceInfoFontTxt") == null) {setStorageItem("raceInfoFontTxt", "32px")}
			case "raceInfoCSSTxt":
				if (getStorageItem("raceInfoCSSTxt") == null) {setStorageItem("raceInfoCSSTxt", "")}
			case "raceInfoBGTxt":
				if (getStorageItem("raceInfoBGTxt") == null) {setStorageItem("raceInfoBGTxt", "#3679dd")}
			case "raceInfoBGNoneCB":
				if (getStorageItem("raceInfoBGNoneCB") == null) {setStorageItem("raceInfoBGNoneCB", "false")}
			case "gameInfoLeftTxt":
				if (getStorageItem("gameInfoLeftTxt") == null) {setStorageItem("gameInfoLeftTxt", "1580px")}
			case "gameInfoTopTxt":
				if (getStorageItem("gameInfoTopTxt") == null) {setStorageItem("gameInfoTopTxt", "20px")}
			case "gameInfoHeightTxt":
				if (getStorageItem("gameInfoHeightTxt") == null) {setStorageItem("gameInfoHeightTxt", "40px")}
			case "gameInfoFontTxt":
				if (getStorageItem("gameInfoFontTxt") == null) {setStorageItem("gameInfoFontTxt", "32px")}
			case "gameInfoCSSTxt":
				if (getStorageItem("gameInfoCSSTxt") == null) {setStorageItem("gameInfoCSSTxt", "")}
			case "gameInfoBGTxt":
				if (getStorageItem("gameInfoBGTxt") == null) {setStorageItem("gameInfoBGTxt", "#3679dd")}
			case "gameInfoBGNoneCB":
				if (getStorageItem("gameInfoBGNoneCB") == null) {setStorageItem("gameInfoBGNoneCB", "false")}
			case "tickerLeftTxt":
				if (getStorageItem("tickerLeftTxt") == null) {setStorageItem("tickerLeftTxt", "960px")}
			case "tickerTopTxt":
				if (getStorageItem("tickerTopTxt") == null) {setStorageItem("tickerTopTxt", "80px")}
			case "tickerHeightTxt":
				if (getStorageItem("tickerHeightTxt") == null) {setStorageItem("tickerHeightTxt", "40px")}
			case "tickerFontTxt":
				if (getStorageItem("tickerFontTxt") == null) {setStorageItem("tickerFontTxt", "32px")}
			case "tickerCSSTxt":
				if (getStorageItem("tickerCSSTxt") == null) {setStorageItem("tickerCSSTxt", "")}
			case "tickerBGTxt":
				if (getStorageItem("tickerBGTxt") == null) {setStorageItem("tickerBGTxt", "#3679dd")}
			case "tickerBGNoneCB":
				if (getStorageItem("tickerBGNoneCB") == null) {setStorageItem("tickerBGNoneCB", "false")}
			case "hpNameLeftTxt":
				if (getStorageItem("hpNameLeftTxt") == null) {setStorageItem("hpNameLeftTxt", "340px")}
			case "hpNameTopTxt":
				if (getStorageItem("hpNameTopTxt") == null) {setStorageItem("hpNameTopTxt", "1010px")}
			case "hpNameHeightTxt":
				if (getStorageItem("hpNameHeightTxt") == null) {setStorageItem("hpNameHeightTxt", "60px")}
			case "hpNameFontTxt":
				if (getStorageItem("hpNameFontTxt") == null) {setStorageItem("hpNameFontTxt", "32px")}
			case "hpNameCSSTxt":
				if (getStorageItem("hpNameCSSTxt") == null) {setStorageItem("hpNameCSSTxt", "")}
			case "hpNameBGTxt":
				if (getStorageItem("hpNameBGTxt") == null) {setStorageItem("hpNameBGTxt", "#f72696")}
			case "hpNameBGNoneCB":
				if (getStorageItem("hpNameBGNoneCB") == null) {setStorageItem("hpNameBGNoneCB", "false")}				
			case "hpNameBGGradientCB":
				if (getStorageItem("hpNameBGGradientCB") == null) {setStorageItem("hpNameBGGradientCB", "true")}				
			case "apNameLeftTxt":
				if (getStorageItem("apNameLeftTxt") == null) {setStorageItem("apNameLeftTxt", "1580px")}
			case "apNameTopTxt":
				if (getStorageItem("apNameTopTxt") == null) {setStorageItem("apNameTopTxt", "1010px")}
			case "apNameHeightTxt":
				if (getStorageItem("apNameHeightTxt") == null) {setStorageItem("apNameHeightTxt", "60px")}
			case "apNameFontTxt":
				if (getStorageItem("apNameFontTxt") == null) {setStorageItem("apNameFontTxt", "32px")}
			case "apNameCSSTxt":
				if (getStorageItem("apNameCSSTxt") == null) {setStorageItem("apNameCSSTxt", "")}
			case "apNameBGTxt":
				if (getStorageItem("apNameBGTxt") == null) {setStorageItem("apNameBGTxt", "#e7f708")}
			case "apNameBGNoneCB":
				if (getStorageItem("apNameBGNoneCB") == null) {setStorageItem("apNameBGNoneCB", "false")}				
			case "apNameBGGradientCB":
				if (getStorageItem("apNameBGGradientCB") == null) {setStorageItem("apNameBGGradientCB", "true")}		
			case "hpScoreLeftTxt":
				if (getStorageItem("hpScoreLeftTxt") == null) {setStorageItem("hpScoreLeftTxt", "910px")}
			case "hpScoreTopTxt":
				if (getStorageItem("hpScoreTopTxt") == null) {setStorageItem("hpScoreTopTxt", "1010px")}
			case "hpScoreHeightTxt":
				if (getStorageItem("hpScoreHeightTxt") == null) {setStorageItem("hpScoreHeightTxt", "40px")}
			case "hpScoreFontTxt":
				if (getStorageItem("hpScoreFontTxt") == null) {setStorageItem("hpScoreFontTxt", "32px")}
			case "hpScoreCSSTxt":
				if (getStorageItem("hpScoreCSSTxt") == null) {setStorageItem("hpScoreCSSTxt", "")}
			case "hpScoreBGTxt":
				if (getStorageItem("hpScoreBGTxt") == null) {setStorageItem("hpScoreBGTxt", "#f75555")}
			case "hpScoreBGNoneCB":
				if (getStorageItem("hpScoreBGNoneCB") == null) {setStorageItem("hpScoreBGNoneCB", "false")}		
			case "apScoreLeftTxt":
				if (getStorageItem("apScoreLeftTxt") == null) {setStorageItem("apScoreLeftTxt", "1040px")}
			case "apScoreTopTxt":
				if (getStorageItem("apScoreTopTxt") == null) {setStorageItem("apScoreTopTxt", "1010px")}
			case "apScoreHeightTxt":
				if (getStorageItem("apScoreHeightTxt") == null) {setStorageItem("apScoreHeightTxt", "80px")}
			case "apScoreFontTxt":
				if (getStorageItem("apScoreFontTxt") == null) {setStorageItem("apScoreFontTxt", "32px")}
			case "apScoreCSSTxt":
				if (getStorageItem("apScoreCSSTxt") == null) {setStorageItem("apScoreCSSTxt", "")}
			case "apScoreBGTxt":
				if (getStorageItem("apScoreBGTxt") == null) {setStorageItem("apScoreBGTxt", "#f75555")}
			case "apScoreBGNoneCB":
				if (getStorageItem("apScoreBGNoneCB") == null) {setStorageItem("apScoreBGNoneCB", "false")}					
		}
	});
	
	configArray.forEach(function(item) {
		let storedItem = getStorageItem(item);
		if (extraDebug) {console.log ('Config: ' + item + " " + storedItem);}
		if (!item.includes('CB')) { //Not checkbox
			document.getElementById(item).value = storedItem;
		} else { //checkbox
			if (storedItem === "true") {
				document.getElementById(item).checked = true;
			} else {
				document.getElementById(item).checked = false;
			}
		}
	});

	const raceInfoObject = {
		"useRaceInfo": getStorageItem("useRaceInfo"),
		"raceInfoLeftTxt": getStorageItem("raceInfoLeftTxt"),
		"raceInfoTopTxt": getStorageItem("raceInfoTopTxt"),
		"raceInfoHeightTxt": getStorageItem("raceInfoHeightTxt"),
		"raceInfoFontTxt": getStorageItem("raceInfoFontTxt"),
		"raceInfoCSSTxt": getStorageItem("raceInfoCSSTxt"),
		"raceInfoBGTxt": getStorageItem("raceInfoBGTxt"),
		"raceInfoBGNoneCB":getStorageItem("raceInfoBGNoneCB")
	};
	bc.postMessage({"raceInfo": raceInfoObject});

	const gameInfoObject = {
		"useGameInfo": getStorageItem("useGameInfo"),
		"gameInfoLeftTxt": getStorageItem("gameInfoLeftTxt"),
		"gameInfoTopTxt": getStorageItem("gameInfoTopTxt"),
		"gameInfoHeightTxt": getStorageItem("gameInfoHeightTxt"),
		"gameInfoFontTxt": getStorageItem("gameInfoFontTxt"),
		"gameInfoCSSTxt": getStorageItem("gameInfoCSSTxt"),
		"gameInfoBGTxt": getStorageItem("gameInfoBGTxt"),
		"gameInfoBGNoneCB": getStorageItem("gameInfoBGNoneCB")
	};
	bc.postMessage({ "gameInfo": gameInfoObject});

	const tickerObject = {
		"usePoolStatTicker": getStorageItem("usePoolStatTicker"),
		"tickerLeftTxt": getStorageItem("tickerLeftTxt"),
		"tickerTopTxt": getStorageItem("tickerTopTxt"),
		"tickerHeightTxt": getStorageItem("tickerHeightTxt"),
		"tickerFontTxt": getStorageItem("tickerFontTxt"),
		"tickerCSSTxt": getStorageItem("tickerCSSTxt"),
		"tickerBGTxt": getStorageItem("tickerBGTxt"),
		"tickerBGNoneCB": getStorageItem("tickerBGNoneCB")
	};
	bc.postMessage({"ticker": tickerObject});

	const hpNameObject = {
		"hpNameLeftTxt": getStorageItem("hpNameLeftTxt"),
		"hpNameTopTxt": getStorageItem("hpNameTopTxt"),
		"hpNameHeightTxt": getStorageItem("hpNameHeightTxt"),
		"hpNameFontTxt": getStorageItem("hpNameFontTxt"),
		"hpNameCSSTxt": getStorageItem("hpNameCSSTxt"),
		"hpNameBGTxt": getStorageItem("hpNameBGTxt"),
		"hpNameBGNoneCB": getStorageItem("hpNameBGNoneCB"),
		"hpNameBGGradientCB": getStorageItem("hpNameBGGradientCB")
	};
	bc.postMessage({"hpName": hpNameObject});

	const apNameObject = {
		"apNameLeftTxt": getStorageItem("apNameLeftTxt"),
		"apNameTopTxt": getStorageItem("apNameTopTxt"),
		"apNameHeightTxt": getStorageItem("apNameHeightTxt"),
		"apNameFontTxt": getStorageItem("apNameFontTxt"),
		"apNameCSSTxt": getStorageItem("apNameCSSTxt"),
		"apNameBGTxt": getStorageItem("apNameBGTxt"),
		"apNameBGNoneCB": getStorageItem("apNameBGNoneCB"),
		"apNameBGGradientCB": getStorageItem("apNameBGGradientCB")
	};
	bc.postMessage({"apName": apNameObject});

	const hpScoreObject = {
		"hpScoreLeftTxt": getStorageItem("hpScoreLeftTxt"),
		"hpScoreTopTxt": getStorageItem("hpScoreTopTxt"),
		"hpScoreHeightTxt": getStorageItem("hpScoreHeightTxt"),
		"hpScoreFontTxt": getStorageItem("hpScoreFontTxt"),
		"hpScoreCSSTxt": getStorageItem("hpScoreCSSTxt"),
		"hpScoreBGTxt": getStorageItem("hpScoreBGTxt"),
		"hpScoreBGNoneCB": getStorageItem("hpScoreBGNoneCB")
	};
	bc.postMessage({"hpScore": hpScoreObject});

	const apScoreObject = {
		"apScoreLeftTxt": getStorageItem("apScoreLeftTxt"),
		"apScoreTopTxt": getStorageItem("apScoreTopTxt"),
		"apScoreHeightTxt": getStorageItem("apScoreHeightTxt"),
		"apScoreFontTxt": getStorageItem("apScoreFontTxt"),
		"apScoreCSSTxt": getStorageItem("apScoreCSSTxt"),
		"apScoreBGTxt": getStorageItem("apScoreBGTxt"),
		"apScoreBGNoneCB": getStorageItem("apScoreBGNoneCB")
	};
	bc.postMessage({"apScore": apScoreObject});
}

function initializeLogoStatus() {
	// Loop through the logos (in this example logos 1 through 5)
	for (let xL = 1; xL <= 5; xL++) {
		let savedLogo = getStorageItem("customLogo" + xL);
		let containerId;
		if (xL === 1) {
			containerId = "uploadCustomLogo";
		} else if (xL === 2) {
			containerId = "uploadCustomLogo2";
		} else {
			containerId = "logoSsImg" + xL;
		}
		let container = document.getElementById(containerId);
		let fileInput = document.getElementById("FileUploadL" + xL);
		let label  = document.getElementById("FileUploadLText" + xL);
		let imgElem = document.getElementById("l" + xL + "Img");

		if (savedLogo) {
			// A custom logo exists for this slot.
			// Update the preview image.
			if (imgElem) {
				imgElem.src = savedLogo;
			}
			// Display "Clear" on the label
			if (label) {
				label.textContent = "Clear";
			}
			// Bind the container's click to call clearLogo.
			if (container && fileInput) {
				container.onclick = function(e) {
					e.preventDefault();
					clearLogo(xL);
				};
				// Change styling to indicate clear mode (red background, light text)
				container.style.backgroundColor = "red";
				container.style.color = "white";
			}
		} else {
			// No custom logo; restore default settings.
			if (imgElem) {
				imgElem.src = "./common/images/placeholder.png";
			}
			if (label) {
				label.textContent = (xL === 1) ? "Upload Player 1 Logo" :
									(xL === 2) ? "Upload Player 2 Logo" : "L" + (xL-2);
			}
			if (container && fileInput) {
				container.onclick = function(e) {
					// e.preventDefault();
					fileInput.click();
				};
				// Reset any inline styles applied previously.
				container.style.backgroundColor = "";
				container.style.color = "";
			}
		}
	}
}

function initializeExtensionButtonStatus() {
    // Player 1 Extension Button
    let extBtn1 = document.getElementById("p1extensionBtn");
    // Use a key to store if the extension is enabled. Here "enabled" means it is active.
    // If the key is not present, then consider it not enabled.
    let extStatus1 = getStorageItem("p1Extension"); // e.g., "enabled" or "disabled"
    if (extBtn1) {
        if (extStatus1 && extStatus1 === "enabled") {
            // When enabled, show Reset
            //extBtn1.textContent = "Reset";
			document.getElementById("p1extensionBtn").setAttribute("onclick", "resetExt('p1')");
			document.getElementById("p1extensionBtn").classList.add("clkd");
			var playerName = document.getElementById("p1Name").value.split(" ")[0] || "P1";
			document.getElementById("p1extensionBtn").innerHTML = "Reset " + playerName.substring(0, 9) + "'s Ext";
            extBtn1.style.backgroundColor = "red";
            extBtn1.style.color = "black";
        } else {
            //extBtn1.textContent = "Extend";
            extBtn1.style.backgroundColor = "";
            extBtn1.style.color = "";
        }
    }

    // Player 2 Extension Button
    let extBtn2 = document.getElementById("p2extensionBtn");
    let extStatus2 = getStorageItem("p2Extension");
    if (extBtn2) {
        if (extStatus2 && extStatus2 === "enabled") {
            //extBtn2.textContent = "Reset";
			document.getElementById("p2extensionBtn").setAttribute("onclick", "resetExt('p2')");
			document.getElementById("p2extensionBtn").classList.add("clkd");
			var playerName = document.getElementById("p2Name").value.split(" ")[0] || "P1";
			document.getElementById("p2extensionBtn").innerHTML = "Reset " + playerName.substring(0, 9) + "'s Ext";
            extBtn2.style.backgroundColor = "red";
            extBtn2.style.color = "black";
        } else {
            //extBtn2.textContent = "Extend";
            extBtn2.style.backgroundColor = "";
            extBtn2.style.color = "";
        }
    }
}

// slider.oninput = function () {
// 	sliderValue = this.value / 100;
// 	document.getElementById("sliderValue").innerHTML = this.value + "%";  // Add this line
// 	bc.postMessage({ opacity: sliderValue });
// }

uiScalingSlider.oninput = function () {
	sliderUiScalingValue = this.value / 100;
	document.getElementById("sliderUiScalingValue").innerHTML = this.value + "%";  // Add this line
	bc.postMessage({ scaling: sliderUiScalingValue });
}

if (getStorageItem('p1colorSet') !== null) {
	var cvalue = getStorageItem('p1colorSet');
	var selectElement = document.getElementById('p1colorDiv');
    
    // Set the selected option
    for (var i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].value === cvalue) {
            selectElement.selectedIndex = i;
            break;
        }
    }
	document.getElementById('p1colorDiv').style.background = getStorageItem('p1colorSet');
	document.getElementsByTagName("select")[0].options[0].value = cvalue;
	if (cvalue == "white" || cvalue == "") { document.getElementById("p1colorDiv").style.color = "black"; document.getElementById("p1colorDiv").style.textShadow = "none"; 
	} else { document.getElementById("p1colorDiv").style.color = "white"; };
} else {
	document.getElementById("p1colorDiv").style.color = "black";
	document.getElementById("p1colorDiv").style.textShadow = "none"; 
}

if (getStorageItem('p2colorSet') !== null) {
	var cvalue = getStorageItem('p2colorSet');
	var selectElement = document.getElementById('p2colorDiv');
    
    // Set the selected option
    for (var i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].value === cvalue) {
            selectElement.selectedIndex = i;
            break;
        }
    }
	document.getElementById('p2colorDiv').style.background = getStorageItem('p2colorSet');
	if (cvalue == "white" || cvalue == "") { document.getElementById("p2colorDiv").style.color = "black"; document.getElementById("p2colorDiv").style.textShadow = "none"; 
	} else { document.getElementById("p2colorDiv").style.color = "white"; };
}
else {
	document.getElementById("p2colorDiv").style.color = "black";
	document.getElementById("p2colorDiv").style.textShadow = "none";
}

if (getStorageItem('p1ScoreCtrlPanel') > 0 || getStorageItem('p1ScoreCtrlPanel') == "") {
	p1ScoreValue = getStorageItem('p1ScoreCtrlPanel');
	msg = { player: '1', score: p1ScoreValue };
	bc.postMessage(msg);
} else {
	p1ScoreValue = 0;
	msg = { player: '1', score: p1ScoreValue };
	bc.postMessage(msg);
}

if (getStorageItem('p2ScoreCtrlPanel') > 0 || getStorageItem('p2ScoreCtrlPanel') == "") {
	p2ScoreValue = getStorageItem('p2ScoreCtrlPanel');
	msg = { player: '2', score: p2ScoreValue };
	bc.postMessage(msg);
} else {
	p2ScoreValue = 0;
	msg = { player: '2', score: p2ScoreValue };
	bc.postMessage(msg);
}

function setPlayerVisibility(playerNumber) {
	const usePlayer = getStorageItem(`usePlayer${playerNumber}`) == "yes";
	const checkbox = document.getElementById(`usePlayer${playerNumber}Setting`);
	checkbox.checked = usePlayer;
	if (usePlayer) {
		console.log(`Enable player/team ${playerNumber}`);
	}
	playerSetting(playerNumber);
}

if (getStorageItem("obsTheme") == "28") { document.getElementById("obsTheme").value = "28"; }
document.getElementById("p1NameTxt").value = getStorageItem("p1NameCtrlPanel");
document.getElementById("p2NameTxt").value = getStorageItem("p2NameCtrlPanel");
document.getElementById("raceInfoTxt").value = getStorageItem("raceInfo");
document.getElementById("gameInfoTxt").value = getStorageItem("gameInfo");
document.getElementById("verNum").innerHTML = versionNum;
// document.getElementById("psVerNum").innerHTML = psVersionNum;
postNames(); postInfo(); startThemeCheck();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// broadcast channel events from browser_source
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

bcr.onmessage = (event) => {
	const clockDisplay = document.getElementById("clockLocalDisplay");
    clockDisplay.style.background = "green";
	clockDisplay.style.border = "2px solid black";
    clockDisplay.innerHTML = event.data + "s";
	tev = event.data;
	console.log(tev);
	if (tev > 20) { document.getElementById("clockLocalDisplay").style.color = "white"; };
	if (tev > 5 && tev < 21) { document.getElementById("clockLocalDisplay").style.color = "black"; };
	if (tev < 21) { document.getElementById("clockLocalDisplay").style.background = "orange"; };
	if (tev < 16) { document.getElementById("clockLocalDisplay").style.background = "yellow"; };
	if (tev < 11) { document.getElementById("clockLocalDisplay").style.background = "tomato"; };
	if (tev == 10) {
		document.getElementById("shotClockShow").setAttribute("onclick", "clockDisplay('hide')");
		document.getElementById("shotClockShow").innerHTML = "Hide Clock";
		document.getElementById("shotClockShow").style.border = "2px solid black";
	}
	if (tev < 6 && tev > 0) {    //tev > 0   this prevents both sounds from playing at 0.
		document.getElementById("clockLocalDisplay").style.background = "red";
		document.getElementById("clockLocalDisplay").style.color = "white";
		warningBeep.loop = false;
		warningBeep.play();
	}
	if (tev == 0) {
		foulSound.loop = false;
		foulSound.play();
		setTimeout("stopClock()", 1000);
	}
}
