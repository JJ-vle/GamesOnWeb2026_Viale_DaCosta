import {
    AdvancedDynamicTexture,
    TextBlock,
    Control,
    Rectangle,
    Ellipse,
    Image,
    StackPanel,
} from "@babylonjs/gui";

/**
 * UISystem — Interface cyberpunk pour le Roguelike Robotique
 *
 * Zones :
 *   [Haut-Gauche]  Round + État (waiting/running/finished)
 *   [Haut-Centre]  Timer compte à rebours
 *   [Haut-Droite]  Score (engrenages)
 *   [Bas-Gauche]   Barre de vie stylisée (segmentée)
 *   [Bas-Centre]   Capacité active (icône + cooldown)
 *   [Bas-Droite]   XP bar + niveau
 */
export class UISystem {
    constructor(scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        this._buildLifeBar();
        this._buildRoundUI();
        this._buildGearCounter();
        this._buildActiveAbilityUI();
        this._buildKillCounter();
    }

    // ─────────────────────────────────────────────────────
    // BARRE DE VIE (bas-gauche) — segmentée style cyberpunk
    // ─────────────────────────────────────────────────────
    _buildLifeBar() {
        // Conteneur principal
        const container = new Rectangle("lifeContainer");
        container.width = "280px";
        container.height = "56px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.leftInPixels = 20;
        container.bottomInPixels = 24;
        container.thickness = 0;
        this.ui.addControl(container);

        // Label "HP"
        const hpLabel = new TextBlock("hpLabel");
        hpLabel.text = "HP";
        hpLabel.color = "#00ffcc";
        hpLabel.fontSize = 11;
        hpLabel.fontFamily = "monospace";
        hpLabel.fontStyle = "bold";
        hpLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        hpLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        hpLabel.top = "-2px";
        container.addControl(hpLabel);

        // Fond de la barre
        const lifeBg = new Rectangle("lifeBg");
        lifeBg.width = "280px";
        lifeBg.height = "24px";
        lifeBg.background = "#0a0a1a";
        lifeBg.color = "#00ffcc44";
        lifeBg.thickness = 1;
        lifeBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        lifeBg.cornerRadius = 3;
        container.addControl(lifeBg);

        // Remplissage
        this.lifeFill = new Rectangle("lifeFill");
        this.lifeFill.width = "100%";
        this.lifeFill.height = "100%";
        this.lifeFill.background = "linear-gradient(90deg, #00ff88, #00ffcc)";
        this.lifeFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.lifeFill.cornerRadius = 3;
        this.lifeFill.thickness = 0;
        lifeBg.addControl(this.lifeFill);

        // Glow overlay (bord brillant)
        const glowLine = new Rectangle("glowLine");
        glowLine.width = "100%";
        glowLine.height = "3px";
        glowLine.background = "#ffffff33";
        glowLine.thickness = 0;
        glowLine.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        glowLine.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        glowLine.cornerRadius = 3;
        lifeBg.addControl(glowLine);
        this._lifeGlowLine = glowLine;

        // Texte HP actuel
        this.lifeText = new TextBlock("lifeText");
        this.lifeText.text = "20 / 20";
        this.lifeText.color = "#ffffff";
        this.lifeText.fontSize = 12;
        this.lifeText.fontFamily = "monospace";
        this.lifeText.fontStyle = "bold";
        lifeBg.addControl(this.lifeText);
    }

    // ─────────────────────────────────────────────────────
    // UI ROUND (haut-gauche + haut-centre)
    // ─────────────────────────────────────────────────────
    _buildRoundUI() {
        // ── Round label (haut-gauche) ──
        const roundBg = new Rectangle("roundBg");
        roundBg.width = "160px";
        roundBg.height = "36px";
        roundBg.background = "#0a0a1a99";
        roundBg.color = "#00ffcc44";
        roundBg.thickness = 1;
        roundBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        roundBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        roundBg.leftInPixels = 20;
        roundBg.topInPixels = 20;
        roundBg.cornerRadius = 4;
        this.ui.addControl(roundBg);

        this.roundText = new TextBlock("roundText");
        this.roundText.text = "ROUND 1/1";
        this.roundText.color = "#00ffcc";
        this.roundText.fontSize = 14;
        this.roundText.fontFamily = "monospace";
        this.roundText.fontStyle = "bold";
        roundBg.addControl(this.roundText);
    this._createScore();
    this._createRound();
    this._createLifeBar();
    this._createCooldownDisplay();
  }

  _createScore() {
    this.scoreText = new TextBlock();
    this.scoreText.text = "Score: 0";
    this.scoreText.color = "white";
    this.scoreText.fontSize = 24;
    this.scoreText.top = "-45%";
    this.ui.addControl(this.scoreText);
  }

