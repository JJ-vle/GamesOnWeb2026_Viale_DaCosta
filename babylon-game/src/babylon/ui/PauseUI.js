import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Button,
    Slider
} from '@babylonjs/gui';

const THEME = {
    ink: '#f2ead8',
    inkSoft: '#cfc3ab',
    panel: '#101219ee',
    panelStrong: '#181b24f5',
    panelEdge: '#f2ead82e',
    cyan: '#68f0ff',
    pink: '#ff7ac8',
    gold: '#f4cc69',
    shadowCyan: 'rgba(104, 240, 255, 0.22)',
    shadowPink: 'rgba(255, 122, 200, 0.2)',
    shadowGold: 'rgba(244, 204, 105, 0.16)'
};

function addNeonSweep(scene, button, buttonName, accentColor, idleShadow, hoverShadow, listeners) {
    button.thickness = 2;
    button.shadowColor = idleShadow;
    button.shadowBlur = 14;

    const sweep = new Rectangle(`${buttonName}_sweep`);
    sweep.width = '90%';
    sweep.height = '26%';
    sweep.left = '-65%';
    sweep.top = '-6%';
    sweep.thickness = 0;
    sweep.alpha = 0.18;
    sweep.background = accentColor;
    sweep.isHitTestVisible = false;
    button.addControl(sweep);

    const sheen = new Rectangle(`${buttonName}_sheen`);
    sheen.width = '120%';
    sheen.height = '18%';
    sheen.left = '-80%';
    sheen.top = '18%';
    sheen.thickness = 0;
    sheen.alpha = 0.08;
    sheen.background = accentColor;
    sheen.isHitTestVisible = false;
    button.addControl(sheen);

    const observer = scene.onBeforeRenderObservable.add(() => {
        if (!button || !button.parent || !button._host) return;

        const time = performance.now();
        const sweepPhase = (time % 2200) / 2200;
        const pulse = 0.5 + Math.sin(time / 170) * 0.5;

        sweep.left = `${-65 + sweepPhase * 130}%`;
        sheen.left = `${-80 + sweepPhase * 170}%`;
        sweep.alpha = 0.10 + pulse * 0.08 + (button.isPointerOver ? 0.12 : 0);
        sheen.alpha = 0.05 + pulse * 0.04 + (button.isPointerOver ? 0.08 : 0);
        button.shadowColor = button.isPointerOver ? hoverShadow : idleShadow;
        button.shadowBlur = button.isPointerOver ? 22 : 14;
    });

    listeners.push({ cleanup: () => scene.onBeforeRenderObservable.remove(observer) });

    button.onPointerEnterObservable.add(() => {
        button.color = accentColor;
    });

    button.onPointerOutObservable.add(() => {
        button.color = THEME.ink;
    });
}

/**
 * PauseUI — Écran de pause affichée avec Échap
 * 
 * Affiche un overlay sombre avec:
 * - Titre "PAUSED"
 * - Bouton Resume (continuer le jeu)
 * - Bouton Settings (placeholder)
 */
export class PauseUI {
    constructor(scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('PauseUI');
        this.ui.isForeground = true;
        this._overlay = null;
        this._visible = false;
        this._listeners = []; // Store observable references for cleanup
    }

    get isVisible() { return this._visible; }

