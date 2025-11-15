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
var tev;
var p1ScoreValue;
var p2ScoreValue;
var timerIsRunning;
var msg;
var msg2;
var racemsg;
var gamemsg;
var playerNumber;
var p1namemsg;
var p2namemsg;
var playerx;
var c1value;
var c2value;
var pColormsg;
const positionConfigArray = [];
const defaultValues = {
	// Top Banner Box
	bannerBoxLeftTxt: "1px",
	bannerBoxTopTxt: "1px",
	bannerBoxHeightTxt: "100px",
	bannerBoxWidthTxt: "1920px",
	bannerBoxCSSTxt: "",
	bannerBoxBGTxt: "#800000",
	bannerBoxBGNoneCB: "false",

	// Custom Image 1
	customImage1LeftTxt: "1px",
	customImage1TopTxt: "1px",
	customImage1HeightTxt: "100px",
	customImage1WidthTxt: "1920px",
	customImage1CSSTxt: "",
	customImage1BGTxt: "#800000",
	customImage1BGNoneCB: "false",

	// Custom Image 2
	customImage2LeftTxt: "1px",
	customImage2TopTxt: "1px",
	customImage2HeightTxt: "100px",
	customImage2WidthTxt: "1920px",
	customImage2CSSTxt: "",
	customImage2BGTxt: "#800000",
	customImage2BGNoneCB: "false",

	// Race Info
	raceInfoLeftTxt: "340px",
	raceInfoTopTxt: "20px",
	raceInfoHeightTxt: "40px",
	raceInfoWidthTxt: "300px",
	raceInfoFontTxt: "32px",
	raceInfoCSSTxt: "",
	raceInfoFGTxt: "#ffffff",
	raceInfoBGTxt: "#3679dd",
	raceInfoBGNoneCB: "false",

	// Game Info
	gameInfoLeftTxt: "1580px",
	gameInfoTopTxt: "20px",
	gameInfoHeightTxt: "40px",
	gameInfoWidthTxt: "300px",
	gameInfoFontTxt: "32px",
	gameInfoCSSTxt: "",
	gameInfoFGTxt: "#ffffff",
	gameInfoBGTxt: "#3679dd",
	gameInfoBGNoneCB: "false",

	// Draw - Round
	drawRoundLeftTxt: "960px",
	drawRoundTopTxt: "20px",
	drawRoundHeightTxt: "40px",
	drawRoundWidthTxt: "300px",
	drawRoundFontTxt: "32px",
	drawRoundCSSTxt: "",
	drawRoundFGTxt: "#ffffff",
	drawRoundBGTxt: "#3679dd",
	drawRoundBGNoneCB: "false",

	// Ticker
	tickerLeftTxt: "960px",
	tickerTopTxt: "80px",
	tickerHeightTxt: "40px",
	tickerWidthTxt: "40px",
	tickerFontTxt: "32px",
	tickerCSSTxt: "",
	tickerFGTxt: "#ffffff",
	tickerBGTxt: "#3679dd",
	tickerBGNoneCB: "false",
	tickerAutoHideCB: "true",

	// Home Player Name
	hpNameLeftTxt: "340px",
	hpNameTopTxt: "1010px",
	hpNameHeightTxt: "60px",
	hpNameWidthTxt: "550px",
	hpNameFontTxt: "50px",
	hpNameCSSTxt: "",
	hpNameFGTxt: "#ffffff",
	hpNameBGTxt: "#f72696",
	hpNameBGNoneCB: "false",
	hpNameBGGradientCB: "true",

	// Away Player Name
	apNameLeftTxt: "1580px",
	apNameTopTxt: "1010px",
	apNameHeightTxt: "60px",
	apNameWidthTxt: "550px",
	apNameFontTxt: "50px",
	apNameCSSTxt: "",
	apNameFGTxt: "#ffffff",
	apNameBGTxt: "#e7f708",
	apNameBGNoneCB: "false",
	apNameBGGradientCB: "true",

	// Home Player Score
	hpScoreLeftTxt: "910px",
	hpScoreTopTxt: "1010px",
	hpScoreHeightTxt: "80px",
	hpScoreWidthTxt: "80px",
	hpScoreFontTxt: "70px",
	hpScoreCSSTxt: "",
	hpScoreFGTxt: "#ffffff",
	hpScoreBGTxt: "#f75555",
	hpScoreBGNoneCB: "false",

	// Away Player Score
	apScoreLeftTxt: "1040px",
	apScoreTopTxt: "1010px",
	apScoreHeightTxt: "80px",
	apScoreWidthTxt: "80px",
	apScoreFontTxt: "70px",
	apScoreCSSTxt: "",
	apScoreFGTxt: "#ffffff",
	apScoreBGTxt: "#f75555",
	apScoreBGNoneCB: "false",

	// Home Player Image
	hpImageLeftTxt: "100px",
	hpImageTopTxt: "970px",
	hpImageHeightTxt: "60px",
	hpImageWidthTxt: "60px",
	hpImageCSSTxt: "",
	hpImageEnableCB: "false",
	hpImageAutoMoveCB: "false",

	// Away Player Image
	apImageLeftTxt: "100px",
	apImageTopTxt: "970px",
	apImageHeightTxt: "60px",
	apImageWidthTxt: "60px",
	apImageCSSTxt: "",
	apImageEnableCB: "false",
	apImageAutoMoveCB: "false",

	// Breaking Player Indicator
	bpHeightTxt: "70px",
	bpWidthTxt: "30px",
	bpCSSTxt: "",
	bpBGTxt: "#808080",
	bpBGNoneCB: "false",

	// Match Clock
	matchClockLeftTxt: "50%",
	matchClockTopTxt: "1060px",
	matchClockHeightTxt: "20px",
	matchClockWidthTxt: "40px",
	matchClockFontTxt: "#ffffff",
	matchClockCSSTxt: "",
	matchClockBGTxt: "#800000",
	matchClockBGNoneCB: "true",
	matchClockNormalTxt: "#ffffff",
	matchClock5SecondTxt: "#FFFF00",
	matchClockCompletedTxt: "#FF0000",

	// Shot Clock
	shotClockLeftTxt: "955px",
	shotClockTopTxt: "978px",
	shotClockHeightTxt: "40px",
	shotClockWidthTxt: "50px",
	shotClockFontTxt: "32px",
	shotClockCSSTxt: "",
	shotClockBGTxt: "#800000",
	shotClockBGNoneCB: "false",
	shotClockNormalTxt: "#ffffff",
	shotClockWarningTxt: "#FFFF00",
	shotClock5SecondTxt: "#FFFF00",
	shotClockCompletedTxt: "#FF0000",

	// Home Player - Extension
	hpExtLeftTxt: "155px",
	hpExtTopTxt: "970px",
	hpExtHeightTxt: "60px",
	hpExtWidthTxt: "30px",
	hpExtFontTxt: "30px",
	hpExtCSSTxt: "",
	hpExtFGTxt: "ffffff",
	hpExtBGTxt: "2220acff",
	hpExtBGNoneCB: "false",

	// Away Player - Extension
	apExtLeftTxt: "155px",
	apExtTopTxt: "970px",
	apExtHeightTxt: "60px",
	apExtWidthTxt: "30px",
	apExtFontTxt: "30px",
	apExtCSSTxt: "",
	apExtFGTxt: "#ffffff",
	apExtBGTxt: "#2220acff",
	apExtBGNoneCB: "false"
};