  _createRound() {
    this.roundText = new TextBlock();
    this.roundText.color = "white";
    this.roundText.fontSize = 20;
    this.roundText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.roundText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.roundText.leftInPixels = 10;
    this.roundText.topInPixels = 10;
    this.ui.addControl(this.roundText);

        // ── Timer (haut-centre) ──
        const timerBg = new Rectangle("timerBg");
        timerBg.width = "140px";
        timerBg.height = "44px";
        timerBg.background = "#0a0a1a99";
        timerBg.color = "#ffffff22";
        timerBg.thickness = 1;
        timerBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        timerBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        timerBg.topInPixels = 16;
        timerBg.cornerRadius = 4;
        this.ui.addControl(timerBg);

        this.roundTimer = new TextBlock("roundTimer");
        this.roundTimer.text = "01:00";
        this.roundTimer.color = "#ffffff";
        this.roundTimer.fontSize = 22;
        this.roundTimer.fontFamily = "monospace";
        this.roundTimer.fontStyle = "bold";
        timerBg.addControl(this.roundTimer);

        // ── État du round (sous le timer) ──
        this.roundStateText = new TextBlock("roundStateText");
        this.roundStateText.text = "";
        this.roundStateText.color = "#ffaa00";
        this.roundStateText.fontSize = 13;
        this.roundStateText.fontFamily = "monospace";
        this.roundStateText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.roundStateText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.roundStateText.topInPixels = 65;
        this.ui.addControl(this.roundStateText);
    }

    // ─────────────────────────────────────────────────────
    // COMPTEUR ENGRENAGES (haut-droite)
    // ─────────────────────────────────────────────────────
    _buildGearCounter() {
        const bg = new Rectangle("gearBg");
        bg.width = "140px";
        bg.height = "36px";
        bg.background = "#0a0a1a99";
        bg.color = "#ffcc0044";
        bg.thickness = 1;
        bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        bg.rightInPixels = 20;
        bg.topInPixels = 20;
        bg.cornerRadius = 4;
        this.ui.addControl(bg);

        this.gearText = new TextBlock("gearText");
        this.gearText.text = "⚙ 0";
        this.gearText.color = "#ffcc00";
        this.gearText.fontSize = 16;
        this.gearText.fontFamily = "monospace";
        this.gearText.fontStyle = "bold";
        bg.addControl(this.gearText);
    }

    // ─────────────────────────────────────────────────────
    // CAPACITÉ ACTIVE (bas-centre)
    // ─────────────────────────────────────────────────────
    _buildActiveAbilityUI() {
        // Conteneur centré en bas
        const container = new Rectangle("abilityContainer");
        container.width = "72px";
        container.height = "72px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.bottomInPixels = 20;
        container.background = "#0a0a1acc";
        container.color = "#ffffff44";
        container.thickness = 2;
        container.cornerRadius = 8;
        this.ui.addControl(container);

        // Label de la touche
        const keyLabel = new TextBlock("keyLabel");
        keyLabel.text = "SPACE";
        keyLabel.color = "#ffffff88";
        keyLabel.fontSize = 9;
        keyLabel.fontFamily = "monospace";
        keyLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        keyLabel.top = "-4px";
        container.addControl(keyLabel);

        // Icône item
        this.abilityIcon = new TextBlock("abilityIcon");
        this.abilityIcon.text = "💊"; // heal par défaut
        this.abilityIcon.fontSize = 28;
        this.abilityIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.abilityIcon.top = "8px";
        container.addControl(this.abilityIcon);

        // Overlay de cooldown (rectangle sombre qui couvre l'icône)
        this.abilityCooldownOverlay = new Rectangle("abilityCooldownOverlay");
        this.abilityCooldownOverlay.width = "100%";
        this.abilityCooldownOverlay.height = "0%"; // commence à 0
        this.abilityCooldownOverlay.background = "#000000aa";
        this.abilityCooldownOverlay.thickness = 0;
        this.abilityCooldownOverlay.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.addControl(this.abilityCooldownOverlay);

        // Texte cooldown
        this.abilityCooldownText = new TextBlock("abilityCooldownText");
        this.abilityCooldownText.text = "";
        this.abilityCooldownText.color = "#ffffff";
        this.abilityCooldownText.fontSize = 14;
        this.abilityCooldownText.fontFamily = "monospace";
        this.abilityCooldownText.fontStyle = "bold";
        container.addControl(this.abilityCooldownText);
    }

    // ─────────────────────────────────────────────────────
    // COMPTEUR DE KILLS (bas, près de la vie)
    // ─────────────────────────────────────────────────────
    _buildKillCounter() {
        this.killText = new TextBlock("killText");
        this.killText.text = "☠ 0 kills";
        this.killText.color = "#ffffff66";
        this.killText.fontSize = 12;
        this.killText.fontFamily = "monospace";
        this.killText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.killText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.killText.leftInPixels = 22;
        this.killText.bottomInPixels = 88;
        this.ui.addControl(this.killText);
    }

