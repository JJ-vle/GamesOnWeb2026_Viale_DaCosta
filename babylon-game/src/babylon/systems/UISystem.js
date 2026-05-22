import {
    AdvancedDynamicTexture,
    TextBlock,
    Control,
    Rectangle,
    StackPanel,
    Image,
} from "@babylonjs/gui";

/**
 * UISystem — Interface cyberpunk pour le Roguelike Robotique
 * Contient les éléments HUD : barre de vie, round/timer, compteurs,
 * capacité active, liste d'items et notifications.
 */
export class UISystem {
    constructor(scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this._uiObservers = [];

        this._buildLifeBar();
        this._buildRoundUI();
        this._buildGearCounter();
        this._buildActiveAbilityUI();
        this._buildKillCounter();
        this._buildXPBar();
        this._buildBossBar();
        // this._buildItemList();
        this._buildStatsUI();
    }

    // ─────────────────────────────────────────────────────
    // BARRE DE VIE (bas-gauche)
    // ─────────────────────────────────────────────────────
    _buildLifeBar() {
        const container = new Rectangle("lifeContainer");
        container.width = "300px";
        container.height = "82px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.leftInPixels = 20;
        container.bottomInPixels = 40;
        container.thickness = 0;
        this.ui.addControl(container);

        const lifeGlow = new Rectangle("lifeGlow");
        lifeGlow.width = "100%";
        lifeGlow.height = "100%";
        lifeGlow.background = "#68f0ff10";
        lifeGlow.color = "#68f0ff33";
        lifeGlow.thickness = 1;
        lifeGlow.cornerRadius = 4;
        container.addControl(lifeGlow);

        const lifeCornerTL = new Rectangle("lifeCornerTL");
        lifeCornerTL.width = "14px";
        lifeCornerTL.height = "14px";
        lifeCornerTL.left = "-2px";
        lifeCornerTL.top = "-2px";
        lifeCornerTL.thickness = 2;
        lifeCornerTL.color = "#68f0ff";
        lifeCornerTL.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        lifeCornerTL.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        lifeCornerTL.isHitTestVisible = false;
        container.addControl(lifeCornerTL);

        const lifeCornerBR = new Rectangle("lifeCornerBR");
        lifeCornerBR.width = "14px";
        lifeCornerBR.height = "14px";
        lifeCornerBR.right = "-2px";
        lifeCornerBR.bottom = "-2px";
        lifeCornerBR.thickness = 2;
        lifeCornerBR.color = "#ff7ac8";
        lifeCornerBR.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        lifeCornerBR.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        lifeCornerBR.isHitTestVisible = false;
        container.addControl(lifeCornerBR);

        const hpLabel = new TextBlock("hpLabel");
        hpLabel.text = "HP";
        hpLabel.color = "#f4cc69";
        hpLabel.fontSize = 12;
        hpLabel.fontFamily = "monospace";
        hpLabel.fontStyle = "bold";
        hpLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        hpLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        hpLabel.left = "8px";
        hpLabel.top = "6px";
        container.addControl(hpLabel);

        const lifeBg = new Rectangle("lifeBg");
        lifeBg.width = "280px";
        lifeBg.height = "28px";
        lifeBg.background = "#0a0a14ee";
        lifeBg.color = "#68f0ff66";
        lifeBg.thickness = 2;
        lifeBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        lifeBg.cornerRadius = 4;
        container.addControl(lifeBg);

        const lifeSweep = new Rectangle("lifeSweep");
        lifeSweep.width = "120%";
        lifeSweep.height = "10px";
        lifeSweep.left = "-70%";
        lifeSweep.top = "-6px";
        lifeSweep.background = "#68f0ff";
        lifeSweep.alpha = 0.12;
        lifeSweep.thickness = 0;
        lifeSweep.isHitTestVisible = false;
        lifeBg.addControl(lifeSweep);

        const lifeSweepObs = this.scene.onBeforeRenderObservable.add(() => {
            if (!lifeSweep || !lifeSweep.parent || !lifeSweep._host) return;
            const phase = (performance.now() % 1700) / 1700;
            const pulse = 0.5 + Math.sin(performance.now() / 180) * 0.5;
            lifeSweep.left = `${-70 + phase * 140}%`;
            lifeSweep.alpha = 0.06 + pulse * 0.08;
            lifeGlow.alpha = 0.58 + pulse * 0.18;
        });
        this._uiObservers.push(lifeSweepObs);

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

        // Icône image + compteur (alignés horizontalement)
        const row = new StackPanel("gearRow");
        row.isVertical = false;
        row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        row.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        row.height = "100%";
        bg.addControl(row);

        this.gearIcon = new Image("gearIcon", "assets/gear_coin.png");
        this.gearIcon.width = "20px";
        this.gearIcon.height = "20px";
        this.gearIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        row.addControl(this.gearIcon);

        this.gearCount = new TextBlock("gearCount");
        this.gearCount.text = "0";
        // Assurer visibilité : couleur contrastée et alignements explicites
        this.gearCount.color = "#ffcc00";
        this.gearCount.fontSize = 16;
        this.gearCount.fontFamily = "monospace";
        this.gearCount.fontStyle = "bold";
        this.gearCount.paddingLeft = "8px";
        // leave room for large numbers — fixed pixel width to avoid layout shifts
        this.gearCount.width = "96px";
        this.gearCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.gearCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.gearCount.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        row.addControl(this.gearCount);
    }

