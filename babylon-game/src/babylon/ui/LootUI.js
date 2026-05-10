import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Button,
    Image,
} from '@babylonjs/gui';

/**
 * LootUI — Écran plein-écran de sélection d'item après chaque round.
 *
 * Affiche 3 cartes d'items côte à côte. Le joueur clique sur une carte
 * pour l'équiper. L'écran disparaît ensuite.
 *
 * Usage :
 *   const lootUI = new LootUI(scene)
 *   lootUI.show(pool, buildSystem, () => startNextRound())
 *   // pool = Item[] (3 items générés par LootSystem)
 */
export class LootUI {

    constructor(scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('LootUI');
        this.ui.isForeground = true; // toujours au-dessus de l'UI de jeu
        this._overlay = null;
        this._visible = false;
        this._isClosing = false;
        this._listeners = []; // ── MEMORY FIX: Store observable references for cleanup
    }

    get isVisible() { return this._visible; }

    // ─────────────────────────────────────────────────────
    // AFFICHER L'ÉCRAN DE LOOT
    // ─────────────────────────────────────────────────────

    /**
     * Affiche l'écran de sélection d'item.
     * @param {Object[]} pool      3 plain-objects depuis ItemDatabase
     * @param {Player} player      le joueur (pour player.inventory.addItem)
     * @param {function} onPick   callback quand un item est choisi
     * @param {number} [level=1]  niveau actuel (affichage)
     */
    show(pool, player, onPick, level = 1) {
        this._clearUI();
        this._visible = true;
        this._isClosing = false;

        // ── Fond sombre semi-transparent ──
        const overlay = new Rectangle('lootOverlay');
        overlay.width = '100%';
        overlay.height = '100%';
        overlay.background = '#000000cc';
        overlay.thickness = 0;
        this.ui.addControl(overlay);
        this._overlay = overlay;

        // ── Titre ──
        const title = new TextBlock('lootTitle');
        title.text = `⬆  NIVEAU ${level}  —  CHOISISSEZ UN MODULE`;
        title.color = '#ffcc00';
        title.fontSize = 26;
        title.fontFamily = 'monospace';
        title.fontStyle = 'bold';
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        title.topInPixels = 80;
        title.height = "40px";
        overlay.addControl(title);

        const subtitle = new TextBlock('lootSubtitle');
        subtitle.text = 'Cliquez sur une carte pour équiper le module';
        subtitle.color = '#ffffff88';
        subtitle.fontSize = 14;
        subtitle.fontFamily = 'monospace';
        subtitle.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        subtitle.topInPixels = 120;
        subtitle.height = "30px";
        overlay.addControl(subtitle);

        // ── Conteneur des cartes ──
        const cardContainer = new Rectangle('cardContainer');
        cardContainer.width = '900px';
        cardContainer.height = '460px';
        cardContainer.thickness = 0;
        cardContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        cardContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        overlay.addControl(cardContainer);

        // ── 3 Cartes ──
        const cardWidth = 260;
        const cardGap = 30;
        const totalWidth = pool.length * cardWidth + (pool.length - 1) * cardGap;
        const startX = -(totalWidth / 2) + (cardWidth / 2);

        pool.forEach((item, idx) => {
            const xOff = startX + idx * (cardWidth + cardGap);
            this._buildCard(item, xOff, cardContainer, player, onPick, pool);
        });

        // Animation d'apparition
        overlay.alpha = 0;
        const startTime = performance.now();
        const fadeIn = this.scene.onBeforeRenderObservable.add(() => {
            const t = Math.min(1, (performance.now() - startTime) / 300);
            overlay.alpha = t;
            if (t >= 1) this.scene.onBeforeRenderObservable.remove(fadeIn);
        });
    }

    // ─────────────────────────────────────────────────────
    // CRÉER UNE CARTE D'ITEM
    // ─────────────────────────────────────────────────────