const simDefaultValues = {
	simCompIdTxt: "9999",
	simMatchIdTxt: Math.floor(Math.random() * 99).toString(),
	simProfileNameTxt: "Default Profile",
	simSceneNameTxt: "PoolStat Scoreboard",
	simStreamKeyTxt: "streamkey12345",
	simStreamStatusEnabledToggle: false,
	simMatchStatusTxt: "Playing",
	simEventNameTxt: "Local Tournament",
	simMatchFormatTxt: "Best of 5",
	simDrawRoundTxt: "Round 1 - 10/10/25",
	simHomePlayerNameTxt: "Home Player",
	simAwayPlayerNameTxt: "Away Player",
	simHomePlayerScoreTxt: "0",
	simAwayPlayerScoreTxt: "0",
	simHomePlayerImageTxt: "",
	simAwayPlayerImageTxt: "",
	simBreakingPlayerToggle: "hp",
};

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

window.onload = function () {
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

	if (getStorageItem("rigName")) {
		document.getElementById("rigNameTxt").value = getStorageItem("rigName");
	}

	if (getStorageItem("psLoginName")) {
		document.getElementById("psLoginNameTxt").value = getStorageItem("psLoginName");
	}

	if (getStorageItem("obsWebSocketPort")) {
		document.getElementById("obsWebSocketPortTxt").value = getStorageItem("obsWebSocketPort");
	} else {
		setStorageItem("obsWebSocketPort", "4455");
		document.getElementById("obsWebSocketPortTxt").value = getStorageItem("obsWebSocketPort");
	}

	if (getStorageItem("useRaceInfo") === "true" || getStorageItem("useRaceInfo") === null) {
		document.getElementById("raceInfoEnableCB").checked = true;
		setStorageItem("useRaceInfo", "true");
	} else {
		document.getElementById("raceInfoEnableCB").checked = false;
		setStorageItem("useRaceInfo", "false");
	}

	if (getStorageItem("useGameInfo") === "true" || getStorageItem("useGameInfo") === null) {
		document.getElementById("gameInfoEnableCB").checked = true;
		setStorageItem("useGameInfo", "true");
	} else {
		document.getElementById("gameInfoEnableCB").checked = false;
		setStorageItem("useGameInfo", "false");
	}

	if (getStorageItem("usePoolStatTicker") === "true" || getStorageItem("usePoolStatTicker") === null) {
		document.getElementById("tickerEnableCB").checked = true;
		setStorageItem("usePoolStatTicker", "true");
	} else {
		document.getElementById("tickerEnableCB").checked = false;
		setStorageItem("usePoolStatTicker", "false");
	}

	if (getStorageItem("usePoolStatBreakingPlayer") === "true" || getStorageItem("usePoolStatBreakingPlayer") === null) {
		document.getElementById("bpEnableCB").checked = true;
		setStorageItem("usePoolStatBreakingPlayer", "true");
	} else {
		document.getElementById("bpEnableCB").checked = false;
		setStorageItem("usePoolStatBreakingPlayer", "false");
	}

	if (getStorageItem("usePoolStatBannerBox") === "true" || getStorageItem("usePoolStatBannerBox") === null) {
		document.getElementById("bannerBoxEnableCB").checked = true;
		setStorageItem("usePoolStatBannerBox", "true");
	} else {
		document.getElementById("bannerBoxEnableCB").checked = false;
		setStorageItem("usePoolStatBannerBox", "false");
	}

	if (getStorageItem("usePoolStatCustomImage1") === "true" || getStorageItem("usePoolStatCustomImage1") === null) {
		document.getElementById("customImage1EnableCB").checked = true;
		setStorageItem("usePoolStatCustomImage1", "true");
	} else {
		document.getElementById("customImage1EnableCB").checked = false;
		setStorageItem("usePoolStatCustomImage1", "false");
	}

	if (getStorageItem("usePoolStatCustomImage2") === "true" || getStorageItem("usePoolStatCustomImage2") === null) {
		document.getElementById("customImage2EnableCB").checked = true;
		setStorageItem("usePoolStatCustomImage2", "true");
	} else {
		document.getElementById("customImage2EnableCB").checked = false;
		setStorageItem("usePoolStatCustomImage2", "false");
	}

	if (getStorageItem("p1Score") === null) {
		setStorageItem("p1Score", "0");
	}
	if (getStorageItem("p2Score") === null) {
		setStorageItem("p2Score", "0");
	}

	if (getStorageItem("usePoolStatTicker") === null) {
		setStorageItem("usePoolStatTicker", "no");
		console.log('PoolStat Ticker initalised');
	}

	if (getStorageItem("PoolStatRigId") === null) {
		const psRigId = genPsRigId();
		setStorageItem("PoolStatRigId", psRigId);
		console.log('PoolStat Rig ID: ' + psRigId);
		document.getElementById("psRigId").textContent = psRigId;
	} else {
		console.log('PS Rig ID: ' + getStorageItem("PoolStatRigId"));
		document.getElementById("psRigIdTxt").textContent = getStorageItem("PoolStatRigId");
	}

	if (getStorageItem("poolStatConfigCueTools") === "true" || getStorageItem("poolStatConfigCueTools") === null) {
		document.getElementById("cueToolsEnableCB").checked = true;
		setStorageItem("cueToolsEnableCB", "true");
	} else {
		document.getElementById("cueToolsEnableCB").checked = false;
	}

	if (getStorageItem("cueToolsSoundEffects") === "true" || getStorageItem("cueToolsSoundEffects") === null) {
		document.getElementById("cueToolsSoundEffectsCB").checked = true;
		setStorageItem("cueToolsSoundEffects", "true");
	} else {
		document.getElementById("cueToolsSoundEffectsCB").checked = false;
	}

	intiializePositionConfig();
	intiializeSimConfig();
	// Initialize the logo and extension status for each logo (players + slideshow logos) and player
	console.log(`Instance: ${INSTANCE_ID}`);
};

