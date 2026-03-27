import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Button,
} from '@babylonjs/gui';

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
        overlay.background = '#000000dd';
        overlay.thickness = 0;
        this.ui.addControl(overlay);
        this._overlay = overlay;

        // ── Titre ──
        const title = new TextBlock('pauseTitle');
        title.text = '⏸ PAUSE';
        title.color = '#ffcc00';
        title.fontSize = 48;
        title.fontFamily = 'monospace';
        title.fontStyle = 'bold';
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        title.topInPixels = -100;
        title.height = "60px";
        overlay.addControl(title);

        // ── Conteneur des boutons ──
        const buttonContainer = new Rectangle('buttonContainer');
        buttonContainer.width = '400px';
        buttonContainer.height = '250px';
        buttonContainer.thickness = 0;
        buttonContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttonContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        overlay.addControl(buttonContainer);

        // ── Bouton Resume ──
        const resumeBtn = new Button('resumeBtn');
        resumeBtn.width = '300px';
        resumeBtn.height = '60px';
        resumeBtn.top = '-40px';
        resumeBtn.cornerRadius = 8;
        resumeBtn.background = '#1a4d7f';
        resumeBtn.color = '#ffffff';
        resumeBtn.fontSize = 24;
        resumeBtn.fontFamily = 'monospace';
        resumeBtn.fontStyle = 'bold';
        resumeBtn.paddingInPixels = 10;
        resumeBtn.textBlock.text = '▶ Resume';
        buttonContainer.addControl(resumeBtn);

        const resumeObserver = resumeBtn.onPointerClickObservable.add(() => {
            this.hide(() => onResume());
        });
        this._listeners.push({ observable: resumeBtn.onPointerClickObservable, observer: resumeObserver });

        // Hover effect Resume
        resumeBtn.onPointerEnterObservable.add(() => {
            resumeBtn.background = '#2a6daf';
        });
        resumeBtn.onPointerOutObservable.add(() => {
            resumeBtn.background = '#1a4d7f';
        });

        // ── Bouton Settings (placeholder) ──
        const settingsBtn = new Button('settingsBtn');
        settingsBtn.width = '300px';
        settingsBtn.height = '60px';
        settingsBtn.top = '50px';
        settingsBtn.cornerRadius = 8;
        settingsBtn.background = '#4a3f35';
        settingsBtn.color = '#ffffff';
        settingsBtn.fontSize = 24;
        settingsBtn.fontFamily = 'monospace';
        settingsBtn.fontStyle = 'bold';
        settingsBtn.paddingInPixels = 10;
        settingsBtn.textBlock.text = '⚙ Settings';
        buttonContainer.addControl(settingsBtn);

        // Placeholder click
        const settingsObserver = settingsBtn.onPointerClickObservable.add(() => {
            console.log('[PauseUI] Settings clicked (not implemented)');
        });
        this._listeners.push({ observable: settingsBtn.onPointerClickObservable, observer: settingsObserver });

        // Hover effect Settings
        settingsBtn.onPointerEnterObservable.add(() => {
            settingsBtn.background = '#6a5f55';
        });
        settingsBtn.onPointerOutObservable.add(() => {
            settingsBtn.background = '#4a3f35';
        });

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
                listener.observable.remove(listener.observer);
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
        this._overlay = null;
    }

    dispose() {
        this._clearUI();
        this.ui.dispose();
    }
}
