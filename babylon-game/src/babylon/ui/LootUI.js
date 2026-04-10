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
        cardContainer.height = '360px';
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
        card.height = '340px';
        card.background = '#0d0d1e';
        card.color = color;
        card.thickness = 2;
        card.cornerRadius = 12;
        card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        card.leftInPixels = xOffset;
        parent.addControl(card);

        // ── Bandeau rareté (haut de la carte) ──
        const rarityBg = new Rectangle(`rarity_${item.id}`);
        rarityBg.width = '100%';
        rarityBg.height = '48px';
        // align left so leftInPixels on children is relative to left edge
        rarityBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        rarityBg.leftInPixels = 0;
        rarityBg.background = color + '33';
        rarityBg.thickness = 0;
        rarityBg.cornerRadius = 10;
        rarityBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        card.addControl(rarityBg);

        // Afficher des étoiles en image plutôt qu'un emoji
        // déterminer le nombre d'étoiles : item.rarity (number) ou item.rarityStars (string de ★)
        let starCount = 0;
        if (typeof item.rarity === 'number') starCount = item.rarity;
        else if (typeof item.rarityStars === 'string') {
            const m = item.rarityStars.match(/★/g);
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
        const iconImg = new Image(`icon_${item.id}` , item.image || 'assets/items/floppydisk.png');
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

        // ── Description ──
        const descText = new TextBlock(`desc_${item.id}`);
        descText.text = item.extraInfo || item.bonus || item.description || '';
        descText.color = color;
        descText.fontSize = 14;
        descText.fontFamily = 'monospace';
        descText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        descText.topInPixels = 220;
        descText.height = "60px";
        descText.textWrapping = true;
        descText.width = '85%';
        card.addControl(descText);

        // ── Bouton Choisir ──
        const btn = Button.CreateSimpleButton(`btn_${item.id}`, 'ÉQUIPER');
        btn.width = '85%';
        btn.height = '44px';
        btn.background = color + '22';
        btn.color = color;
        btn.thickness = 1;
        btn.cornerRadius = 8;
        btn.fontSize = 14;
        btn.fontFamily = 'monospace';
        btn.fontStyle = 'bold';
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        btn.bottomInPixels = 14;
        card.addControl(btn);

        // ── Hover effect ──
        card.onPointerEnterObservable.add(() => {
            card.background = '#1a1a2e';
            card.thickness = 3;
        });
        card.onPointerOutObservable.add(() => {
            card.background = '#0d0d1e';
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
        this._overlay = null;
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