async function intiializeSimConfig() {
	const profiles = await getOBSProfiles();
	const scenes = await getOBSScenes();
	const collections = await getOBSSceneCollections();
	const streamConfig = await getOBSStreamConfig();
	console.log('OBS Stream Config:', streamConfig);

	for (const profile of profiles) {
		if (extraDebug) { console.log(`OBS Profile: ${profile}`); }
		const option = document.createElement('option');
		option.value = profile;
		option.textContent = profile;
		document.getElementById('simProfileNameTxt').appendChild(option);
	}

	for (const collection of collections) {
		if (extraDebug) { console.log(`OBS Scene Collection: ${collection}`); }
		const option = document.createElement('option');
		option.value = collection
		option.textContent = collection;
		document.getElementById('simSceneCollectionTxt').appendChild(option);
	}

	for (const scene of scenes) {
		if (extraDebug) { console.log(`OBS Scene: ${scene['sceneName']}`); }
		const option = document.createElement('option');
		option.value = scene['sceneName'];
		option.textContent = scene['sceneName'];
		document.getElementById('simSceneNameTxt').appendChild(option);
	}
	
	document.getElementById('simStreamKeyTxt').value = streamConfig['key'] || '';

	Object.entries(simDefaultValues).forEach(([key, value]) => {
		if (getStorageItem(key) === null) {
			setStorageItem(key, value);
			console.log(`Setting default for ${key}: ${value}`);
		}
	});

	Object.entries(simDefaultValues).forEach(([key, value]) => {
		let storedItem = getStorageItem(key);
		if (extraDebug) { console.log('Config: ' + key + " " + storedItem); }
		if (key.includes('Txt')) { //Text Input
			document.getElementById(key).value = storedItem;
		} else if (key.includes('CB')) { //checkbox
			if (storedItem) {
				document.getElementById(key).checked = true;
			} else {
				document.getElementById(key).checked = false;
			}
		} else if (key.includes('simStreamStatusEnabledToggle')) { //select toggle
			if (storedItem === "true") {
				document.getElementById('simStreamStatusEnabledToggle').value = "true";
			} else {
				document.getElementById('simStreamStatusEnabledToggle').value = "false";
			}
		} else if (key.includes('simBreakingPlayerToggle')) { //select toggle
			document.getElementById('simBreakingPlayerToggle').value = storedItem;
		}
	});

}


