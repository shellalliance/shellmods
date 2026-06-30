// ==UserScript==
// @name         EggStats
// @version      2.0
// @description  Press y to change UI, x to start statistics tracking, and c to download statistics.
// @icon         https://shellalliance.github.io/icon.png
// @author       @gamingatmidnight
// @match        *://*.shellshock.io/*
// @match        *://*.eggcombat.com/*
// @updateURL    https://github.com/shellalliance/shellmods/raw/refs/heads/main/egg_stats.js
// @downloadURL  https://github.com/shellalliance/shellmods/raw/refs/heads/main/egg_stats.js
// ==/UserScript==

(function() {
    "use strict";

const dashboardStyle = document.createElement("style");
document.head.appendChild(dashboardStyle);
dashboardStyle.innerHTML = `
	#open_dashboard {
		position: fixed;
		bottom: 7em;
		right: 0.5em;
		z-index: 10000;	
	}
	#eggstats_dashboard {
		position: fixed;
		bottom: 7em;
		right: 0.5em;
		z-index: 10000;
		display: flex;
		flex-direction: column;

		& button.ss_button {
			width: 100%;
		}
		
		& button.btn_green {
			letter-spacing: unset;
		}
	}
`;

let dashBoard = document.createElement("div");
dashBoard.id = "eggstats_dashboard";
dashBoard.className = "popup_window popup_lg roundme_md";
dashBoard.innerHTML = `
	<button id="minimize_dashboard" class="popup_close clickme roundme_sm"><i class="fas fa-times text_white fa-2x"></i></button>
	<h1>EggStats</h1>
	<input id="map_name" class="ss_field font-nunito" placeholder="Castle">
	<button id="create_map" class="ss_button btn_blue bevel_blue">Create Map</button>
	<input id="game_title" class="ss_field font-nunito" placeholder="Game Title" value="${localStorage.getItem("eggstats_game_title") || ""}">
	<input id="webhook_url" class="ss_field font-nunito" placeholder="Discord Webhook URL" value="${localStorage.getItem("eggstats_webhook_url") || ""}">
	<button id="track_statistics" class="ss_button btn_green bevel_green">Record</button>
	<button id="share_statistics" class="ss_button btn_blue bevel_blue">Download</button>
	<button id="reset_statistics" class="ss_button btn_yolk bevel_yolk">Reset</button>
`;

document.body.appendChild(dashBoard);

let tickerObserver = null;
let chatObserver = null;
let lastUpdate = 0;
let messageId = null;
let gameTitle;
let webhookUrl;
let playerStatistics = {};
let gameFeed = [];
let interfaceStyle = 1;
let clean = (string) => string?.trim().normalize().toWellFormed().toUpperCase();

function startListeners() {
	document.querySelector("#create_map")?.addEventListener("click", createMap);
	document.querySelector("#track_statistics")?.addEventListener("click", toggleTickerObserver);
	document.querySelector("#share_statistics")?.addEventListener("click", shareStatistics);
	document.querySelector("#reset_statistics")?.addEventListener("click", resetStatistics);
	document.querySelector("#minimize_dashboard")?.addEventListener("click", toggleDashboard);
}

function createMap() {
	let mapName = clean(document.querySelector("#map_name")?.value || "CASTLE");
	let mapSelector = document.querySelector("#joinPrivateGamePopup");

	mapSelector.style.display = "";
	document.querySelector("#joinPrivateGamePopup > .popup_close")?.addEventListener("click", () => { mapSelector.style.display = "none"; } );

	let mapFinder = setInterval(() => {
		let mapSelected = clean(document.querySelector("#mapText")?.innerText);
		
		if (mapSelected === mapName) {
			clearInterval(mapFinder);
			
			setTimeout(() => document.querySelector("#createPrivateGame > div > div > div > button")?.click(), 1000);
			/* setTimeout(() => document.querySelector("#createPrivateGame > div > div > div > button > div > ul > li:nth-child(3)")?.click(), 2000); */
			/* setTimeout(() => document.querySelector("#createPrivateGame > div > div > div > :nth-last-child(1)")?.click(), 3000); */
		} else { document.querySelector("#mapRight")?.click(); }
	}, 50);
}

function trackStatistics() {
	let killer = document.querySelector("#killTicker > :nth-last-child(3)");
	let victim = document.querySelector("#killTicker > :nth-last-child(2)");

	let killerName = clean(killer?.innerText);
	let victimName = clean(victim?.innerText);

	if (!killer || !victim || killerName === victimName) return;

	let killerColor = window.getComputedStyle(killer).color;
	let killerTeam = (killerColor === "rgb(0, 255, 255)") ? "BLUE" : (killerColor === "rgb(245, 62, 64)") ? "RED" : "NONE";
	let victimColor = window.getComputedStyle(victim).color;
	let victimTeam = (victimColor === "rgb(0, 255, 255)") ? "BLUE" : (victimColor === "rgb(245, 62, 64)") ? "RED" : "NONE";

	if (!playerStatistics[killerName]) playerStatistics[killerName] = { kills: 0, deaths: 0, team: killerTeam, color: killerColor };
	if (!playerStatistics[victimName]) playerStatistics[victimName] = { kills: 0, deaths: 0, team: victimTeam, color: victimColor };

	playerStatistics[killerName].kills++;
	playerStatistics[victimName].deaths++;

	playerStatistics[killerName].team = killerTeam;
	playerStatistics[victimName].team = victimTeam;

	playerStatistics[killerName].color = killerColor;
	playerStatistics[victimName].color = victimColor;

	let timestamp = new Date().toJSON();
	gameFeed.push(`[${timestamp}] KILL by ${killerName} (Team ${killerTeam}) on ${victimName} (Team ${victimTeam})`);

	if (Date.now() - lastUpdate < 500) return;
	lastUpdate = Date.now();
	liveStatistics();
}

function trackChat() {
	let chat = document.querySelector("#chatOut > :last-child > span");
	let player = document.querySelector("#chatOut > :last-child > div");

	let chatContent = clean(chat?.innerText);
	let playerName = clean(player?.innerText).slice(0, -1);

	if (!playerName) return;

	let playerColor = window.getComputedStyle(player).color;
	let playerTeam = (playerColor === "rgb(0, 255, 255)") ? "BLUE" : (playerColor === "rgb(245, 62, 64)") ? "RED" : "NONE";
	playerStatistics[playerName].team = playerTeam;
	playerStatistics[playerName].color = playerColor;

	let timestamp = new Date().toJSON();
	gameFeed.push(`[${timestamp}] CHAT by ${playerName} (Team ${playerTeam}) is ${chatContent}`);

	if (chatContent.includes("?STATS") || chatContent.includes("/STATS")) {
		let statistics = playerStatistics[playerName] || { kills: 0, deaths: 0 };
		let kills = statistics.kills || 0;
		let deaths = statistics.deaths || 0;
		let kdr = (kills/ (statistics.deaths || 1)).toFixed(2);
		document.getElementById("chatIn").value = `${playerName} // ${kills}K // ${deaths}D // ${kdr}`;
		extern.onChatKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
	}

	if (chatContent.includes("?SAVE") || chatContent.includes("/SAVE")) {
		shareStatistics();
	}
}

async function liveStatistics() {
	webhookUrl = document.querySelector("#webhook_url")?.value || localStorage.getItem("eggstats_webhook_url");
	if (webhookUrl) localStorage.setItem("eggstats_webhook_url", webhookUrl);

	gameTitle = document.querySelector("#game_title")?.value || localStorage.getItem("eggstats_game_title");
	if (gameTitle) localStorage.setItem("eggstats_game_title", gameTitle);

	let mapName = clean(document.querySelector("#serverAndMapInfo > :nth-child(2)")?.innerText);
	let serverName = clean(document.querySelector("#serverAndMapInfo > :nth-child(4)")?.innerText);
	let mapCode = document.querySelector("#shareLinkPopup h1")?.innerText?.toLowerCase();
	let timestamp = Math.floor(Date.now() / 1000);

	let header = `${"PLAYER".padEnd(15)} // ${"KILLS".padEnd(6)} // ${"DEATHS".padEnd(6)} // ${"KDR".padEnd(4)} // ${"TEAM".padEnd(4)}\n`;
	let rows = Object.entries(playerStatistics)
		.sort(([, lower], [, higher]) => higher.kills - lower.kills)
		.map(([player, statistics]) => {
			let name = player.padEnd(15).slice(0, 15);
			let kills = String(statistics.kills).padEnd(6).slice(0, 6);
			let deaths = String(statistics.deaths).padEnd(6).slice(0, 6);
			let kdr = String((statistics.kills / (statistics.deaths || 1)).toFixed(2)).padEnd(4).slice(0, 4);
			let team = String(statistics.team).padEnd(4).slice(0, 4);
			return `${name} // ${kills} // ${deaths} // ${kdr} // ${team}`;
		})
		.join("\n");

	let messagePayload = JSON.stringify({
		content: `# ${clean(gameTitle) || "SHELL SHOCKERS GAME"}\nMAP \`${mapName}\`\nSERVER \`${serverName}\`\n-# Updated <t:${timestamp}:R> at <t:${timestamp}:t>\n## STATISTICS\n\`\`\`\n${header + rows}\n\`\`\``,
		username: "EggStats",
		avatar_url: "https://shellalliance.github.io/icon.png",
	})

	if (messageId) {
		fetch(`${webhookUrl}/messages/${messageId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: messagePayload
		});
	} else {
		let webhookResponse = await fetch(`${webhookUrl}?wait=true`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: messagePayload
		});

		let messageData = await webhookResponse.json();
		messageId = messageData.id;
	}
}

function shareStatistics() {
	liveStatistics();

	webhookUrl = document.querySelector("#webhook_url")?.value || localStorage.getItem("eggstats_webhook_url");
	if (webhookUrl) localStorage.setItem("eggstats_webhook_url", webhookUrl);

	gameTitle = document.querySelector("#game_title")?.value || localStorage.getItem("eggstats_game_title");
	if (gameTitle) localStorage.setItem("eggstats_game_title", gameTitle);

	let mapName = clean(document.querySelector("#serverAndMapInfo > :nth-child(2)")?.innerText);
	let serverName = clean(document.querySelector("#serverAndMapInfo > :nth-child(4)")?.innerText);
	let mapCode = document.querySelector("#shareLinkPopup h1")?.innerText?.toLowerCase();

	let header = `${"PLAYER".padEnd(15)} // ${"KILLS".padEnd(6)} // ${"DEATHS".padEnd(6)} // ${"KDR".padEnd(4)} // ${"TEAM".padEnd(4)}\n`;
	let rows = Object.entries(playerStatistics)
		.sort(([, lower], [, higher]) => higher.kills - lower.kills)
		.map(([player, statistics]) => {
			let name = player.padEnd(15).slice(0, 15);
			let kills = String(statistics.kills).padEnd(6).slice(0, 6);
			let deaths = String(statistics.deaths).padEnd(6).slice(0, 6);
			let kdr = String((statistics.kills / (statistics.deaths || 1)).toFixed(2)).padEnd(4).slice(0, 4);
			let team = String(statistics.team).padEnd(4).slice(0, 4);
			return `${name} // ${kills} // ${deaths} // ${kdr} // ${team}`;
		})
		.join("\n");

	let messagePayload = JSON.stringify({
		content: `# ${clean(gameTitle) || "SHELL SHOCKERS GAME"}\nMAP \`${mapName}\`\nSERVER \`${serverName}\`\nINVITE [${mapCode}](https://shellshock.io/#${mapCode})\n## STATISTICS\n\`\`\`\n${header + rows}\n\`\`\``,
		username: "EggStats",
		avatar_url: "https://shellalliance.github.io/icon.png",
	})

	let timestamp = new Date().toJSON();
	gameFeed.push(`[${timestamp}] DOWNLOAD Game ${mapCode} ${gameTitle ? `(Name ${clean(gameTitle)}) ` : ""}from ${mapName} on ${serverName}`);

	let gameFeedContent = gameFeed.join("\n");
	let gameFeedFile = new File([gameFeedContent], `gameFeed-${mapCode}.txt`, { type: "text/plain" });
	let messageData = new FormData();
	messageData.append("files[0]", gameFeedFile);
	messageData.append("payload_json", messagePayload);

	fetch(webhookUrl, {
		method: "POST",
		body: messageData
	});
}

function resetStatistics() {
	let timestamp = new Date().toJSON();
	gameFeed = [`[${timestamp}] RESET Statistics`];

	playerStatistics = {};
	messageId = null;
	if (tickerObserver) { toggleTickerObserver(); }
}

function startChatObserver() {
	if (!document.querySelector("#chatOut")) {
		let chatFinder = setInterval(() => {
			if (document.querySelector("#chatOut")) {
				clearInterval(chatFinder);
				chatObserver = new MutationObserver(trackChat);
				chatObserver.observe(document.querySelector("#chatOut"), { childList: true });
			}
		}, 500);
	} else {
		chatObserver = new MutationObserver(trackChat);
		chatObserver.observe(document.querySelector("#chatOut"), { childList: true });
	}
}

function toggleTickerObserver() {
	liveStatistics();

	if (!tickerObserver) {
		let killTicker = document.querySelector("#killTicker");
		document.querySelector("#track_statistics").className = "ss_button btn_red bevel_red";
		document.querySelector("#track_statistics").innerText = "Pause";
		tickerObserver = new MutationObserver(trackStatistics);
		tickerObserver.observe(killTicker, { childList: true });

		let timestamp = new Date().toJSON();
		gameFeed.push(`[${timestamp}] START Recording`);

	} else {
		document.querySelector("#track_statistics").className = "ss_button btn_green bevel_green";
		document.querySelector("#track_statistics").innerText = "Record";
		tickerObserver.disconnect();
		tickerObserver = null;

		let timestamp = new Date().toJSON();
		gameFeed.push(`[${timestamp}] PAUSE Recording`);
	}
}

function toggleDashboard() {
	gameTitle = document.querySelector("#game_title")?.value;

	if (document.querySelector("#open_dashboard")) {
		document.querySelector("#open_dashboard").outerHTML = `
		<div id="eggstats_dashboard" class="popup_window popup_lg roundme_md">
		<button id="minimize_dashboard" class="popup_close clickme roundme_sm"><i class="fas fa-times text_white fa-2x"></i></button>
		<h1>EggStats</h1>
		<input id="map_name" class="ss_field font-nunito" placeholder="Castle">
		<button id="create_map" class="ss_button btn_blue bevel_blue">Create Map</button>
		<input id="game_title" class="ss_field font-nunito" placeholder="Game Title" value="${localStorage.getItem("eggstats_game_title") || ""}">
		<input id="webhook_url" class="ss_field font-nunito" placeholder="Discord Webhook URL" value="${localStorage.getItem("eggstats_webhook_url") || ""}">
		<button id="track_statistics" class="ss_button ${tickerObserver ? "btn_red bevel_red" : "btn_green bevel_green"}">${tickerObserver ? "Pause" : "Record"}</button>
		<button id="share_statistics" class="ss_button btn_blue bevel_blue">Download</button>
		<button id="reset_statistics" class="ss_button btn_yolk bevel_yolk">Reset</button>
		</div>
		`;
		startListeners();
	} else if (document.querySelector("#eggstats_dashboard")) {
		document.querySelector("#eggstats_dashboard").outerHTML = `<img id="open_dashboard" src="https://shellalliance.github.io/icon.png" style="width: 50px; cursor: pointer;" class="clickme" />`
		document.querySelector("#open_dashboard")?.addEventListener("click", toggleDashboard);
	}
}

function toggleInterface() {
	if (interfaceStyle === 1) {
		interfaceStyle = 2;
		document.documentElement.requestFullscreen();
		dashboardStyle.innerHTML = `
			#inGameUI {display: none !important;}
			#account_panel {display: none !important;}
			#pausePopupWrap {display: none !important;}
			#spectate {padding: unset !important;}
			#spectate div:last-of-type {display: none !important;}
			#spectate>div:first-of-type {display: none !important;}
			#shellStreakContainer {display: none !important;}
			#chw-game-screen * {display: none !important;}
			#eggstats_dashboard {display: none !important;}
			#open_dashboard {display: none !important;}
		`;
	} else if (interfaceStyle === 2) {
		interfaceStyle = 3;
		document.documentElement.requestFullscreen();
		dashboardStyle.innerHTML = `
			aside {display: none !important;}
			.player-list-wrapper {display: none !important;}
			.pause-ui-element {display: none !important;}
			#killTicker {display: none !important;}
			#inGameUI {display: none !important;}
			#account_panel {display: none !important;}
			#pausePopupWrap {display: none !important;}
			#spectate {padding: unset !important;}
			#spectate div:last-of-type {display: none !important;}
			#spectate>div:first-of-type {display: none !important;}
			#shellStreakContainer {display: none !important;}
			#chw-game-screen * {display: none !important;}
			#eggstats_dashboard {display: none !important;}
			#open_dashboard {display: none !important;}
		`;
	} else {
		interfaceStyle = 1;
		dashboardStyle.innerHTML = `
			#open_dashboard {
				position: fixed;
				bottom: 7em;
				right: 0.5em;
				z-index: 10000;	
			}
			#eggstats_dashboard {
				position: fixed;
				bottom: 7em;
				right: 0.5em;
				z-index: 10000;
				display: flex;
				flex-direction: column;
				& button.ss_button {
					width: 100%;
				}
			}
		`;
	}
}

document.addEventListener("keypress", (event) => {
	if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) { return; }

	if (event.key.toLowerCase() === "y") toggleInterface();
	if (event.key.toLowerCase() === "x") toggleTickerObserver();
	if (event.key.toLowerCase() === "c") shareStatistics();
});

startListeners();
startChatObserver();

})();
