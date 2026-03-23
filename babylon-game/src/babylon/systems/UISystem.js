import {
    AdvancedDynamicTexture,
    TextBlock,
    Control,
    Rectangle,
    StackPanel,
    Button,
} from "@babylonjs/gui";

/**
 * UISystem — Interface cyberpunk pour le Roguelike Robotique
 *
 * Zones :
 *   [Haut-Gauche]  Round label
 *   [Haut-Centre]  Timer compte à rebours
 *   [Haut-Droite]  Score / Engrenages
 *   [Bas-Gauche]   Barre de vie stylisée + compteur kills
 *   [Bas-Centre]   Capacité active (icône + overlay cooldown)
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
        this._buildXPBar();
        this._buildItemList();
        this._buildStatsUI();
    }

    // ─────────────────────────────────────────────────────
    // BARRE DE VIE (bas-gauche)
    // ─────────────────────────────────────────────────────
    _buildLifeBar() {
        const container = new Rectangle("lifeContainer");
        container.width = "280px";
        container.height = "56px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.leftInPixels = 20;
        container.bottomInPixels = 24;
        container.thickness = 0;
        this.ui.addControl(container);

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

        const lifeBg = new Rectangle("lifeBg");
        lifeBg.width = "280px";
        lifeBg.height = "24px";
        lifeBg.background = "#0a0a1a";
        lifeBg.color = "#00ffcc44";
        lifeBg.thickness = 1;
        lifeBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        lifeBg.cornerRadius = 3;
        container.addControl(lifeBg);

        this.lifeFill = new Rectangle("lifeFill");
        this.lifeFill.width = "100%";
        this.lifeFill.height = "100%";
        this.lifeFill.background = "#00ff88";
        this.lifeFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.lifeFill.cornerRadius = 3;
        this.lifeFill.thickness = 0;
        lifeBg.addControl(this.lifeFill);

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
        // Round label — haut gauche
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

        // Timer — haut centre
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

        // État du round — sous le timer
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

        const keyLabel = new TextBlock("keyLabel");
        keyLabel.text = "SPACE";
        keyLabel.color = "#ffffff88";
        keyLabel.fontSize = 9;
        keyLabel.fontFamily = "monospace";
        keyLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        keyLabel.top = "-4px";
        container.addControl(keyLabel);

        this.abilityIcon = new TextBlock("abilityIcon");
        this.abilityIcon.text = "💊";
        this.abilityIcon.fontSize = 28;
        this.abilityIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.abilityIcon.top = "8px";
        container.addControl(this.abilityIcon);

        this.abilityCooldownOverlay = new Rectangle("abilityCooldownOverlay");
        this.abilityCooldownOverlay.width = "100%";
        this.abilityCooldownOverlay.height = "0%";
        this.abilityCooldownOverlay.background = "#000000aa";
        this.abilityCooldownOverlay.thickness = 0;
        this.abilityCooldownOverlay.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.addControl(this.abilityCooldownOverlay);

        this.abilityCooldownText = new TextBlock("abilityCooldownText");
        this.abilityCooldownText.text = "";
        this.abilityCooldownText.color = "#ffffff";
        this.abilityCooldownText.fontSize = 14;
        this.abilityCooldownText.fontFamily = "monospace";
        this.abilityCooldownText.fontStyle = "bold";
        container.addControl(this.abilityCooldownText);
    }

    // ─────────────────────────────────────────────────────
    // COMPTEUR DE KILLS (bas-gauche, au-dessus de la vie)
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
    // BARRE XP (tout en bas, pleine largeur)
    // ─────────────────────────────────────────────────────
    _buildXPBar() {
        // Fond
        const xpBg = new Rectangle("xpBg");
        xpBg.width = "100%";
        xpBg.height = "6px";
        xpBg.background = "#111122";
        xpBg.thickness = 0;
        xpBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        xpBg.bottomInPixels = 0;
        this.ui.addControl(xpBg);

        // Remplissage XP
        this.xpFill = new Rectangle("xpFill");
        this.xpFill.width = "0%";
        this.xpFill.height = "100%";
        this.xpFill.background = "#00ffcc";
        this.xpFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.xpFill.thickness = 0;
        xpBg.addControl(this.xpFill);

        // Niveau
        this.levelText = new TextBlock("levelText");
        this.levelText.text = "LVL 1";
        this.levelText.color = "#00ffcc";
        this.levelText.fontSize = 11;
        this.levelText.fontFamily = "monospace";
        this.levelText.fontStyle = "bold";
        this.levelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.levelText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.levelText.rightInPixels = 8;
        this.levelText.bottomInPixels = 8;
        this.ui.addControl(this.levelText);
    }

    // ─────────────────────────────────────────────────────
    // LISTE DES ITEMS OBTENUS (droite)
    // ─────────────────────────────────────────────────────
    _buildItemList() {
        const panel = new StackPanel("itemsPanel");
        panel.width = "220px";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.topInPixels = 90;
        panel.rightInPixels = 20;
        this.ui.addControl(panel);
        
        const title = new TextBlock("itemsTitle");
        title.text = "MODULES RÉCUPÉRÉS";
        title.color = "#ffffff88";
        title.fontSize = 12;
        title.height = "24px";
        title.fontFamily = "monospace";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.addControl(title);
        
        this.itemsListPanel = new StackPanel("itemsList");
        panel.addControl(this.itemsListPanel);
    }

    // ─────────────────────────────────────────────────────
    // STATISTIQUES JOUEUR (gauche)
    // ─────────────────────────────────────────────────────
    _buildStatsUI() {
        const panel = new StackPanel("statsPanel");
        panel.width = "180px";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.topInPixels = 90;
        panel.leftInPixels = 20;
        this.ui.addControl(panel);
        
        const title = new TextBlock("statsTitle");
        title.text = "STATISTIQUES";
        title.color = "#ffffff88";
        title.fontSize = 12;
        title.height = "24px";
        title.fontFamily = "monospace";
        title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(title);
        
        this.statsText = new TextBlock("statsText");
        this.statsText.text = "";
        this.statsText.color = "#00ffcc";
        this.statsText.fontSize = 12;
        this.statsText.height = "140px";
        this.statsText.fontFamily = "monospace";
        this.statsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.statsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        panel.addControl(this.statsText);
    }

    // ─────────────────────────────────────────────────────
    // UPDATE METHODS
    // ─────────────────────────────────────────────────────

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

    /** Alias pour compatibilité avec l'ancienne API */
    updateScore(score) {
        this.updateGears(score);
    }

    updateGears(count) {
        this.gearText.text = `⚙ ${count}`;
    }

    updateKills(kills) {
        this.killText.text = `☠ ${kills} kills`;
    }

    /**
     * Met à jour la barre XP
     * @param {number} progress  0→1 fraction vers le prochain niveau
     * @param {number} level     niveau actuel
     */
    updateXP(progress, level) {
        this.xpFill.width = Math.round(progress * 100) + "%";
        this.levelText.text = `LVL ${level}`;
    }

    updateItems(items) {
        // On recrée la liste (performance OK pour un tableau de < 50 items)
        this.itemsListPanel.clearControls();
        items.forEach(item => {
            const txt = new TextBlock(`item_${item.id}_${Math.random()}`); // random pour éviter confit si items multiples
            txt.text = `${item.icon} ${item.name} ${item.rarityStars}`;
            txt.color = item.rarityColor;
            txt.fontSize = 12;
            txt.height = "20px";
            txt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            txt.fontFamily = "monospace";
            this.itemsListPanel.addControl(txt);

            const desc = new TextBlock(`itemDesc_${item.id}_${Math.random()}`);
            desc.text = item.description;
            desc.color = "#ffffff88";
            desc.fontSize = 10;
            desc.height = "16px";
            desc.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            desc.fontFamily = "monospace";
            this.itemsListPanel.addControl(desc);

            // Petit séparateur
            const spacer = new Rectangle("spacer_" + Math.random());
            spacer.height = "8px";
            spacer.thickness = 0;
            this.itemsListPanel.addControl(spacer);
        });
    }

    updateStats(player) {
        let stats = "";
        stats += `Dégâts : ${(player.strength || 1).toFixed(2)}\n`;
        stats += `Vitesse: ${(player.speed || 1).toFixed(2)}\n`;
        stats += `Cadence: ${(player.speedshot || 1).toFixed(2)}\n`;
        stats += `Chance : ${(player.luck || 1).toFixed(2)}\n`;
        stats += `Armure : ${player.armor || 0}\n`;
        stats += `Regen  : ${player.regen || 0} \n`;
        this.statsText.text = stats;
    }

    updateRound(index, total, state, remaining) {
        this.roundText.text = `ROUND ${index}/${total}`;

        if (state === "waiting") {
            this.roundTimer.color = "#ffaa00";
            this.roundTimer.text = `${Math.ceil(remaining)}s`;
            this.roundStateText.text = "⚠ PRÉPAREZ-VOUS";
            this.roundStateText.color = "#ffaa00";
        } else if (state === "running") {
            const secs = Math.ceil(remaining);
            const mm = Math.floor(secs / 60).toString().padStart(2, "0");
            const ss = (secs % 60).toString().padStart(2, "0");
            this.roundTimer.text = `${mm}:${ss}`;
            this.roundStateText.text = "";
            this.roundTimer.color = secs <= 10 ? "#ff4444" : "#ffffff";
        } else if (state === "finished") {
            this.roundTimer.color = "#00ff88";
            this.roundTimer.text = "✓ WIN";
            this.roundStateText.text = "ROUND TERMINÉ";
            this.roundStateText.color = "#00ff88";
        }
    }

    /**
     * Met à jour le slot de capacité active
     * @param {number} cooldownPercent  0 = prêt, 1 = vient d'être utilisé
     * @param {'heal'|'grenade'|null} itemType
     * @param {number} cooldownRemaining  secondes restantes
     */
    updateActiveAbility(cooldownPercent, itemType, cooldownRemaining = 0) {
        const icons = { heal: "💊", grenade: "💣" };
        this.abilityIcon.text = icons[itemType] ?? "—";

        const overlayHeight = Math.round(cooldownPercent * 100);
        this.abilityCooldownOverlay.height = overlayHeight + "%";

        this.abilityCooldownText.text = cooldownRemaining > 0.1
            ? Math.ceil(cooldownRemaining).toString()
            : "";
    }

    /** Alias générique pour la compatibilité avec secondaryActivable.updateCooldown */
    updateCooldown(remaining, total) {
        // Redirige vers updateActiveAbility si disponible
        const percent = total > 0 ? remaining / total : 0;
        this.updateActiveAbility(percent, this._lastItemType ?? "heal", remaining);
    }

    /**
     * Notification flash animée au centre de l'écran
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

    /** Affiche l'écran Game Over avec bouton de retour au menu */
    showGameOver() {
        if (this._gameOverPanel) return // déjà affiché

        const overlay = new Rectangle("gameOverOverlay");
        overlay.width = "100%";
        overlay.height = "100%";
        overlay.background = "#000000cc";
        overlay.thickness = 0;
        overlay.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        overlay.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.ui.addControl(overlay);

        const panel = new Rectangle("gameOverPanel");
        panel.width = "480px";
        panel.height = "260px";
        panel.background = "#0b0b12";
        panel.color = "#ffffff22";
        panel.thickness = 2;
        panel.cornerRadius = 8;
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        overlay.addControl(panel);

        const title = new TextBlock("gameOverTitle");
        title.text = "GAME OVER";
        title.color = "#ff4444";
        title.fontSize = 44;
        title.fontFamily = "monospace";
        title.fontStyle = "bold";
        title.top = "-40px";
        panel.addControl(title);

        const subtitle = new TextBlock("gameOverSub");
        subtitle.text = "Vous êtes mort.";
        subtitle.color = "#ffffffaa";
        subtitle.fontSize = 18;
        subtitle.top = "-5px";
        panel.addControl(subtitle);

        const btn = Button.CreateSimpleButton("returnButton", "Retour au menu");
        btn.width = "220px";
        btn.height = "44px";
        btn.color = "#ffffff";
        btn.background = "#3344aa";
        btn.top = "60px";
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        btn.cornerRadius = 10;
        btn.thickness = 0;
        btn.onPointerDownObservable.add(() => {
            // Dispatch event global que App.vue peut écouter
            try {
                window.dispatchEvent(new CustomEvent('returnToMenu'))
            } catch (e) {
                // fallback: reload page
                window.location.reload()
            }
        });
        panel.addControl(btn);

        this._gameOverPanel = overlay;
    }

    hideGameOver() {
        if (!this._gameOverPanel) return;
        try { this._gameOverPanel.dispose(); } catch (e) { /* ignore */ }
        this._gameOverPanel = null;
    }
}