function intiializePositionConfig() {
	Object.entries(defaultValues).forEach(([key, value]) => {
		if (getStorageItem(key) === null) {
			setStorageItem(key, value);
			console.log(`Setting default for ${key}: ${value}`);
		}
	});

	Object.entries(defaultValues).forEach(([key, value]) => {
		let storedItem = getStorageItem(key);
		if (extraDebug) { console.log('Config: ' + key + " " + storedItem); }
		if (!key.includes('CB')) { //Not checkbox
			document.getElementById(key).value = storedItem;
		} else { //checkbox
			if (storedItem === "true") {
				document.getElementById(key).checked = true;
			} else {
				document.getElementById(key).checked = false;
			}
		}
	});


	const bannerBoxObject = {
		"bannerBoxEnabledCB": getStorageItem("usePoolStatBannerBox"),
		"bannerBoxLeftTxt": getStorageItem("bannerBoxLeftTxt"),
		"bannerBoxTopTxt": getStorageItem("bannerBoxTopTxt"),
		"bannerBoxHeightTxt": getStorageItem("bannerBoxHeightTxt"),
		"bannerBoxWidthTxt": getStorageItem("bannerBoxWidthTxt"),
		"bannerBoxCSSTxt": getStorageItem("bannerBoxCSSTxt"),
		"bannerBoxBGTxt": getStorageItem("bannerBoxBGTxt"),
		"bannerBoxBGNoneCB": getStorageItem("bannerBoxBGNoneCB")
	};
	bc.postMessage({ "bannerBox": bannerBoxObject });

	const customImage1Object = {
		"customImage1EnabledCB": getStorageItem("usePoolStatCustomImage1"),
		"customImage1ImgSrc": getStorageItem("customImage1"),
		"customImage1LeftTxt": getStorageItem("customImage1LeftTxt"),
		"customImage1TopTxt": getStorageItem("customImage1TopTxt"),
		"customImage1HeightTxt": getStorageItem("customImage1HeightTxt"),
		"customImage1WidthTxt": getStorageItem("customImage1WidthTxt"),
		"customImage1CSSTxt": getStorageItem("customImage1CSSTxt"),
		"customImage1BGTxt": getStorageItem("customImage1BGTxt"),
		"customImage1BGNoneCB": getStorageItem("customImage1BGNoneCB")
	};
	bc.postMessage({ "customImage1": customImage1Object });

	const customImage2Object = {
		"customImage2EnabledCB": getStorageItem("usePoolStatCustomImage2"),
		"customImage2ImgSrc": getStorageItem("customImage2"),
		"customImage2LeftTxt": getStorageItem("customImage2LeftTxt"),
		"customImage2TopTxt": getStorageItem("customImage2TopTxt"),
		"customImage2HeightTxt": getStorageItem("customImage2HeightTxt"),
		"customImage2WidthTxt": getStorageItem("customImage2WidthTxt"),
		"customImage2CSSTxt": getStorageItem("customImage2CSSTxt"),
		"customImage2BGTxt": getStorageItem("customImage2BGTxt"),
		"customImage2BGNoneCB": getStorageItem("customImage2BGNoneCB")
	};
	bc.postMessage({ "customImage2": customImage2Object });

	const raceInfoObject = {
		"useRaceInfo": getStorageItem("useRaceInfo"),
		"raceInfoLeftTxt": getStorageItem("raceInfoLeftTxt"),
		"raceInfoTopTxt": getStorageItem("raceInfoTopTxt"),
		"raceInfoHeightTxt": getStorageItem("raceInfoHeightTxt"),
		"raceInfoWidthTxt": getStorageItem("raceInfoWidthTxt"),
		"raceInfoFontTxt": getStorageItem("raceInfoFontTxt"),
		"raceInfoCSSTxt": getStorageItem("raceInfoCSSTxt"),
		"raceInfoFGTxt": getStorageItem("raceInfoFGTxt"),
		"raceInfoBGTxt": getStorageItem("raceInfoBGTxt"),
		"raceInfoBGNoneCB": getStorageItem("raceInfoBGNoneCB")
	};
	bc.postMessage({ "raceInfo": raceInfoObject });

	const gameInfoObject = {
		"useGameInfo": getStorageItem("useGameInfo"),
		"gameInfoLeftTxt": getStorageItem("gameInfoLeftTxt"),
		"gameInfoTopTxt": getStorageItem("gameInfoTopTxt"),
		"gameInfoHeightTxt": getStorageItem("gameInfoHeightTxt"),
		"gameInfoWidthTxt": getStorageItem("gameInfoWidthTxt"),
		"gameInfoFontTxt": getStorageItem("gameInfoFontTxt"),
		"gameInfoCSSTxt": getStorageItem("gameInfoCSSTxt"),
		"gameInfoFGTxt": getStorageItem("gameInfoFGTxt"),
		"gameInfoBGTxt": getStorageItem("gameInfoBGTxt"),
		"gameInfoBGNoneCB": getStorageItem("gameInfoBGNoneCB")
	};
	bc.postMessage({ "gameInfo": gameInfoObject });

	const drawRoundObject = {
		"usedrawRound": getStorageItem("usedrawRound"),
		"drawRoundLeftTxt": getStorageItem("drawRoundLeftTxt"),
		"drawRoundTopTxt": getStorageItem("drawRoundTopTxt"),
		"drawRoundHeightTxt": getStorageItem("drawRoundHeightTxt"),
		"drawRoundWidthTxt": getStorageItem("drawRoundWidthTxt"),
		"drawRoundFontTxt": getStorageItem("drawRoundFontTxt"),
		"drawRoundCSSTxt": getStorageItem("drawRoundCSSTxt"),
		"drawRoundFGTxt": getStorageItem("drawRoundFGTxt"),
		"drawRoundBGTxt": getStorageItem("drawRoundBGTxt"),
		"drawRoundBGNoneCB": getStorageItem("drawRoundBGNoneCB")
	};
	bc.postMessage({ "drawRound": drawRoundObject });

	const tickerObject = {
		"usePoolStatTicker": getStorageItem("usePoolStatTicker"),
		"tickerLeftTxt": getStorageItem("tickerLeftTxt"),
		"tickerTopTxt": getStorageItem("tickerTopTxt"),
		"tickerHeightTxt": getStorageItem("tickerHeightTxt"),
		"tickerWidthTxt": getStorageItem("tickerWidthTxt"),
		"tickerFontTxt": getStorageItem("tickerFontTxt"),
		"tickerCSSTxt": getStorageItem("tickerCSSTxt"),
		"tickerFGTxt": getStorageItem("tickerFGTxt"),
		"tickerBGTxt": getStorageItem("tickerBGTxt"),
		"tickerBGNoneCB": getStorageItem("tickerBGNoneCB"),
		"tickerAutoHideCB": getStorageItem("tickerAutoHideCB")
	};
	bc.postMessage({ "ticker": tickerObject });

	const hpNameObject = {
		"hpNameLeftTxt": getStorageItem("hpNameLeftTxt"),
		"hpNameTopTxt": getStorageItem("hpNameTopTxt"),
		"hpNameHeightTxt": getStorageItem("hpNameHeightTxt"),
		"hpNameWidthTxt": getStorageItem("hpNameWidthTxt"),
		"hpNameFontTxt": getStorageItem("hpNameFontTxt"),
		"hpNameCSSTxt": getStorageItem("hpNameCSSTxt"),
		"hpNameFGTxt": getStorageItem("hpNameFGTxt"),
		"hpNameBGTxt": getStorageItem("hpNameBGTxt"),
		"hpNameBGNoneCB": getStorageItem("hpNameBGNoneCB"),
		"hpNameBGGradientCB": getStorageItem("hpNameBGGradientCB")
	};
	bc.postMessage({ "hpName": hpNameObject });

	const apNameObject = {
		"apNameLeftTxt": getStorageItem("apNameLeftTxt"),
		"apNameTopTxt": getStorageItem("apNameTopTxt"),
		"apNameHeightTxt": getStorageItem("apNameHeightTxt"),
		"apNameWidthTxt": getStorageItem("apNameWidthTxt"),
		"apNameFontTxt": getStorageItem("apNameFontTxt"),
		"apNameCSSTxt": getStorageItem("apNameCSSTxt"),
		"apNameFGTxt": getStorageItem("apNameFGTxt"),
		"apNameBGTxt": getStorageItem("apNameBGTxt"),
		"apNameBGNoneCB": getStorageItem("apNameBGNoneCB"),
		"apNameBGGradientCB": getStorageItem("apNameBGGradientCB")
	};
	bc.postMessage({ "apName": apNameObject });

	const hpScoreObject = {
		"hpScoreLeftTxt": getStorageItem("hpScoreLeftTxt"),
		"hpScoreTopTxt": getStorageItem("hpScoreTopTxt"),
		"hpScoreHeightTxt": getStorageItem("hpScoreHeightTxt"),
		"hpScoreWidthTxt": getStorageItem("hpScoreWidthTxt"),
		"hpScoreFontTxt": getStorageItem("hpScoreFontTxt"),
		"hpScoreCSSTxt": getStorageItem("hpScoreCSSTxt"),
		"hpScoreFGTxt": getStorageItem("hpScoreFGTxt"),
		"hpScoreBGTxt": getStorageItem("hpScoreBGTxt"),
		"hpScoreBGNoneCB": getStorageItem("hpScoreBGNoneCB")
	};
	bc.postMessage({ "hpScore": hpScoreObject });

	const apScoreObject = {
		"apScoreLeftTxt": getStorageItem("apScoreLeftTxt"),
		"apScoreTopTxt": getStorageItem("apScoreTopTxt"),
		"apScoreHeightTxt": getStorageItem("apScoreHeightTxt"),
		"apScoreWidthTxt": getStorageItem("apScoreWidthTxt"),
		"apScoreFontTxt": getStorageItem("apScoreFontTxt"),
		"apScoreCSSTxt": getStorageItem("apScoreCSSTxt"),
		"apScoreFGTxt": getStorageItem("apScoreFGTxt"),
		"apScoreBGTxt": getStorageItem("apScoreBGTxt"),
		"apScoreBGNoneCB": getStorageItem("apScoreBGNoneCB")
	};
	bc.postMessage({ "apScore": apScoreObject });

	const hpImageObject = {
		"hpImageLeftTxt": getStorageItem("hpImageLeftTxt"),
		"hpImageTopTxt": getStorageItem("hpImageTopTxt"),
		"hpImageHeightTxt": getStorageItem("hpImageHeightTxt"),
		"hpImageWidthTxt": getStorageItem("hpImageWidthTxt"),
		"hpImageFontTxt": getStorageItem("hpImageFontTxt"),
		"hpImageCSSTxt": getStorageItem("hpImageCSSTxt"),
		"hpImageAutoMoveCB": getStorageItem("hpImageAutoMoveCB")
	};
	bc.postMessage({ "hpImage": hpImageObject });

	const apImageObject = {
		"apImageLeftTxt": getStorageItem("apImageLeftTxt"),
		"apImageTopTxt": getStorageItem("apImageTopTxt"),
		"apImageHeightTxt": getStorageItem("apImageHeightTxt"),
		"apImageWidthTxt": getStorageItem("apImageWidthTxt"),
		"apImageFontTxt": getStorageItem("apImageFontTxt"),
		"apImageCSSTxt": getStorageItem("apImageCSSTxt"),
		"apImageAutoMoveCB": getStorageItem("apImageAutoMoveCB")
	};
	bc.postMessage({ "apImage": apImageObject });

	var hpBPLeft = parseInt(getStorageItem("hpNameLeftTxt")) + (parseInt(getStorageItem("hpNameWidthTxt")) / 2);
	var hpBPTop = parseInt(getStorageItem("hpNameTopTxt")) - parseInt(getStorageItem("bpHeightTxt")) - 5;
	const hpBPIconObject = {
		"bpLeftTxt": hpBPLeft.toString() + 'px',
		"bpTopTxt": hpBPTop.toString() + 'px',
		"bpHeightTxt": getStorageItem("bpHeightTxt"),
		"bpWidthTxt": getStorageItem("bpWidthTxt"),
		"bpCSSTxt": getStorageItem("bpCSSTxt"),
		"bpBGNoneCB": getStorageItem("bpBGNoneCB")
	};
	bc.postMessage({ "hpBPIcon": hpBPIconObject });

	var apBPLeft = parseInt(getStorageItem("apNameLeftTxt")) + (parseInt(getStorageItem("apNameWidthTxt")) / 2);
	var apBPTop = parseInt(getStorageItem("apNameTopTxt")) - parseInt(getStorageItem("bpHeightTxt")) - 5;
	const apBPIconObject = {
		"bpLeftTxt": apBPLeft.toString() + 'px',
		"bpTopTxt": apBPTop.toString() + 'px',
		"bpHeightTxt": getStorageItem("bpHeightTxt"),
		"bpWidthTxt": getStorageItem("bpWidthTxt"),
		"bpCSSTxt": getStorageItem("bpCSSTxt"),
		"bpBGNoneCB": getStorageItem("bpBGNoneCB")
	};
	bc.postMessage({ "apBPIcon": apBPIconObject });

	const shotClockContainerObject = {
		"shotClockEnabledCB": getStorageItem("poolStatConfigCueTools"),
		"shotClockLeftTxt": getStorageItem("shotClockLeftTxt"),
		"shotClockTopTxt": getStorageItem("shotClockTopTxt"),
		"shotClockHeightTxt": getStorageItem("shotClockHeightTxt"),
		"shotClockWidthTxt": getStorageItem("shotClockWidthTxt"),
		"shotClockFontTxt": getStorageItem("shotClockFontTxt"),
		"shotClockCSSTxt": getStorageItem("shotClockCSSTxt"),
		"shotClockBGTxt": getStorageItem("shotClockBGTxt"),
		"shotClockBGNoneCB": getStorageItem("shotClockBGNoneCB"),
		"shotClockNormalTxt": getStorageItem("shotClockNormalTxt"),
		"shotClock5SecondTxt": getStorageItem("shotClock5SecondTxt"),
		"shotClockCompletedTxt": getStorageItem("shotClockCompletedTxt")
	};
	bc.postMessage({ "shotClockContainer": shotClockContainerObject });

	const hpExtObject = {
		"hpExtEnabledCB": getStorageItem("poolStatConfigCueTools"),
		"hpExtLeftTxt": getStorageItem("hpExtLeftTxt"),
		"hpExtTopTxt": getStorageItem("hpExtTopTxt"),
		"hpExtHeightTxt": getStorageItem("hpExtHeightTxt"),
		"hpExtWidthTxt": getStorageItem("hpExtWidthTxt"),
		"hpExtFontTxt": getStorageItem("hpExtFontTxt"),
		"hpExtCSSTxt": getStorageItem("hpExtCSSTxt"),
		"hpExtFGTxt": getStorageItem("hpExtFGTxt"),
		"hpExtBGTxt": getStorageItem("hpExtBGTxt"),
		"hpExtBGNoneCB": getStorageItem("hpExtBGNoneCB"),
	};
	bc.postMessage({ "hpExtContainer": hpExtObject });

	const apExtObject = {
		"apExtEnabledCB": getStorageItem("poolStatConfigCueTools"),
		"apExtLeftTxt": getStorageItem("apExtLeftTxt"),
		"apExtTopTxt": getStorageItem("apExtTopTxt"),
		"apExtHeightTxt": getStorageItem("apExtHeightTxt"),
		"apExtWidthTxt": getStorageItem("apExtWidthTxt"),
		"apExtFontTxt": getStorageItem("apExtFontTxt"),
		"apExtCSSTxt": getStorageItem("apExtCSSTxt"),
		"apExtFGTxt": getStorageItem("apExtFGTxt"),
		"apExtBGTxt": getStorageItem("apExtBGTxt"),
		"apExtBGNoneCB": getStorageItem("apExtBGNoneCB"),
	};
	bc.postMessage({ "apExtContainer": apExtObject });

	const matchClockContainerObject = {
		"matchClockEnabledCB": getStorageItem("poolStatConfigCueTools"),
		"matchClockLeftTxt": getStorageItem("matchClockLeftTxt"),
		"matchClockTopTxt": getStorageItem("matchClockTopTxt"),
		"matchClockHeightTxt": getStorageItem("matchClockHeightTxt"),
		"matchClockWidthTxt": getStorageItem("matchClockWidthTxt"),
		"matchClockFontTxt": getStorageItem("matchClockFontTxt"),
		"matchClockCSSTxt": getStorageItem("matchClockCSSTxt"),
		"matchClockBGTxt": getStorageItem("matchClockBGTxt"),
		"matchClockBGNoneCB": getStorageItem("matchClockBGNoneCB"),
		"matchClockNormalTxt": getStorageItem("matchClockNormalTxt"),
		"matchClock5SecondTxt": getStorageItem("matchClock5SecondTxt"),
		"matchClockCompletedTxt": getStorageItem("matchClockCompletedTxt")
	};
	bc.postMessage({ "matchClockContainer": matchClockContainerObject });

	postNames("", "");
	postInfo("", "");
}

