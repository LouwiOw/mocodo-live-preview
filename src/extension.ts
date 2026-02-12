import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// --- CONFIGURATION DES THÈMES PERSONNALISÉS ---
const CUSTOM_THEMES: any = {
    "looping_soft": {
        "name": "Looping (Doux)",
        "colors": {
            "background_color": "white",
            "entity_color": "#ffffcc",              // Jaune Pâle
            "entity_cartouche_color": "#ffffcc",
            "association_color": "#99ccff",         // Bleu Ciel
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
            "note_opacity": 1.0,
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
            "entity_color": "#ffeb3b",              // JAUNE POUSSIN FLASHY
            "entity_cartouche_color": "#ffeb3b",
            "association_color": "#00b0ff",         // BLEU ELECTRIQUE
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
            "note_opacity": 1.0,
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

// Liste des thèmes natifs de Mocodo
const NATIVE_THEMES = [
    { id: 'ocean', name: 'Ocean' },
    { id: 'desert', name: 'Désert' },
    { id: 'bw', name: 'Noir & Blanc' },
    { id: 'xmen', name: 'X-Men (Sombre)' },
    { id: 'virid', name: 'Virid (Vert)' }
];

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined = undefined;
    let timeout: NodeJS.Timeout | undefined = undefined;
    
    // On stocke le thème actuel ici (par défaut : looping_soft)
    let currentTheme = "looping_soft";

    const previewCommand = vscode.commands.registerCommand('mocodo-live.preview', () => {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
        } else {
            panel = vscode.window.createWebviewPanel(
                'mocodoPreview', 'Mocodo Preview', vscode.ViewColumn.Beside, { enableScripts: true }
            );
            
            // Écouter les messages venant de la WebView (Changement de thème)
            panel.webview.onDidReceiveMessage(
                message => {
                    if (message.command === 'changeTheme') {
                        currentTheme = message.theme;
                        triggerUpdate(panel); // On relance le rendu immédiatement
                    }
                },
                undefined,
                context.subscriptions
            );

            panel.onDidDispose(() => { panel = undefined; });
        }
        triggerUpdate(panel);
    });

    function triggerUpdate(p: vscode.WebviewPanel | undefined) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => { if (p) updatePreview(p, currentTheme); }, 500);
    }

    vscode.workspace.onDidChangeTextDocument(e => {
        if (panel && e.document === vscode.window.activeTextEditor?.document) {
            triggerUpdate(panel);
        }
    });

    vscode.window.onDidChangeActiveTextEditor(e => {
        if (panel && e && e.document.languageId === 'mocodo') {
            triggerUpdate(panel);
        }
    });

    context.subscriptions.push(previewCommand);
}