    // ─────────────────────────────────────────────────────
    // CAPACITÉ ACTIVE (bas-centre)
    // ─────────────────────────────────────────────────────
    _buildActiveAbilityUI() {
        const container = new Rectangle("abilityContainer");
        container.width = "8%";
        container.height = "10%";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.bottomInPixels = 16;
        container.background = "#0a0a14ee";
        container.color = "#f2ead833";
        container.thickness = 2;
        container.cornerRadius = 4;
        this.ui.addControl(container);

        const glow = new Rectangle("abilityGlow");
        glow.width = "100%";
        glow.height = "100%";
        glow.background = "#68f0ff10";
        glow.color = "#68f0ff33";
        glow.thickness = 1;
        glow.cornerRadius = 4;
        container.addControl(glow);

        const cornerTL = new Rectangle("abilityCornerTL");
        cornerTL.width = "14px";
        cornerTL.height = "14px";
        cornerTL.left = "-2px";
        cornerTL.top = "-2px";
        cornerTL.thickness = 2;
        cornerTL.color = "#68f0ff";
        cornerTL.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        cornerTL.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        cornerTL.isHitTestVisible = false;
        container.addControl(cornerTL);

        const cornerBR = new Rectangle("abilityCornerBR");
        cornerBR.width = "14px";
        cornerBR.height = "14px";
        cornerBR.right = "-2px";
        cornerBR.bottom = "-2px";
        cornerBR.thickness = 2;
        cornerBR.color = "#ff7ac8";
        cornerBR.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        cornerBR.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        cornerBR.isHitTestVisible = false;
        container.addControl(cornerBR);

        const sweep = new Rectangle("abilitySweep");
        sweep.width = "120%";
        sweep.height = "14px";
        sweep.left = "-70%";
        sweep.top = "18px";
        sweep.background = "#68f0ff";
        sweep.alpha = 0.18;
        sweep.thickness = 0;
        sweep.isHitTestVisible = false;
        container.addControl(sweep);

        const sweepObs = this.scene.onBeforeRenderObservable.add(() => {
            if (!sweep || sweep.isDisposed?.()) return;
            const phase = (performance.now() % 1800) / 1800;
            sweep.left = `${-70 + phase * 140}%`;
            sweep.alpha = 0.08 + Math.sin(performance.now() / 160) * 0.03;
        });
        this._uiObservers.push(sweepObs);

        this.activeLabel = new TextBlock("activeLabel");
        this.activeLabel.text = "ACTIVABLE";
        this.activeLabel.color = "#ffffff99";
        this.activeLabel.fontSize = 9;
        this.activeLabel.fontFamily = "monospace";
        this.activeLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.activeLabel.top = "8px";
        container.addControl(this.activeLabel);

        this.abilityIcon = new TextBlock("abilityIcon");
        this.abilityIcon.text = "ðŸ’Š";
        this.abilityIcon.fontSize = 42;
        this.abilityIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.abilityIcon.top = "8px";
        container.addControl(this.abilityIcon);

        // Large image shown when no emoji item is present (uses placeholder floppydisk)
        this.abilityIconImage = new Image("abilityIconImage", "/assets/items/disquette/disquette_gris.png");
        this.abilityIconImage.width = "70%";
        this.abilityIconImage.height = "90%";
        this.abilityIconImage.stretch = Image.STRETCH_UNIFORM;
        this.abilityIconImage.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.abilityIconImage.top = "8px";
        this.abilityIconImage.isVisible = false;
        container.addControl(this.abilityIconImage);

        this.abilityCooldownOverlay = new Rectangle("abilityCooldownOverlay");
        this.abilityCooldownOverlay.width = "100%";
        this.abilityCooldownOverlay.height = "0%";
        this.abilityCooldownOverlay.background = "#000000aa";
        this.abilityCooldownOverlay.thickness = 0;
        this.abilityCooldownOverlay.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        container.addControl(this.abilityCooldownOverlay);

        this.abilityCooldownText = new TextBlock("abilityCooldownText");
        this.abilityCooldownText.text = "";
        this.abilityCooldownText.color = "#f4cc69";
        this.abilityCooldownText.fontSize = 16;
        this.abilityCooldownText.fontFamily = "monospace";
        this.abilityCooldownText.fontStyle = "bold";
        this.abilityCooldownText.outlineColor = "#000000";
        this.abilityCooldownText.outlineWidth = 3;
        this.abilityCooldownText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.abilityCooldownText.top = "12px";
        container.addControl(this.abilityCooldownText);
    }