    /**
     * Affiche l'écran de pause
     * @param {function} onResume - callback quand le joueur appuie sur Resume
     */
    show(onResume) {
        this._clearUI();
        this._visible = true;

        // ── Fond sombre semi-transparent ──
        const overlay = new Rectangle('pauseOverlay');
        overlay.width = '100%';
        overlay.height = '100%';
        overlay.background = '#05060add';
        overlay.thickness = 0;
        this.ui.addControl(overlay);
        this._overlay = overlay;

        // ── Titre ──
        const title = new TextBlock('pauseTitle');
        title.text = '⏸ PAUSE';
        title.color = THEME.gold;
        title.fontSize = 48;
        title.fontFamily = 'monospace';
        title.fontStyle = 'bold';
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        title.topInPixels = -150;
        title.height = "60px";
        overlay.addControl(title);

        // ── Conteneur des boutons ──
        const buttonContainer = new Rectangle('buttonContainer');
        buttonContainer.width = '400px';
        buttonContainer.height = '440px';
        buttonContainer.thickness = 0;
        buttonContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttonContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        overlay.addControl(buttonContainer);

        // ── Bouton Resume ──
        const resumeBtn = Button.CreateSimpleButton('resumeBtn', '▶ Resume');
        resumeBtn.width = '300px';
        resumeBtn.height = '60px';
        resumeBtn.top = '-20px';
        resumeBtn.cornerRadius = 8;
        resumeBtn.background = THEME.panelStrong;
        resumeBtn.color = THEME.ink;
        resumeBtn.fontSize = 24;
        resumeBtn.fontFamily = 'monospace';
        resumeBtn.fontStyle = 'bold';
        resumeBtn.paddingInPixels = 10;
        addNeonSweep(this.scene, resumeBtn, 'resumeBtn', THEME.cyan, THEME.shadowCyan, THEME.shadowPink, this._listeners);
        buttonContainer.addControl(resumeBtn);

        const resumeObserver = resumeBtn.onPointerClickObservable.add(() => {
            this.hide(() => onResume());
        });
        this._listeners.push({ observable: resumeBtn.onPointerClickObservable, observer: resumeObserver });

        // ── Bouton Settings (placeholder) ──
        const settingsBtn = Button.CreateSimpleButton('settingsBtn', '⚙ Settings');
        settingsBtn.width = '300px';
        settingsBtn.height = '60px';
        settingsBtn.top = '80px';
        settingsBtn.cornerRadius = 8;
        settingsBtn.background = THEME.panelStrong;
        settingsBtn.color = THEME.ink;
        settingsBtn.fontSize = 24;
        settingsBtn.fontFamily = 'monospace';
        settingsBtn.fontStyle = 'bold';
        settingsBtn.paddingInPixels = 10;
        addNeonSweep(this.scene, settingsBtn, 'settingsBtn', THEME.pink, THEME.shadowPink, THEME.shadowCyan, this._listeners);
        buttonContainer.addControl(settingsBtn);

        // Placeholder click
        const settingsObserver = settingsBtn.onPointerClickObservable.add(() => {
            console.log('[PauseUI] Settings clicked (not implemented)');
        });
        this._listeners.push({ observable: settingsBtn.onPointerClickObservable, observer: settingsObserver });

        // ── Slider Luminosité ──
        const brightnessPanel = new Rectangle('brightnessPanel');
        brightnessPanel.width = '300px';
        brightnessPanel.height = '80px';
        brightnessPanel.top = '180px';
        brightnessPanel.thickness = 0;
        buttonContainer.addControl(brightnessPanel);

        if (!this.scene.metadata) this.scene.metadata = {};
        if (typeof this.scene.metadata.brightnessMultiplier === 'undefined') {
            this.scene.metadata.brightnessMultiplier = 1.0;
        }

        const brightnessLabel = new TextBlock('brightnessLabel');
        brightnessLabel.text = `Luminosité: ${Math.round(this.scene.metadata.brightnessMultiplier * 100)}%`;
        brightnessLabel.color = THEME.inkSoft;
        brightnessLabel.fontSize = 18;
        brightnessLabel.fontFamily = 'monospace';
        brightnessLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        brightnessLabel.height = "30px";
        brightnessPanel.addControl(brightnessLabel);

        const brightnessSlider = new Slider('brightnessSlider');
        brightnessSlider.minimum = 0.1;
        brightnessSlider.maximum = 3.0;
        brightnessSlider.value = this.scene.metadata.brightnessMultiplier;
        brightnessSlider.height = '20px';
        brightnessSlider.width = '280px';
        brightnessSlider.color = THEME.cyan;
        brightnessSlider.background = '#2a2d36';
        brightnessSlider.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        brightnessPanel.addControl(brightnessSlider);

        const sliderObs = brightnessSlider.onValueChangedObservable.add((value) => {
            this.scene.metadata.brightnessMultiplier = value;
            brightnessLabel.text = `Luminosité: ${Math.round(value * 100)}%`;

            // Adjust main scene lights
            this.scene.lights.forEach(light => {
                const name = light.name;
                let base = 1.0;
                if (name === "ambientLight") base = 0.5;
                else if (name === "neonCyan" || name === "neonPink") base = 5.0;
                else if (name === "neonBlue") base = 4.0;
                else return; // Ignore dynamic lights 
                light.intensity = base * value;
            });

            // Adjust global glow layer if any
            if (this.scene.effectLayers) {
                this.scene.effectLayers.forEach(layer => {
                    if (layer.name === "neonGlow") layer.intensity = 0.8 * value;
                });
            }
        });
        this._listeners.push({ observable: brightnessSlider.onValueChangedObservable, observer: sliderObs });

        // ── Animation d'apparition (fade in) ──
        overlay.alpha = 0;
        const startTime = performance.now();
        const fadeIn = this.scene.onBeforeRenderObservable.add(() => {
            const t = Math.min(1, (performance.now() - startTime) / 250);
            overlay.alpha = t;
            if (t >= 1) {
                this.scene.onBeforeRenderObservable.remove(fadeIn);
            }
        });
    }

    /**
     * Masque l'écran de pause
     * @param {function} onHidden - callback quand la pause est terminée
     */
    hide(onHidden = null) {
        this._visible = false;
        if (!this._overlay) return;

        const overlay = this._overlay;
        const startTime = performance.now();
        const fadeOut = this.scene.onBeforeRenderObservable.add(() => {
            const t = Math.min(1, (performance.now() - startTime) / 250);
            overlay.alpha = 1 - t;
            if (t >= 1) {
                this._clearUI();
                this.scene.onBeforeRenderObservable.remove(fadeOut);
                if (typeof onHidden === 'function') onHidden();
            }
        });
    }

    _clearUI() {
        // ── MEMORY FIX: Remove all observable listeners before disposing ──
        for (const listener of this._listeners) {
            try {
                if (listener.cleanup) {
                    listener.cleanup();
                } else {
                    listener.observable.remove(listener.observer);
                }
            } catch (e) { /* ignore */ }
        }
        this._listeners = [];

        this.ui.getControlsByType('Rectangle').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this.ui.getControlsByType('TextBlock').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this.ui.getControlsByType('Button').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this.ui.getControlsByType('Slider').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this._overlay = null;
    }

    dispose() {
        this._clearUI();
        this.ui.dispose();
    }
}
