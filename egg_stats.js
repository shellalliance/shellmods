// ==UserScript==
// @name         EggStats
// @version      1.1
// @description  Press y to change UI, x to start kill feed, and c to download statistics.
// @icon         https://shellalliance.github.io/icon.png
// @author       @gamingatmidnight
// @match        *://*shellshock*/*
// @match        *://*eggcombat*/*
// @match        *://*violentegg*/*
// @match        *://*scrambled*/*
// @match        *://*yolk*/*
// @updateURL    https://github.com/shellalliance/shellmods/raw/refs/heads/main/egg_stats.js
// @downloadURL  https://github.com/shellalliance/shellmods/raw/refs/heads/main/egg_stats.js
// ==/UserScript==

(function() {
    "use strict";

const dashboardStyle = document.createElement(`style`);
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
	}
`;

let dashBoard = document.createElement(`div`);
dashBoard.id = `eggstats_dashboard`;
dashBoard.className = "popup_window popup_lg roundme_md";
dashBoard.innerHTML = `
	<button id="minimize_dashboard" class="popup_close clickme roundme_sm"><i class="fas fa-times text_white fa-2x"></i></button>
	<h1>EggStats</h1>
	<input id="map_name" class="ss_field font-nunito" placeholder="Castle">
	<button id="create_map" class="ss_button btn_blue bevel_blue">Create Map</button>
	<input id="webhook_url" class="ss_field font-nunito" placeholder="Discord Webhook URL">
	<button id="track_statistics" class="ss_button btn_green bevel_green">Start Tracking</button>
	<button id="share_statistics" class="ss_button btn_blue bevel_blue">Download</button>
	<button id="reset_statistics" class="ss_button btn_yolk bevel_yolk">Reset</button>
`;
document.body.appendChild(dashBoard);

let tickerObserver = null;
let webhookUrl;
let playerStatistics = {};
let interfaceStyle = 1;
let clean = (string) => string?.trim().normalize().toWellFormed().toUpperCase();

function startListeners() {
	document.querySelector(`#create_map`)?.addEventListener(`click`, createMap);
	document.querySelector(`#track_statistics`)?.addEventListener(`click`, toggleObserver);
	document.querySelector(`#share_statistics`)?.addEventListener(`click`, shareStatistics);
	document.querySelector(`#reset_statistics`)?.addEventListener(`click`, resetStatistics);
	document.querySelector(`#minimize_dashboard`)?.addEventListener(`click`, toggleDashboard);
}

function createMap() {
	let mapName = clean(document.querySelector(`#map_name`)?.value || `castle`);
	let mapSelector = document.querySelector(`#joinPrivateGamePopup`);
	if (!mapSelector) { return; }

	mapSelector.style.display = ``;
	document.querySelector(`#joinPrivateGamePopup > .popup_close`)?.addEventListener(`click`, () => { mapSelector.style.display = `none`; } );

	let mapFinder = setInterval(() => {
		let mapSelected = clean(document.querySelector(`#mapText`)?.innerText);
		
		if (mapSelected === mapName) {
			clearInterval(mapFinder);
			
			setTimeout(() => document.querySelector(`#createPrivateGame > div > div > div > button`)?.click(), 1000);
			/* setTimeout(() => document.querySelector(`#createPrivateGame > div > div > div > button > div > ul > li:nth-child(3)`)?.click(), 2000); */
			/* setTimeout(() => document.querySelector(`#createPrivateGame > div > div > div > :nth-last-child(1)`)?.click(), 3000); */
		} else { document.querySelector(`#mapRight`)?.click(); }
	}, 50);
}

function trackStatistics() {
	webhookUrl = document.querySelector(`#webhook_url`)?.value || localStorage.getItem(`eggstats_webhook_url`);
	if (webhookUrl) localStorage.setItem(`eggstats_webhook_url`, webhookUrl);

	let killer = clean(document.querySelector(`#killTicker > :nth-last-child(3)`)?.innerText);
	let victim = clean(document.querySelector(`#killTicker > :nth-last-child(2)`)?.innerText);

	if (!killer || !victim || killer === victim) return;

	if (!playerStatistics[killer]) playerStatistics[killer] = { kills: 0, deaths: 0 };
	if (!playerStatistics[victim]) playerStatistics[victim] = { kills: 0, deaths: 0 };

	playerStatistics[killer].kills++;
	playerStatistics[victim].deaths++;

	fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			content: `**${killer}** KILLED **${victim}**`,
			username: "EggStats",
			avatar_url: "https://shellalliance.github.io/icon.png",
		})
	});
}