    // ─────────────────────────────────────────────────────
    // BARRE DE VIE BOSS (haut-centre, sous le timer)
    // ─────────────────────────────────────────────────────
    _buildBossBar() {
        const container = new Rectangle("bossBarContainer");
        container.width = "55%";
        container.height = "52px";
        container.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        container.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        container.topInPixels = 72;
        container.background = "#0d0005ee";
        container.color = "#ff224466";
        container.thickness = 1;
        container.cornerRadius = 4;
        container.isVisible = false;
        this.ui.addControl(container);
        this._bossBarContainer = container;

        const cornerTL = new Rectangle("bossCornerTL");
        cornerTL.width = "12px"; cornerTL.height = "12px";
        cornerTL.left = "-2px"; cornerTL.top = "-2px";
        cornerTL.thickness = 2; cornerTL.color = "#ff2244";
        cornerTL.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        cornerTL.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        cornerTL.isHitTestVisible = false;
        container.addControl(cornerTL);

        const cornerBR = new Rectangle("bossCornerBR");
        cornerBR.width = "12px"; cornerBR.height = "12px";
        cornerBR.right = "-2px"; cornerBR.bottom = "-2px";
        cornerBR.thickness = 2; cornerBR.color = "#ff2244";
        cornerBR.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        cornerBR.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        cornerBR.isHitTestVisible = false;
        container.addControl(cornerBR);

        const nameLabel = new TextBlock("bossNameLabel");
        nameLabel.text = "BOSS";
        nameLabel.color = "#ff6680";
        nameLabel.fontSize = 11;
        nameLabel.fontFamily = "monospace";
        nameLabel.fontStyle = "bold";
        nameLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameLabel.top = "5px";
        container.addControl(nameLabel);
        this._bossNameLabel = nameLabel;

        const barBg = new Rectangle("bossBarBg");
        barBg.width = "92%";
        barBg.height = "18px";
        barBg.background = "#1a0008";
        barBg.color = "#ff002266";
        barBg.thickness = 1;
        barBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        barBg.bottomInPixels = 7;
        barBg.cornerRadius = 3;
        container.addControl(barBg);

        const barFill = new Rectangle("bossBarFill");
        barFill.width = "100%";
        barFill.height = "100%";
        barFill.background = "#ff2244";
        barFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        barFill.cornerRadius = 3;
        barFill.thickness = 0;
        barBg.addControl(barFill);
        this._bossBarFill = barFill;

        const hpText = new TextBlock("bossHpText");
        hpText.text = "";
        hpText.color = "#ffffffcc";
        hpText.fontSize = 11;
        hpText.fontFamily = "monospace";
        hpText.fontStyle = "bold";
        barBg.addControl(hpText);
        this._bossHpText = hpText;

        // Pulse sur la bordure du container
        const bossGlowObs = this.scene.onBeforeRenderObservable.add(() => {
            if (!container.isVisible) return;
            container.alpha = 0.88 + 0.12 * Math.abs(Math.sin(performance.now() / 600));
        });
        this._uiObservers.push(bossGlowObs);
    }

    // ─────────────────────────────────────────────────────
    // COMPTEUR DE KILLS (bas-gauche, au-dessus de la vie)
    // ─────────────────────────────────────────────────────
    _buildKillCounter() {}

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