function updatePreview(panel: vscode.WebviewPanel, themeId: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'mocodo') return;

    const text = editor.document.getText();
    const tempDir = require('os').tmpdir();
    const tempMcd = path.join(tempDir, "vsc_mocodo_temp.mcd");
    const tempSvg = path.join(tempDir, "vsc_mocodo_temp.svg");
    const tempTheme = path.join(tempDir, "vsc_mocodo_theme.json");

    try {
        fs.writeFileSync(tempMcd, text);
    } catch (e) {
        vscode.window.showErrorMessage("Erreur d'écriture : " + e);
        return;
    }

    let command = "";

    // Logique de sélection du thème
    if (CUSTOM_THEMES[themeId]) {
        // C'est un thème custom (JSON)
        try {
            fs.writeFileSync(tempTheme, JSON.stringify(CUSTOM_THEMES[themeId].colors));
            command = `python -m mocodo --input "${tempMcd}" --colors "${tempTheme}"`;
        } catch (e) {
            console.error(e);
        }
    } else {
        // C'est un thème natif Mocodo (string simple)
        command = `python -m mocodo --input "${tempMcd}" --colors ${themeId}`;
    }

    exec(command, { cwd: tempDir }, (err, stdout, stderr) => {
        if (err) {
            panel.webview.html = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h3 style="color:red">Erreur Mocodo</h3>
                    <pre style="background: #f0f0f0; padding: 10px; color: #d32f2f;">${stderr || err.message}</pre>
                </div>`;
            return;
        }

        if (fs.existsSync(tempSvg)) {
            const svgContent = fs.readFileSync(tempSvg, 'utf8');
            panel.webview.html = getWebViewContent(svgContent, themeId);
        }
    });
}

function getWebViewContent(svg: string, currentTheme: string) {
    
    // Génération des options du menu déroulant
    let optionsHtml = "";
    
    // 1. Ajouter les thèmes custom
    for (const [key, value] of Object.entries(CUSTOM_THEMES)) {
        const isSelected = key === currentTheme ? "selected" : "";
        optionsHtml += `<option value="${key}" ${isSelected}>${(value as any).name}</option>`;
    }

    // 2. Ajouter un séparateur
    optionsHtml += `<option disabled>──────────</option>`;

    // 3. Ajouter les thèmes natifs
    NATIVE_THEMES.forEach(t => {
        const isSelected = t.id === currentTheme ? "selected" : "";
        optionsHtml += `<option value="${t.id}" ${isSelected}>${t.name}</option>`;
    });

    // Icônes SVG
    const iconCopy = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const iconCheck = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    const iconPalette = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`;

    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --btn-bg: #f3f3f3;
                --btn-hover: #e0e0e0;
                --btn-border: #ccc;
                --icon-color: #424242;
                --container-bg: #ffffff;
            }
            body.vscode-dark {
                --btn-bg: #3c3c3c;
                --btn-hover: #4a4a4a;
                --btn-border: #555555;
                --icon-color: #e0e0e0;
                --container-bg: #1e1e1e;
            }

            body { 
                background-color: var(--vscode-editor-background, white); 
                display: flex; 
                flex-direction: column;
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                padding: 20px; 
                font-family: var(--vscode-font-family);
                overflow: hidden; 
            }

            #diagram-container {
                box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
                background: white;
                padding: 20px;
                border-radius: 4px;
                margin-top: 10px;
                overflow: auto;
                max-width: 100%;
                max-height: 90vh;
                display: flex;
                justify-content: center;
            }

            svg { 
                max-width: 100%; 
                height: auto; 
                display: block;
            }
            
            .controls {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: row; 
                gap: 8px;
                z-index: 1000;
                background: rgba(128, 128, 128, 0.1);
                backdrop-filter: blur(2px);
                padding: 5px;
                border-radius: 8px;
            }

            .icon-btn {
                width: 36px;
                height: 36px;
                background-color: var(--btn-bg);
                border: 1px solid var(--btn-border);
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--icon-color);
                transition: all 0.2s ease;
                position: relative;
                outline: none;
            }

            .icon-btn:hover {
                background-color: var(--btn-hover);
                transform: translateY(-1px);
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }

            .icon-btn:active { transform: translateY(1px); }

            .copied { 
                background-color: #2da44e !important; 
                color: white !important;
                border-color: #2da44e !important;
            }

            .select-wrapper { position: relative; overflow: hidden; }
            
            #theme-select {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                opacity: 0; cursor: pointer; appearance: none;
            }
        </style>
    </head>
    <body>
        
        <div class="controls">
            <button id="copy-btn" class="icon-btn" onclick="copyImage()" title="Copier l'image">
                <span id="icon-container">${iconCopy}</span>
            </button>

            <div class="icon-btn select-wrapper" title="Changer le thème">
                ${iconPalette}
                <select id="theme-select" onchange="changeTheme()">
                    ${optionsHtml}
                </select>
            </div>
        </div>

        <div id="diagram-container">
            ${svg}
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function changeTheme() {
                const selector = document.getElementById('theme-select');
                vscode.postMessage({ command: 'changeTheme', theme: selector.value });
            }

            function copyImage() {
                // CORRECTION ICI : On cible le SVG DANS le conteneur du diagramme
                const svgElement = document.querySelector('#diagram-container svg');
                
                const btn = document.getElementById('copy-btn');
                const iconContainer = document.getElementById('icon-container');
                
                if (!svgElement) {
                    console.error("Aucun SVG trouvé dans le conteneur");
                    return;
                }

                const serializer = new XMLSerializer();
                let source = serializer.serializeToString(svgElement);
                
                if(!source.match(/^<svg[^>]+xmlns="http\\:\\/\\/www\\.w3\\.org\\/2000\\/svg"/)){
                    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                
                const svgBlob = new Blob([source], {type: "image/svg+xml;charset=utf-8"});
                const url = URL.createObjectURL(svgBlob);
                const img = new Image();
                
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const bbox = svgElement.getBoundingClientRect();
                    const scale = 2; 
                    canvas.width = bbox.width * scale;
                    canvas.height = bbox.height * scale;
                    const ctx = canvas.getContext("2d");
                    ctx.scale(scale, scale);
                    
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, bbox.width, bbox.height);
                    
                    ctx.drawImage(img, 0, 0, bbox.width, bbox.height);

                    canvas.toBlob(function(blob) {
                        try {
                            const item = new ClipboardItem({ "image/png": blob });
                            navigator.clipboard.write([item]).then(function() {
                                btn.classList.add('copied');
                                iconContainer.innerHTML = '${iconCheck}';
                                setTimeout(() => {
                                    btn.classList.remove('copied');
                                    iconContainer.innerHTML = '${iconCopy}';
                                }, 2000);
                            });
                        } catch (err) {
                            console.error("Erreur copie : " + err);
                            alert("Erreur lors de la copie.");
                        }
                    });
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        </script>
    </body>
    </html>`;
}

export function deactivate() {}