function shareStatistics() {
	webhookUrl = document.querySelector(`#webhook_url`)?.value || localStorage.getItem(`eggstats_webhook_url`);
	if (webhookUrl) localStorage.setItem(`eggstats_webhook_url`, webhookUrl);
	
	let mapName = clean(document.querySelector(`#serverAndMapInfo > :nth-child(2)`)?.innerText);
	let serverName = clean(document.querySelector(`#serverAndMapInfo > :nth-child(4)`)?.innerText);
	let mapCode = document.querySelector(`#shareLinkPopup h1`)?.innerText.toLowerCase();

	let header = `${"PLAYER".padEnd(15)} // ${"KILLS".padEnd(5)} // ${"DEATHS".padEnd(6)} // ${"KDR".padEnd(5)}\n`;
	let rows = Object.entries(playerStatistics)
		.sort(([, lower], [, higher]) => higher.kills - lower.kills)
		.map(([player, statistics]) => {
			let name = player.padEnd(15).slice(0, 15);
			let kills = String(statistics.kills).padEnd(5);
			let deaths = String(statistics.deaths).padEnd(6);
			let kdr = String((statistics.kills / (statistics.deaths || 1)).toFixed(2)).padEnd(5);
			return `${name} // ${kills} // ${deaths} // ${kdr}`;
		})
		.join('\n');

	fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			content: `**MAP** \`${mapName}\`\n**SERVER** \`${serverName}\`\n**INVITE** https://shellshock.io/#${mapCode}\n## STATISTICS\n\`\`\`\n${header + rows}\n\`\`\``,
			username: "EggStats",
			avatar_url: "https://shellalliance.github.io/icon.png",
		})
	});
}

function resetStatistics() {
	playerStatistics = {};
	if (tickerObserver) { toggleObserver(); }
}

function toggleObserver() {
	if (!tickerObserver) {
		let killTicker = document.querySelector(`#killTicker`);
		document.querySelector(`#track_statistics`).className = `ss_button btn_red bevel_red`;
		document.querySelector(`#track_statistics`).innerText = `Stop Tracking`;
		tickerObserver = new MutationObserver(trackStatistics);
		tickerObserver.observe(killTicker, {
			childList: true
		});
	} else {
		document.querySelector(`#track_statistics`).className = `ss_button btn_green bevel_green`;
		document.querySelector(`#track_statistics`).innerText = `Start Tracking`;
		tickerObserver.disconnect();
		tickerObserver = null;
	}
}

function toggleDashboard() {
	if (document.querySelector(`#open_dashboard`)) {
		document.querySelector(`#open_dashboard`).outerHTML = `
		<div id="eggstats_dashboard" class="popup_window popup_lg roundme_md">
		<button id="minimize_dashboard" class="popup_close clickme roundme_sm"><i class="fas fa-times text_white fa-2x"></i></button>
		<h1>EggStats</h1>
		<input id="map_name" class="ss_field font-nunito" placeholder="Castle">
		<button id="create_map" class="ss_button btn_blue bevel_blue">Create Map</button>
		<input id="webhook_url" class="ss_field font-nunito" placeholder="Discord Webhook URL">
		<button id="track_statistics" class="ss_button btn_green bevel_green">Start Tracking</button>
		<button id="share_statistics" class="ss_button btn_blue bevel_blue">Download</button>
		<button id="reset_statistics" class="ss_button btn_yolk bevel_yolk">Reset</button>
		</div>
		`;
		startListeners();
	} else if (document.querySelector(`#eggstats_dashboard`)) {
		document.querySelector(`#eggstats_dashboard`).outerHTML = `
		<img id="open_dashboard" src="https://shellalliance.github.io/icon.png" style="width: 50px; cursor: pointer;" class="clickme" />
		`
		document.querySelector(`#open_dashboard`)?.addEventListener(`click`, toggleDashboard);
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

document.addEventListener(`keypress`, (event) => {
	if ([`INPUT`, `TEXTAREA`, `SELECT`].includes(event.target.tagName)) { return; }

	if (event.key.toLowerCase() === `y`) toggleInterface();
	if (event.key.toLowerCase() === `x`) toggleObserver();
	if (event.key.toLowerCase() === `c`) shareStatistics();
});

startListeners();

})();