    _buildCard(item, xOffset, parent, player, onPick, pool) {
        const color = LootUI._rarityColor(item.rarity);
        const card = new Rectangle(`card_${item.id}`);
        card.width = '260px';
        card.height = '440px';
        card.background = '#0a0a14';
        card.color = color;
        card.thickness = 2;
        card.cornerRadius = 4;
        card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        card.leftInPixels = xOffset;
        parent.addControl(card);

        LootUI._addNeonCardContours(this.scene, card, color, this._listeners);

        // ── Bandeau rareté (haut de la carte) ──
        const rarityBg = new Rectangle(`rarity_${item.id}`);
        rarityBg.width = '100%';
        rarityBg.height = '48px';
        // align left so leftInPixels on children is relative to left edge
        rarityBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        rarityBg.leftInPixels = 0;
        rarityBg.background = color + '26';
        rarityBg.thickness = 0;
        rarityBg.cornerRadius = 4;
        rarityBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        card.addControl(rarityBg);

        // Afficher des étoiles en image plutôt qu'un emoji
        // déterminer le nombre d'étoiles : item.rarity (number) ou item.rarityStars (string de â˜…)
        let starCount = 0;
        if (typeof item.rarity === 'number') starCount = item.rarity;
        else if (typeof item.rarityStars === 'string') {
            const m = item.rarityStars.match(/â˜…/g);
            starCount = m ? m.length : 0;
        }
        if (starCount <= 0) starCount = 1;

        // center stars in the 260px card
        const cardWidth = 260;
        const starSpacing = 22; // px between star origins
        const starW = 20;
        const totalStarWidth = (starCount - 1) * starSpacing + starW;
        const startLeft = Math.round((cardWidth - totalStarWidth) / 2);
        for (let i = 0; i < starCount; i++) {
            const starImg = new Image(`star_${item.id}_${i}`, 'assets/star.png');
            starImg.width = '20px';
            starImg.height = '20px';
            starImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
            starImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            starImg.leftInPixels = startLeft + i * starSpacing;
            rarityBg.addControl(starImg);
        }

        // ── Icône ──
        // Icône de l'item (image) — remplace le grand emoji
        const iconImg = new Image(`icon_${item.id}`, item.sprite || item.image || 'assets/items/floppydisk.png');
        iconImg.width = '96px';
        iconImg.height = '96px';
        iconImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        iconImg.topInPixels = 52; // slightly up to make room
        card.addControl(iconImg);

        // ── Nom ──
        const nameText = new TextBlock(`name_${item.id}`);
        nameText.text = item.name;
        nameText.color = '#ffffff';
        nameText.fontSize = 16;
        nameText.fontFamily = 'monospace';
        nameText.fontStyle = 'bold';
        nameText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.topInPixels = 156; // placed under the icon
        nameText.height = "34px";
        nameText.textWrapping = true;
        nameText.width = '90%';
        card.addControl(nameText);

        // ── Slot ──
        const slotText = new TextBlock(`slot_${item.id}`);
        const slotIcons = {
            head: '🔧 Tête', body: '🔧 Corps',
            arm: '🔧 Bras', leg: '🔧 Jambe', active: '⚡ Actif', none: '∞ Libre',
            rightArm: '🔧 Bras D', leftArm: '🔧 Bras G', rightLeg: '🔧 Jambe D', leftLeg: '🔧 Jambe G',
        };
        slotText.text = slotIcons[item.slot] ?? item.slot;
        slotText.color = '#ffffff55';
        slotText.fontSize = 11;
        slotText.fontFamily = 'monospace';
        slotText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        slotText.topInPixels = 194; // below name
        slotText.height = "20px";
        card.addControl(slotText);

        // ── Modificateurs de stats ──
        const modText = new TextBlock(`mod_${item.id}`);
        modText.text = LootUI._formatModifiers(item.modifiers) || item.bonus || item.description || '';
        modText.color = color;
        modText.fontSize = 12;
        modText.fontFamily = 'monospace';
        modText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        modText.topInPixels = 218;
        modText.height = '110px';
        modText.textWrapping = true;
        modText.width = '88%';
        card.addControl(modText);

        // ── ExtraInfo (mécanique spéciale) ──
        if (item.extraInfo) {
            const extraText = new TextBlock(`extra_${item.id}`);
            extraText.text = item.extraInfo;
            extraText.color = '#ffffff88';
            extraText.fontSize = 11;
            extraText.fontFamily = 'monospace';
            extraText.fontStyle = 'italic';
            extraText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
            extraText.topInPixels = 330;
            extraText.height = '50px';
            extraText.textWrapping = true;
            extraText.width = '88%';
            card.addControl(extraText);
        }

        // ── Bouton Choisir ──
        const btn = Button.CreateSimpleButton(`btn_${item.id}`, 'ÉQUIPER');
        btn.width = '85%';
        btn.height = '44px';
        btn.background = '#0f1020';
        btn.color = color;
        btn.thickness = 2;
        btn.cornerRadius = 4;
        btn.fontSize = 14;
        btn.fontFamily = 'monospace';
        btn.fontStyle = 'bold';
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        btn.bottomInPixels = 14;
        card.addControl(btn);

        const btnGlow = new Rectangle(`btnGlow_${item.id}`);
        btnGlow.width = '120%';
        btnGlow.height = '10px';
        btnGlow.left = '-70%';
        btnGlow.top = '10px';
        btnGlow.background = color;
        btnGlow.alpha = 0.12;
        btnGlow.thickness = 0;
        btnGlow.isHitTestVisible = false;
        btn.addControl(btnGlow);

        const btnObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (!btn || !btn.parent || !btn._host) return;
            const phase = (performance.now() % 1600) / 1600;
            btnGlow.left = `${-70 + phase * 140}%`;
            btnGlow.alpha = 0.08 + Math.sin(performance.now() / 240) * 0.02 + (btn.isPointerOver ? 0.08 : 0);
        });
        this._listeners.push({ cleanup: () => this.scene.onBeforeRenderObservable.remove(btnObserver) });

        // ── Hover effect ──
        card.onPointerEnterObservable.add(() => {
            card.background = '#111126';
            card.thickness = 3;
        });
        card.onPointerOutObservable.add(() => {
            card.background = '#0a0a14';
            card.thickness = 2;
        });

        // ── Click : équiper l'item ──
        const pickItem = () => {
            if (this._isClosing) return;
            this._isClosing = true;
            player.inventory.addItem(item.id);
            this.hide(() => onPick(item));
        };

        // ── MEMORY FIX: Store observer references for cleanup ──
        const btnClickObserver = btn.onPointerClickObservable.add(pickItem);
        const cardClickObserver = card.onPointerClickObservable.add(pickItem);
        this._listeners.push({ observable: btn.onPointerClickObservable, observer: btnClickObserver });
        this._listeners.push({ observable: card.onPointerClickObservable, observer: cardClickObserver });
    }

    // ─────────────────────────────────────────────────────
    // MASQUER L'ÉCRAN
    // ─────────────────────────────────────────────────────

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
                this._isClosing = false;
                this.scene.onBeforeRenderObservable.remove(fadeOut);
                if (typeof onHidden === 'function') onHidden();
            }
        });
    }

    _clearUI() {
        // ── MEMORY FIX: Remove all observable listeners before disposing controls ──
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
        this._overlay = null;
    }
    static _mixHex(hexA, hexB, t) {
        const a = parseInt((hexA || '#ffffff').replace('#', ''), 16);
        const b = parseInt((hexB || '#000000').replace('#', ''), 16);
        const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        const k = Math.max(0, Math.min(1, t));
        const rr = Math.round(ar + (br - ar) * k);
        const rg = Math.round(ag + (bg - ag) * k);
        const rb = Math.round(ab + (bb - ab) * k);
        const n = (rr << 16) | (rg << 8) | rb;
        return `#${n.toString(16).padStart(6, '0')}`;
    }

    static _addNeonCardContours(scene, card, accentColor, listeners) {
        const darkTone = LootUI._mixHex(accentColor, '#0a0a14', 0.42);
        const brightTone = LootUI._mixHex(accentColor, '#ffffff', 0.34);

        const auraOuter = new Rectangle(`${card.name}_auraOuter`);
        auraOuter.width = '100%';
        auraOuter.height = '100%';
        auraOuter.thickness = 2;
        auraOuter.color = darkTone;
        auraOuter.background = '#00000000';
        auraOuter.cornerRadius = 4;
        auraOuter.alpha = 0.7;
        auraOuter.isHitTestVisible = false;
        card.addControl(auraOuter);

        const auraInner = new Rectangle(`${card.name}_auraInner`);
        auraInner.width = '98%';
        auraInner.height = '98%';
        auraInner.thickness = 1;
        auraInner.color = brightTone;
        auraInner.background = '#00000000';
        auraInner.cornerRadius = 3;
        auraInner.alpha = 0.82;
        auraInner.isHitTestVisible = false;
        card.addControl(auraInner);

        const addCorner = (suffix, horizontalPos, verticalPos) => {
            const hOuter = new Rectangle(`${card.name}_${suffix}_ho`);
            hOuter.width = '26px';
            hOuter.height = '2px';
            hOuter.background = darkTone;
            hOuter.thickness = 0;
            hOuter.alpha = 0.86;
            hOuter.isHitTestVisible = false;
            hOuter.horizontalAlignment = horizontalPos === 'left' ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
            hOuter.verticalAlignment = verticalPos === 'top' ? Control.VERTICAL_ALIGNMENT_TOP : Control.VERTICAL_ALIGNMENT_BOTTOM;
            hOuter[horizontalPos] = '8px';
            hOuter[verticalPos] = '8px';
            card.addControl(hOuter);

            const hInner = new Rectangle(`${card.name}_${suffix}_hi`);
            hInner.width = '18px';
            hInner.height = '2px';
            hInner.background = brightTone;
            hInner.thickness = 0;
            hInner.alpha = 0.98;
            hInner.isHitTestVisible = false;
            hInner.horizontalAlignment = hOuter.horizontalAlignment;
            hInner.verticalAlignment = hOuter.verticalAlignment;
            hInner[horizontalPos] = '9px';
            hInner[verticalPos] = '9px';
            card.addControl(hInner);

            const vOuter = new Rectangle(`${card.name}_${suffix}_vo`);
            vOuter.width = '2px';
            vOuter.height = '26px';
            vOuter.background = darkTone;
            vOuter.thickness = 0;
            vOuter.alpha = 0.86;
            vOuter.isHitTestVisible = false;
            vOuter.horizontalAlignment = hOuter.horizontalAlignment;
            vOuter.verticalAlignment = hOuter.verticalAlignment;
            vOuter[horizontalPos] = '8px';
            vOuter[verticalPos] = '8px';
            card.addControl(vOuter);

            const vInner = new Rectangle(`${card.name}_${suffix}_vi`);
            vInner.width = '2px';
            vInner.height = '18px';
            vInner.background = brightTone;
            vInner.thickness = 0;
            vInner.alpha = 0.98;
            vInner.isHitTestVisible = false;
            vInner.horizontalAlignment = hOuter.horizontalAlignment;
            vInner.verticalAlignment = hOuter.verticalAlignment;
            vInner[horizontalPos] = '9px';
            vInner[verticalPos] = '9px';
            card.addControl(vInner);
        };

        addCorner('tl', 'left', 'top');
        addCorner('tr', 'right', 'top');
        addCorner('bl', 'left', 'bottom');
        addCorner('br', 'right', 'bottom');

        const sweepDark = new Rectangle(`${card.name}_sweepDark`);
        sweepDark.width = '130%';
        sweepDark.height = '12px';
        sweepDark.left = '-75%';
        sweepDark.top = '22px';
        sweepDark.background = darkTone;
        sweepDark.alpha = 0.08;
        sweepDark.thickness = 0;
        sweepDark.isHitTestVisible = false;
        card.addControl(sweepDark);

        const sweepBright = new Rectangle(`${card.name}_sweepBright`);
        sweepBright.width = '90%';
        sweepBright.height = '8px';
        sweepBright.left = '-60%';
        sweepBright.top = '24px';
        sweepBright.background = brightTone;
        sweepBright.alpha = 0.14;
        sweepBright.thickness = 0;
        sweepBright.isHitTestVisible = false;
        card.addControl(sweepBright);

        const observer = scene.onBeforeRenderObservable.add(() => {
            if (!card || !card.parent || !card._host) return;
            const now = performance.now();
            const phase = (now % 1800) / 1800;
            sweepDark.left = `${-75 + phase * 150}%`;
            sweepBright.left = `${-60 + phase * 130}%`;
            const pulse = 0.5 + Math.sin(now / 210) * 0.5;
            auraOuter.alpha = 0.56 + pulse * 0.18 + (card.isPointerOver ? 0.2 : 0);
            auraInner.alpha = 0.72 + pulse * 0.16 + (card.isPointerOver ? 0.2 : 0);
            sweepDark.alpha = 0.05 + pulse * 0.04 + (card.isPointerOver ? 0.04 : 0);
            sweepBright.alpha = 0.08 + pulse * 0.08 + (card.isPointerOver ? 0.06 : 0);
        });

        listeners.push({ cleanup: () => scene.onBeforeRenderObservable.remove(observer) });
    }
    /** Formate les modifiers d'un item en texte lisible (ex: "+20% Dégâts\n+10% Vitesse"). */
    static _formatModifiers(modifiers) {
        if (!modifiers) return '';
        const entries = Object.entries(modifiers);
        if (entries.length === 0) return '';

        const LABELS = {
            damage: 'Dégâts', speed: 'Vitesse', fireRate: 'Cadence de tir',
            luck: 'Chance', armor: 'Armure', regen: 'Regen', lifesteal: 'Vol de vie',
            strength: 'Force', cooldownReduction: 'Rechargement',
            damageMultiplier: 'Dégâts', damageTakenMultiplier: 'Dégâts subis',
            projectileMultiplier: 'Projectiles', itemEffectMultiplier: 'Effets items',
            additionalProjectiles: 'Projectile bonus', orbitingProjectiles: 'Projectiles orbitants',
            explosionRadius: 'Rayon explosion', explosionDamage: 'Dégâts explosion',
            explosionProc: 'Chance explosion', aoeDamage: 'Dégâts zone', areaDamage: 'Dégâts zone',
            burnDamage: 'Dégâts feu', burnProc: 'Chance feu',
            slowEffect: 'Ralentissement', slowProc: 'Chance ralenti',
            knockback: 'Recul', dotDamage: 'Dégâts continus',
            conversionChance: 'Chance conversion', chainDamageCount: 'Chaînes',
            contactDamage: 'Dégâts contact', iframes: 'Invincibilité',
            enemySlowRadius: 'Rayon ralenti', healthRegen: 'Régénération',
            homingProjectiles: 'Projectiles guidés', poisonToHeal: 'Poison→Soin',
            preventStatDecrease: 'Stats protégées', invulnerable: 'Invulnérable',
            restartWithItems: 'Restart avec items', rerollToken: 'Reroll',
            respawnCount: 'Résurrection', armSlots: 'Slot bras', bodySlots: 'Slot corps',
            headSlots: 'Slot tête', legSlots: 'Slot jambes',
        };

        // Clés dont la valeur est une probabilité (0-1 = 0%-100%)
        const PROC_KEYS = new Set(['burnProc', 'slowProc', 'explosionProc', 'conversionChance']);

        return entries.map(([key, val]) => {
            const label = LABELS[key] ?? key;
            if (typeof val === 'boolean') return val ? `✓ ${label}` : `✗ ${label}`;
            if (key.endsWith('Multiplier')) return `×${val} ${label}`;
            if (PROC_KEYS.has(key)) {
                const pct = Math.round(val * 100);
                return `${pct >= 0 ? '+' : ''}${pct}% ${label}`;
            }
            // Valeur flat : afficher telle quelle
            const sign = val >= 0 ? '+' : '';
            const display = Number.isInteger(val) ? val : Math.round(val * 100) / 100;
            return `${sign}${display} ${label}`;
        }).join('\n');
    }

    /** Couleur CSS associée à la rareté (remplace Item.rarityColor pour les plain-objects). */
    static _rarityColor(rarity) {
        return { 1: '#aaaaaa', 2: '#44cc44', 3: '#4488ff', 4: '#ff9900' }[rarity] ?? '#ffffff';
    }

    dispose() {
        this._clearUI();
        this.ui.dispose();
    }
}
