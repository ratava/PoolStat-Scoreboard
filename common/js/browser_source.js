'use strict';
// PoolStat Scoreboard is a modified version of CueSport Scoreboard by Iain Macleod which was based on g4Scoreboard. The purpose of this modification is to provide an OBS interface for
// PoolStat. A Pool scoring system used in Australia. Data is provided by a live screaming portal.

// CueSport Scoreboard for OBS version 2.3.0 Copyright 2025 Iain Macleod
// G4ScoreBoard addon for OBS version 1.6.1 Copyright 2022-2023 Norman Gholson IV
// https://g4billiards.com http://www.g4creations.com
// this is a purely javascript/html/css driven scoreboard system for OBS Studio
// free to use and modify and use as long as this copyright statment remains intact. 


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            
//						functions
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            

function postLogo() {
	if (getStorageItem("customLogo1") != null && getStorageItem("customLogo1") != "") {
		document.getElementById("customLogo1").src = getStorageItem("customLogo1");
	}
	if (getStorageItem("customLogo2") != null && getStorageItem("customLogo2") != "") {
		document.getElementById("customLogo2").src = getStorageItem("customLogo2");
	}
}

function clearWinBlink() {
	document.getElementById("player1Score").classList.remove("winBlink");
	document.getElementById("player2Score").classList.remove("winBlink");
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}

function showScores() {
	document.getElementById("player1Score").classList.replace("fadeOutElm", "fadeInElm");
	document.getElementById("player2Score").classList.replace("fadeOutElm", "fadeInElm");
	document.getElementById("raceInfo").classList.replace("fadeOutElm", "fadeInElm");
}

function hideScores() {
	document.getElementById("player1Score").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("player2Score").classList.replace("fadeInElm", "fadeOutElm");
	document.getElementById("raceInfo").classList.replace("fadeInElm", "fadeOutElm");
}


function clearExtBlink(playerN) {
	document.getElementById("p" + playerN + "ExtIcon").classList.remove("extBlink");
	document.getElementById("p" + playerN + "ExtIcon").style.background = "darkred";
}

function extReset(player) {
	document.getElementById(player + "ExtIcon").style.background = "green";

}

function customShow() {
	document.getElementById("customLogo1").style.removeProperty('display');
	setTimeout(function () {
		if (document.getElementById("customLogo1").classList.contains("logoSlide")) {
			document.getElementById("customLogo1").classList.replace("logoSlide", "fadeOutElm");
		}
		if (document.getElementById("customLogo1").classList.contains("fade")) {
			document.getElementById("customLogo1").classList.replace("fade", "fadeOutElm");
		}
		document.getElementById("customLogo1").classList.replace("fadeOutElm", "fadeInElm");
	}, 100);
}

function customHide() {
	document.getElementById("customLogo1").classList.replace("fadeInElm", "fadeOutElm");
	setTimeout(function () {
		document.getElementById("customLogo1").style.display = "none";
	}, 1000);
}

function custom2Show() {
	document.getElementById("customLogo2").style.removeProperty('display');
	setTimeout(function () {
		if (document.getElementById("customLogo2").classList.contains("logoSlide")) {
			document.getElementById("customLogo2").classList.replace("logoSlide", "fadeOutElm");
		}
		if (document.getElementById("customLogo2").classList.contains("fade")) {
			document.getElementById("customLogo2").classList.replace("fade", "fadeOutElm");
		}
		document.getElementById("customLogo2").classList.replace("fadeOutElm", "fadeInElm");
	}, 100);
}

function custom2Hide() {
	document.getElementById("customLogo2").classList.replace("fadeInElm", "fadeOutElm");
	setTimeout(function () {
		document.getElementById("customLogo2").style.display = "none";
	}, 1000);
}



function changeActivePlayer(activePlayer) {
	if (activePlayer === true || activePlayer === null) {
		console.log(`Show player 1`);
		document.getElementById("player1Image").classList.replace("fadeOutElm", "fadeInElm");
		document.getElementById("player2Image").classList.replace("fadeInElm", "fadeOutElm");
	} else if (activePlayer === false) {
		console.log(`Show player 2`);
		document.getElementById("player1Image").classList.replace("fadeInElm", "fadeOutElm");
		document.getElementById("player2Image").classList.replace("fadeOutElm", "fadeInElm");
	} else {
		console.log(`No valid player selected`); // Log if no valid player
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