function downloadData(type) {
	// Assume positionConfigArray is defined globally or passed in
	const positionData = {};

	// Iterate through each ID in the array
	Object.entries(defaultValues).forEach(([key]) => {
		// Get the value using the provided function
		const value = getStorageItem(key); // returns a string
		positionData[key] = value;
	});

	var content;
	// Convert the object to a JSON string
	if (type == "pos") {
		content = JSON.stringify(positionData, null, 2);
	} else {
		content = filterKeysByInstance(localStorage);
	}

	function filterKeysByInstance(parsed) {
		try {
			const filtered = Object.keys(parsed)
				.filter(key => key.includes(INSTANCE_ID))
				.reduce((obj, key) => {
					obj[key] = parsed[key];
					return obj;
				}, {});

			return JSON.stringify(filtered, null, 2);
		} catch (error) {
			console.error("Invalid JSON or missing INSTANCE_ID:", error);
			return "{}";
		}
	}


	const substringToRemove = INSTANCE_ID + "_";
	var jsonArray = JSON.parse(content);
	const transformedData = {};
	for (const key in jsonArray) {
		if (Object.prototype.hasOwnProperty.call(jsonArray, key)) {
			const newKey = key.replace(substringToRemove, "");
			transformedData[newKey] = jsonArray[key];
		}
	}

	content = JSON.stringify(transformedData, null, 2);

	var childWindow = window.open('./common/html/download.html');
	if (childWindow && !childWindow.closed) {
		// Wait for the child window to load its content
		childWindow.onload = function () {
			// Access elements within the child window's document
			const childElement = childWindow.document.getElementById('myCodeBlock');
			if (childElement) {
				childElement.innerHTML = content;
			}
		};
	}
}

