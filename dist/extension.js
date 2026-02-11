"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var import_child_process = require("child_process");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var CUSTOM_THEMES = {
  "looping_soft": {
    "name": "Looping (Doux)",
    "colors": {
      "background_color": "white",
      "entity_color": "#ffffcc",
      "entity_cartouche_color": "#ffffcc",
      "association_color": "#99ccff",
      "association_cartouche_color": "#99ccff",
      "entity_stroke_color": "black",
      "entity_cartouche_text_color": "black",
      "entity_attribute_text_color": "black",
      "association_stroke_color": "black",
      "association_cartouche_text_color": "black",
      "association_attribute_text_color": "black",
      "leg_stroke_color": "black",
      "card_text_color": "black",
      "annotation_text_color": "black",
      "annotation_stroke_color": "black",
      "note_opacity": 1,
      "note_overlay_color": "white",
      "note_color": "#ffffcc",
      "note_text_color": "black",
      "note_stroke_color": "black",
      "transparent_color": "None",
      "margin_color": "white",
      "phantom_event_color": "white",
      "phantom_event_stroke_color": "white",
      "phantom_event_text_color": "white",
      "inheritance_background_color": "white",
      "inheritance_stroke_color": "black",
      "inheritance_arrow_color": "black",
      "annotation_color": "white"
    }
  },
  "looping_flashy": {
    "name": "Looping (Flashy)",
    "colors": {
      "background_color": "white",
      "entity_color": "#ffeb3b",
      "entity_cartouche_color": "#ffeb3b",
      "association_color": "#00b0ff",
      "association_cartouche_color": "#00b0ff",
      "entity_stroke_color": "black",
      "entity_cartouche_text_color": "black",
      "entity_attribute_text_color": "black",
      "association_stroke_color": "black",
      "association_cartouche_text_color": "black",
      "association_attribute_text_color": "black",
      "leg_stroke_color": "black",
      "card_text_color": "black",
      "annotation_text_color": "black",
      "annotation_stroke_color": "black",
      "note_opacity": 1,
      "note_overlay_color": "white",
      "note_color": "#fff59d",
      "note_text_color": "black",
      "note_stroke_color": "black",
      "transparent_color": "None",
      "margin_color": "white",
      "phantom_event_color": "white",
      "phantom_event_stroke_color": "white",
      "phantom_event_text_color": "white",
      "inheritance_background_color": "white",
      "inheritance_stroke_color": "black",
      "inheritance_arrow_color": "black",
      "annotation_color": "white"
    }
  }
};
var NATIVE_THEMES = [
  { id: "ocean", name: "Ocean" },
  { id: "desert", name: "D\xE9sert" },
  { id: "bw", name: "Noir & Blanc" },
  { id: "xmen", name: "X-Men" },
  { id: "virid", name: "Virid" }
];
function activate(context) {
  let panel = void 0;
  let timeout = void 0;
  let currentTheme = "looping_soft";
  const previewCommand = vscode.commands.registerCommand("mocodo-live.preview", () => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.Beside);
    } else {
      panel = vscode.window.createWebviewPanel("mocodoPreview", "Mocodo Preview", vscode.ViewColumn.Beside, { enableScripts: true });
      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "changeTheme") {
          currentTheme = message.theme;
          triggerUpdate(panel);
        }
      }, void 0, context.subscriptions);
      panel.onDidDispose(() => {
        panel = void 0;
      });
    }
    triggerUpdate(panel);
  });
  function triggerUpdate(p) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (p) updatePreview(p, currentTheme);
    }, 500);
  }
  vscode.workspace.onDidChangeTextDocument((e) => {
    if (panel && e.document === vscode.window.activeTextEditor?.document) triggerUpdate(panel);
  });
  vscode.window.onDidChangeActiveTextEditor((e) => {
    if (panel && e && e.document.languageId === "mocodo") triggerUpdate(panel);
  });
  context.subscriptions.push(previewCommand);
}
function updatePreview(panel, themeId) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "mocodo") return;
  const text = editor.document.getText();
  const tempDir = require("os").tmpdir();
  const tempMcd = path.join(tempDir, "vsc_mocodo_temp.mcd");
  const tempSvg = path.join(tempDir, "vsc_mocodo_temp.svg");
  const tempTheme = path.join(tempDir, "vsc_mocodo_theme.json");
  try {
    fs.writeFileSync(tempMcd, text);
  } catch (e) {
    return;
  }
  let command = "";
  if (CUSTOM_THEMES[themeId]) {
    fs.writeFileSync(tempTheme, JSON.stringify(CUSTOM_THEMES[themeId].colors));
    command = `python -m mocodo --input "${tempMcd}" --colors "${tempTheme}"`;
  } else {
    command = `python -m mocodo --input "${tempMcd}" --colors ${themeId}`;
  }
  (0, import_child_process.exec)(command, { cwd: tempDir }, (err, stdout, stderr) => {
    if (fs.existsSync(tempSvg)) {
      const svgContent = fs.readFileSync(tempSvg, "utf8");
      panel.webview.html = getWebViewContent(svgContent, themeId);
    }
  });
}
function getWebViewContent(svg, currentTheme) {
  let optionsHtml = "";
  for (const [key, value] of Object.entries(CUSTOM_THEMES)) {
    optionsHtml += `<option value="${key}" ${key === currentTheme ? "selected" : ""}>${value.name}</option>`;
  }
  optionsHtml += `<option disabled>\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</option>`;
  NATIVE_THEMES.forEach((t) => {
    optionsHtml += `<option value="${t.id}" ${t.id === currentTheme ? "selected" : ""}>${t.name}</option>`;
  });
  const copyIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 4h-3v11h11v-3h-1v2h-9v-9h2v-1zm1 7h9v-9h-9v9zm-1-10h11v11h-11v-11z"/></svg>`;
  const gearIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.4h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.4-.5V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.3zM8 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>`;
  const checkIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>`;
  return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                background-color: white; display: flex; justify-content: center; align-items: flex-start; 
                height: 100vh; margin: 0; padding: 40px; font-family: var(--vscode-font-family); overflow: auto;
            }
            #diagram-container {
                box-shadow: 0 4px 15px rgba(0,0,0,0.1); background: white; padding: 10px; border-radius: 4px; margin-top: 20px;
            }
            svg { max-width: 100%; height: auto; display: block; }
            
            /* --- NOUVEAU CSS POUR LES CONTR\xD4LES --- */
            .controls-wrapper {
                position: fixed; top: 20px; right: 20px; display: flex; flex-direction: column; align-items: flex-end; z-index: 1000;
            }
            .btn-row {
                display: flex; gap: 8px; /* Espace entre les boutons */
            }
            /* Style des petits boutons carr\xE9s */
            .icon-btn {
                width: 32px; height: 32px;
                background-color: var(--vscode-button-background); color: var(--vscode-button-foreground);
                border: none; border-radius: 4px; cursor: pointer;
                display: flex; justify-content: center; align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background 0.2s;
                padding: 0; /* Important pour centrer l'ic\xF4ne */
            }
            .icon-btn:hover { background-color: var(--vscode-button-hoverBackground); }
            .icon-btn svg { width: 18px; height: 18px; } /* Taille des ic\xF4nes */
            
            /* \xC9tat copi\xE9 (vert) */
            .copied { background-color: #2da44e !important; color: white !important; }

            /* Le menu d\xE9roulant cach\xE9 par d\xE9faut */
            #theme-dropdown-container {
                display: none; /* Cach\xE9 */
                margin-top: 8px;
            }
            /* Quand on ajoute la classe 'show', il appara\xEEt */
            #theme-dropdown-container.show { display: block; }

            #theme-select {
                padding: 6px; border-radius: 4px; border: 1px solid #ccc;
                font-family: inherit; font-size: 12px; width: 150px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15); cursor: pointer;
                background: white; color: black;
            }
        </style>
    </head>
    <body>
        
        <div class="controls-wrapper">
            <div class="btn-row">
                <button id="copy-btn" class="icon-btn" onclick="copyImage()" title="Copier l'image dans le presse-papier">
                    ${copyIcon}
                </button>
                <button id="settings-btn" class="icon-btn" onclick="toggleSettings()" title="Changer le th\xE8me">
                    ${gearIcon}
                </button>
            </div>
            <div id="theme-dropdown-container">
                <select id="theme-select" onchange="changeTheme()" size="${Object.keys(CUSTOM_THEMES).length + NATIVE_THEMES.length + 1}">
                    ${optionsHtml}
                </select>
            </div>
        </div>

        <div id="diagram-container">
            ${svg}
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const copyBtn = document.getElementById('copy-btn');
            const settingsContainer = document.getElementById('theme-dropdown-container');
            const originalCopyIcon = '${copyIcon}';
            const checkIcon = '${checkIcon}';

            // Afficher/Cacher le menu de th\xE8me
            function toggleSettings() {
                settingsContainer.classList.toggle('show');
            }

            function changeTheme() {
                const selector = document.getElementById('theme-select');
                vscode.postMessage({ command: 'changeTheme', theme: selector.value });
                toggleSettings(); // On cache le menu apr\xE8s s\xE9lection
            }

            function copyImage() {
                const svgElement = document.querySelector('svg');
                if (!svgElement) return;
                const serializer = new XMLSerializer();
                let source = serializer.serializeToString(svgElement);
                if(!source.match(/^<svg[^>]+xmlns="http\\:\\/\\/www\\.w3\\.org\\/2000\\/svg"/)){ source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"'); }
                const svgBlob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
                const url = URL.createObjectURL(svgBlob);
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const bbox = svgElement.getBoundingClientRect();
                    const scale = 2; 
                    canvas.width = bbox.width * scale; canvas.height = bbox.height * scale;
                    const ctx = canvas.getContext("2d");
                    ctx.scale(scale, scale);
                    ctx.fillStyle = "white"; ctx.fillRect(0, 0, bbox.width, bbox.height);
                    ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
                    canvas.toBlob(function(blob) {
                        try {
                            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(function() {
                                // Feedback visuel sur le bouton (Vert + Coche)
                                copyBtn.classList.add('copied');
                                copyBtn.innerHTML = checkIcon;
                                setTimeout(() => {
                                    copyBtn.classList.remove('copied');
                                    copyBtn.innerHTML = originalCopyIcon;
                                }, 2000);
                            });
                        } catch (err) { alert("Erreur copie : " + err); }
                    });
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        </script>
    </body>
    </html>`;
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
