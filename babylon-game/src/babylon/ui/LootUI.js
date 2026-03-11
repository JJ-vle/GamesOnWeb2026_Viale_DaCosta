import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Button,
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
    }

    get isVisible() { return this._visible; }

    // ─────────────────────────────────────────────────────
    // AFFICHER L'ÉCRAN DE LOOT
    // ─────────────────────────────────────────────────────

    /**
     * Affiche l'écran de sélection d'item.
     * @param {Item[]} pool        3 items proposés
     * @param {BuildSystem} buildSystem
     * @param {function} onPick   callback quand un item est choisi
     * @param {number} [level=1]  niveau actuel (affichage)
     */
    show(pool, buildSystem, onPick, level = 1) {
        this._clearUI();
        this._visible = true;

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
            this._buildCard(item, xOff, cardContainer, buildSystem, onPick, pool);
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

    _buildCard(item, xOffset, parent, buildSystem, onPick, pool) {
        const card = new Rectangle(`card_${item.id}`);
        card.width = '260px';
        card.height = '340px';
        card.background = '#0d0d1e';
        card.color = item.rarityColor;
        card.thickness = 2;
        card.cornerRadius = 12;
        card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        card.leftInPixels = xOffset;
        parent.addControl(card);

        // ── Bandeau rareté (haut de la carte) ──
        const rarityBg = new Rectangle(`rarity_${item.id}`);
        rarityBg.width = '100%';
        rarityBg.height = '40px';
        rarityBg.background = item.rarityColor + '33';
        rarityBg.thickness = 0;
        rarityBg.cornerRadius = 10;
        rarityBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        card.addControl(rarityBg);

        const rarityText = new TextBlock(`rarityTxt_${item.id}`);
        rarityText.text = item.rarityStars;
        rarityText.fontSize = 18;
        rarityText.color = item.rarityColor;
        rarityBg.addControl(rarityText);

        // ── Icône ──
        const iconText = new TextBlock(`icon_${item.id}`);
        iconText.text = item.icon;
        iconText.fontSize = 52;
        iconText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        iconText.topInPixels = 50;
        iconText.height = "70px";
        card.addControl(iconText);

        // ── Nom ──
        const nameText = new TextBlock(`name_${item.id}`);
        nameText.text = item.name;
        nameText.color = '#ffffff';
        nameText.fontSize = 16;
        nameText.fontFamily = 'monospace';
        nameText.fontStyle = 'bold';
        nameText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.topInPixels = 128; // recadré légèrement
        nameText.height = "34px";
        nameText.textWrapping = true;
        nameText.width = '90%';
        card.addControl(nameText);

        // ── Slot ──
        const slotText = new TextBlock(`slot_${item.id}`);
        const slotIcons = { head: '🔧 Tête', body: '🔧 Corps', arms: '🔧 Bras', legs: '🔧 Jambes' };
        slotText.text = slotIcons[item.slot] ?? item.slot;
        slotText.color = '#ffffff55';
        slotText.fontSize = 11;
        slotText.fontFamily = 'monospace';
        slotText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        slotText.topInPixels = 166;
        slotText.height = "25px";
        card.addControl(slotText);

        // ── Description ──
        const descText = new TextBlock(`desc_${item.id}`);
        descText.text = item.description;
        descText.color = item.rarityColor;
        descText.fontSize = 14;
        descText.fontFamily = 'monospace';
        descText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        descText.topInPixels = 196;
        descText.height = "60px";
        descText.textWrapping = true;
        descText.width = '85%';
        card.addControl(descText);

        // ── Bouton Choisir ──
        const btn = Button.CreateSimpleButton(`btn_${item.id}`, 'ÉQUIPER');
        btn.width = '85%';
        btn.height = '44px';
        btn.background = item.rarityColor + '22';
        btn.color = item.rarityColor;
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
            buildSystem.equipItem(item);
            onPick(item);
            this.hide();
        };

        btn.onPointerClickObservable.add(pickItem);
        card.onPointerClickObservable.add(pickItem);
    }

    // ─────────────────────────────────────────────────────
    // MASQUER L'ÉCRAN
    // ─────────────────────────────────────────────────────

    hide() {
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
            }
        });
    }

    _clearUI() {
        this.ui.getControlsByType('Rectangle').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this.ui.getControlsByType('TextBlock').forEach(c => {
            try { c.dispose(); } catch (e) { /* ignore */ }
        });
        this._overlay = null;
    }

    dispose() {
        this._clearUI();
        this.ui.dispose();
    }
}