function uploadConfig() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.json,application/json';

	input.onchange = (event) => {
		const file = event.target.files[0];
		if (!file) {
			console.error('No file selected.');
			return;
		}

		const reader = new FileReader();

		reader.onload = () => {
			try {
				const text = reader.result;
				const parsed = JSON.parse(text);

				if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
					throw new Error('Parsed content is not a valid object.');
				}

				const proceed = window.confirm(
					'⚠️ Warning: This will overwrite your current instance configuration.\nDo you want to proceed?'
				);

				if (!proceed) {
					console.log('Operation cancelled by user.');
					return;
				}

				for (const [key, value] of Object.entries(parsed)) {
					if (value === "") {
						console.warn(`Skipping key "${key}" due to empty string value.`);
						continue;
					}
					if (key !== "PoolStatRigId") {
						setStorageItem(key, value);
					}
				}
				window.location.reload();
				bp.postMessage({ "reload": true });
			} catch (err) {
				console.error('Error parsing JSON:', err.message);
			}
		};

		reader.onerror = () => {
			console.error('Error reading file:', reader.error);
		};

		reader.readAsText(file);
	};

	input.click();
}

function uploadImage1() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';

	input.onchange = () => {
		const file = input.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const base64String = reader.result.split(',')[1]; // Remove data URL prefix
			setStorageItem('customImage1', base64String);
		};
		reader.onerror = () => {
			console.error('Error reading file:', reader.error);
		};

		reader.readAsDataURL(file);
	};

	input.click();
}

function uploadImage2() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';

	input.onchange = () => {
		const file = input.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const base64String = reader.result.split(',')[1]; // Remove data URL prefix
			setStorageItem('customImage2', base64String);
		};
		reader.onerror = () => {
			console.error('Error reading file:', reader.error);
		};

		reader.readAsDataURL(file);
	};

	input.click();
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

postNames("", "");
postInfo();
startThemeCheck();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// broadcast channel events from browser_source
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

const handlers = {

	refresh(data) {
		console.log('browser_source refreshed');
		intiializePositionConfig();
	},
};

bcr.onmessage = (event) => {
	console.log('Received event data:', event.data);

	// Process each property in the event data
	Object.entries(event.data).forEach(([key, value]) => {
		if (value != null && handlers[key]) {
			handlers[key](event.data);
		}
	});
};