    // ─────────────────────────────────────────────────────
    // UPDATE METHODS
    // ─────────────────────────────────────────────────────
    this.lifeFill = new Rectangle();
    this.lifeFill.width = "100%";
    this.lifeFill.height = "100%";
    this.lifeFill.background = "green";
    this.lifeFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    bg.addControl(this.lifeFill);
  }

  _createCooldownDisplay() {
    this.cooldownText = new TextBlock();
    this.cooldownText.color = "white";
    this.cooldownText.fontSize = 18;
    this.cooldownText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.cooldownText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    // position right of life bar
    this.cooldownText.leftInPixels = 340; // 30 + 300 + 10 spacing
    this.cooldownText.bottomInPixels = 70;
    this.cooldownText.text = "";
    this.ui.addControl(this.cooldownText);
  }

  updateScore(score) {
    this.scoreText.text = `Score: ${score}`;
  }

    updateLife(current, max) {
        const percent = Math.max(0, current / max);
        this.lifeFill.width = (percent * 100) + "%";
        this.lifeText.text = `${current} / ${max}`;

        if (percent > 0.6) {
            this.lifeFill.background = "#00ff88";
            this._lifeGlowLine.background = "#ffffff44";
        } else if (percent > 0.3) {
            this.lifeFill.background = "#ffaa00";
            this._lifeGlowLine.background = "#ffaa0044";
        } else {
            this.lifeFill.background = "#ff2244";
            this._lifeGlowLine.background = "#ff224466";
        }
    }

    // Maintenu pour compatibilité (alias)
    updateScore(score) {
        this.updateGears(score);
    }

    updateGears(count) {
        this.gearText.text = `⚙ ${count}`;
    }

    updateKills(kills) {
        this.killText.text = `☠ ${kills} kills`;
    }
  updateLife(current, max) {
    const percent = current / max;
    this.lifeFill.width = (percent * 100) + "%";

    if (percent > 0.5) this.lifeFill.background = "green";
    else if (percent > 0.2) this.lifeFill.background = "orange";
    else this.lifeFill.background = "red";
  }

  /**
   * @param {number} remaining seconds remaining (>=0)
   * @param {number} total total cooldown value
   */
  updateCooldown(remaining, total) {
    if (remaining <= 0) {
      this.cooldownText.text = "Ready";
    } else {
      const secs = Math.ceil(remaining);
      this.cooldownText.text = `CD: ${secs}s`;
    }
  }

    updateRound(index, total, state, remaining) {
        this.roundText.text = `ROUND ${index}/${total}`;

        if (state === "waiting") {
            this.roundTimer.color = "#ffaa00";
            this.roundTimer.text = `${Math.ceil(remaining)}s`;
            this.roundStateText.text = "⚠ PRÉPAREZ-VOUS";
            this.roundStateText.color = "#ffaa00";
        } else if (state === "running") {
            this.roundTimer.color = "#ffffff";
            const secs = Math.ceil(remaining);
            const mm = Math.floor(secs / 60).toString().padStart(2, "0");
            const ss = (secs % 60).toString().padStart(2, "0");
            this.roundTimer.text = `${mm}:${ss}`;
            this.roundStateText.text = "";

            // Timer rouge si < 10s
            if (secs <= 10) {
                this.roundTimer.color = "#ff4444";
            }
        } else if (state === "finished") {
            this.roundTimer.color = "#00ff88";
            this.roundTimer.text = "✓ WIN";
            this.roundStateText.text = "ROUND TERMINÉ";
            this.roundStateText.color = "#00ff88";
        }
    }

    /**
     * Met à jour l'UI de la capacité active
     * @param {number} cooldownPercent - 0 = prêt, 1 = juste utilisé
     * @param {'heal'|'grenade'|null} itemType - item équipé
     * @param {number} cooldownRemaining - secondes restantes
     */
    updateActiveAbility(cooldownPercent, itemType, cooldownRemaining = 0) {
        // Icône
        const icons = { heal: "💊", grenade: "💣", null: "—" };
        this.abilityIcon.text = icons[itemType] ?? "—";

        // Overlay cooldown
        const overlayHeight = Math.round(cooldownPercent * 100);
        this.abilityCooldownOverlay.height = overlayHeight + "%";

        // Texte
        if (cooldownRemaining > 0.1) {
            this.abilityCooldownText.text = Math.ceil(cooldownRemaining).toString();
        } else {
            this.abilityCooldownText.text = "";
        }
    }

    /**
     * Affiche une notification flash au centre de l'écran (ex: "VICTOIRE!")
     * @param {string} text
     * @param {string} [color="#00ff88"]
     * @param {number} [duration=2500] ms
     */
    showNotification(text, color = "#00ff88", duration = 2500) {
        const notif = new TextBlock("notification_" + Date.now());
        notif.text = text;
        notif.color = color;
        notif.fontSize = 36;
        notif.fontFamily = "monospace";
        notif.fontStyle = "bold";
        notif.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        notif.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        notif.top = "-80px";
        this.ui.addControl(notif);

        const startTime = performance.now();
        const obs = this.scene.onBeforeRenderObservable.add(() => {
            const elapsed = performance.now() - startTime;
            const t = elapsed / duration;
            notif.alpha = Math.max(0, 1 - t * t);
            notif.top = (-80 - t * 30) + "px";
            if (elapsed >= duration) {
                notif.dispose();
                this.scene.onBeforeRenderObservable.remove(obs);
            }
        });
    }
}