    updateBossBar(current, max, name) {
        if (!this._bossBarContainer) return;
        if (!this._bossBarContainer.isVisible) {
            this._bossBarContainer.isVisible = true;
            if (name && this._bossNameLabel) this._bossNameLabel.text = name.toUpperCase();
        }
        const pct = Math.max(0, Math.min(1, current / max));
        this._bossBarFill.width = (pct * 100) + "%";
        this._bossHpText.text = `${Math.max(0, Math.ceil(current))} / ${max}`;
        if (pct > 0.5) this._bossBarFill.background = "#ff2244";
        else if (pct > 0.25) this._bossBarFill.background = "#ff6600";
        else this._bossBarFill.background = "#cc0000";
    }

    hideBossBar() {
        if (this._bossBarContainer) this._bossBarContainer.isVisible = false;
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

    /** Alias pour compatibilité avec l'ancienne API */
    updateScore(score) {
        this.updateGears(score);
    }

    updateGears(count) {
        if (!this.gearCount) return;
        // Format large numbers to keep UI stable (e.g., 1.2k, 3.4M)
        let display = count;
        if (typeof count === 'number') {
            if (count >= 1_000_000) display = (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
            else if (count >= 1000) display = (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        this.gearCount.text = `${display}`;
    }

    updateKills(kills) {}

    /**
     * Met à jour la barre XP
     * @param {number} progress  0â†’1 fraction vers le prochain niveau
     * @param {number} level     niveau actuel
     */
    updateXP(progress, level) {
        this.xpFill.width = Math.round(progress * 100) + "%";
    }

    updateItems(items) {
        if (!this.itemsListPanel) return;

        // On recrée la liste (performance OK pour un tableau de < 50 items)
        this.itemsListPanel.clearControls();
        items.forEach(item => {
            // Row: image + name
            const row = new StackPanel(`itemRow_${item.id}_${Math.random()}`);
            row.isVertical = false;
            row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            row.height = "28px";

            const img = new Image(`itemImg_${item.id}_${Math.random()}`, item.sprite || item.image || "assets/items/disquette.png");
            img.width = "40px";
            img.height = "40px";
            img.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
            img.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            row.addControl(img);

            const txt = new TextBlock(`item_${item.id}_${Math.random()}`); // random pour éviter conflit si items multiples
            txt.text = `${item.name} ${item.rarityStars || ''}`;
            txt.color = item.rarityColor || "#ffffff";
            txt.fontSize = 12;
            txt.height = "36px";
            txt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
            txt.fontFamily = "monospace";
            txt.paddingLeft = "10px";
            row.addControl(txt);

            this.itemsListPanel.addControl(row);

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
            this.roundStateText.text = "âš  PRÉPAREZ-VOUS";
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
            this.roundTimer.text = "âœ“ WIN";
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
        const icons = { heal: "ðŸ’Š", grenade: "ðŸ’£" };
        this._lastItemType = itemType;

        if (itemType == null) {
            // show image when there's no emoji-type item
            try { this.abilityIconImage.source = "/assets/items/disquette/disquette_gris.png"; } catch (e) { /* ignore */ }
            this.abilityIconImage.isVisible = true;
            this.abilityIcon.isVisible = false;
        } else {
            this.abilityIcon.text = icons[itemType] ?? "—";
            this.abilityIcon.isVisible = true;
            if (this.abilityIconImage) this.abilityIconImage.isVisible = false;
        }

        const overlayHeight = Math.round(cooldownPercent * 100);
        this.abilityCooldownOverlay.height = overlayHeight + "%";
        this.abilityCooldownOverlay.background = cooldownPercent > 0.5 ? "#ff7ac844" : "#68f0ff33";

        const onCooldown = cooldownRemaining > 0.05 || cooldownPercent > 0.01;
        if (onCooldown) {
            const hasSeconds = cooldownRemaining > 0.05;
            const display = hasSeconds
                ? `${Math.max(1, Math.ceil(cooldownRemaining))}s`
                : `${Math.max(1, Math.ceil(cooldownPercent * 100))}%`;
            this.activeLabel.text = display;
            this.activeLabel.color = "#f4cc69";
            this.abilityCooldownText.text = display;
        } else {
            this.activeLabel.text = "ACTIVABLE";
            this.activeLabel.color = "#ffffff99";
            this.abilityCooldownText.text = "";
        }
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

    dispose() {
        for (const obs of this._uiObservers) {
            try {
                this.scene.onBeforeRenderObservable.remove(obs);
            } catch (e) { /* ignore */ }
        }
        this._uiObservers = [];
        try { this.ui.dispose(); } catch (e) { /* ignore */ }
    }
}
