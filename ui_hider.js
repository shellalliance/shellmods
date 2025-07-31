// ==UserScript==
// @name         UI Hider
// @version      1.3
// @description  Hide UI Elements by pressing "+" or "*"
// @icon         https://raw.githubusercontent.com/shellalliance/shellalliance.github.io/refs/heads/main/icon.png
// @author       @gamingatmidnight
// @match        *://shellshock.io/*
// @updateURL    https://github.com/shellalliance/shellmods/raw/refs/heads/main/ui_hider.js
// @downloadURL  https://github.com/shellalliance/shellmods/raw/refs/heads/main/ui_hider.js
// ==/UserScript==

(function() {
    "use strict";

    const cssContent1 = `
#inGameUI {display: none !important;}
#account_panel {display: none !important;}
#pausePopupWrap {display: none !important;}
#spectate {padding: unset !important;}
#spectate div:last-of-type {display: none !important;}
#spectate>div:first-of-type {display: none !important;}
#shellStreakContainer {display: none !important;}
#chw-game-screen * {display: none !important;}
`;

    const styleElement1 = document.createElement("style");
    styleElement1.id = "customStyle1";
    styleElement1.textContent = "";
    document.head.appendChild(styleElement1);

    document.addEventListener("keyup", (event) => {
        if (event.key === "*") {
            event.preventDefault();
            if (styleElement1.textContent === "") {
                styleElement1.textContent = cssContent1;
            } else {
                styleElement1.textContent = "";
            }
        }
    });

    const cssContent2 = `
aside {display: none !important;}
.player-list-wrapper {display: none !important;}
.pause-ui-element {display: none !important;}
#killTicker {display: none !important;}
`;

    const styleElement2 = document.createElement("style");
    styleElement2.id = "customStyle2";
    styleElement2.textContent = "";
    document.head.appendChild(styleElement2);

    document.addEventListener("keyup", (event) => {
        if (event.key === "+") {
            event.preventDefault();
            if (styleElement2.textContent === "") {
                styleElement2.textContent = cssContent2;
            } else {
                styleElement2.textContent = "";
            }
        }
    });

})();
