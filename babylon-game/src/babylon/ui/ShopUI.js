import {
    AdvancedDynamicTexture,
    Rectangle,
    TextBlock,
    Control,
    Button,
    Image,
} from '@babylonjs/gui';

/**
 * ShopUI — Interface du marchand cyber.
 *
 * Combine DialogueView + LootUI :
 *   - Sprite du marchand (gauche)
 *   - Dialogue dynamique (haut-centre)
 *   - 4 items à vendre (grille)
 *   - Choix + confirmation d'achat
 *
 * Usage :
 *   const shopUI = new ShopUI(scene)
 *   shopUI.show(pool, player, () => onClose())
 */
export class ShopUI {

    constructor(scene) {
        this.scene = scene;
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('ShopUI');
        this.ui.isForeground = true;
        this._overlay = null;
        this._visible = false;
        this._isClosing = false;
        this._listeners = [];
        this._selectedItem = null;
    }

    get isVisible() { return this._visible; }

    // ─────────────────────────────────────────────────────
    // AFFICHER L'INTERFACE DU SHOP
    // ─────────────────────────────────────────────────────

    /**
     * Affiche l'interface du shop.
     * @param {Object[]} pool        4 items avec { id, name, rarity, price, ... }
     * @param {Player} player        le joueur (inventory + money)
     * @param {function} onClose     callback après fermeture
     */
    show(pool, player, onClose) {
        this._clearUI();
        this._visible = true;
        this._isClosing = false;
        this._selectedItem = null;

        // ── Fond overlay ──
        const overlay = new Rectangle('shopOverlay');
        overlay.width = '100%';
        overlay.height = '100%';
        overlay.background = '#000000dd';
        overlay.thickness = 0;
        this.ui.addControl(overlay);
        this._overlay = overlay;

        // ── Sprite du marchand (gauche) ──
        const merchantContainer = new Rectangle('merchantContainer');
        merchantContainer.width = '240px';
        merchantContainer.height = '600px';
        merchantContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        merchantContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        merchantContainer.leftInPixels = 30;
        merchantContainer.thickness = 0;
        overlay.addControl(merchantContainer);

        const merchantBg = new Rectangle('merchantBg');
        merchantBg.width = '100%';
        merchantBg.height = '100%';
        merchantBg.background = '#0a0a14';
        merchantBg.color = '#68f0ff';
        merchantBg.thickness = 2;
        merchantBg.cornerRadius = 4;
        merchantBg.isHitTestVisible = false;
        merchantContainer.addControl(merchantBg);

        const merchantImg = new Image('merchantSprite', 'assets/items/usb/cle_usb_orange.png');
        merchantImg.width = '160px';
        merchantImg.height = '160px';
        merchantImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        merchantImg.topInPixels = 40;
        merchantContainer.addControl(merchantImg);

        const merchantLabel = new TextBlock('merchantLabel');
        merchantLabel.text = '🤖 MARCHAND';
        merchantLabel.color = '#ffcc00';
        merchantLabel.fontSize = 14;
        merchantLabel.fontFamily = 'monospace';
        merchantLabel.fontStyle = 'bold';
        merchantLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        merchantLabel.topInPixels = 220;
        merchantContainer.addControl(merchantLabel);

        // ─── Dialogue (centre-haut) ───
        const dialogContainer = new Rectangle('dialogContainer');
        dialogContainer.width = '800px';
        dialogContainer.height = '140px';
        dialogContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        dialogContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        dialogContainer.topInPixels = 40;
        dialogContainer.background = '#0f1020';
        dialogContainer.color = '#68f0ff';
        dialogContainer.thickness = 2;
        dialogContainer.cornerRadius = 4;
        overlay.addControl(dialogContainer);

        const dialogBg = new Rectangle('dialogBg');
        dialogBg.width = '100%';
        dialogBg.height = '100%';
        dialogBg.background = '#0a0a14';
        dialogBg.thickness = 0;
        dialogBg.isHitTestVisible = false;
        dialogContainer.addControl(dialogBg);

        this._dialogueText = new TextBlock('shopDialogueText');
        this._dialogueText.text = 'Qu\'est ce qu\'il vous ferait cyber-plaisir ?';
        this._dialogueText.color = '#ffffff';
        this._dialogueText.fontSize = 16;
        this._dialogueText.fontFamily = 'monospace';
        this._dialogueText.textWrapping = true;
        this._dialogueText.width = '90%';
        this._dialogueText.height = '100px';
        dialogContainer.addControl(this._dialogueText);

        // ─── Grille d'items (2x2) ───
        const gridContainer = new Rectangle('gridContainer');
        gridContainer.width = '900px';
        gridContainer.height = '520px';
        gridContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        gridContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        gridContainer.thickness = 0;
        overlay.addControl(gridContainer);

        // ── Afficher les 4 items en grille ──
        const positions = [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 1, col: 0 },
            { row: 1, col: 1 },
        ];

        pool.forEach((item, idx) => {
            if (idx >= 4) return;
            const pos = positions[idx];
            const offsetX = pos.col * 460 - 230;
            const offsetY = pos.row * 280 - 140;
            this._buildShopCard(item, offsetX, offsetY, gridContainer, player, onClose);
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
    // CRÉER UNE CARTE DE SHOP
    // ─────────────────────────────────────────────────────

    _buildShopCard(item, xOffset, yOffset, parent, player, onClose) {
        const color = ShopUI._rarityColor(item.rarity);
        const canAfford = player.money >= item.price;

        const card = new Rectangle(`card_${item.id}`);
        card.width = '420px';
        card.height = '240px';
        card.background = '#0a0a14';
        card.color = canAfford ? color : '#555555';
        card.thickness = canAfford ? 2 : 1;
        card.cornerRadius = 4;
        card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        card.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        card.leftInPixels = xOffset;
        card.topInPixels = yOffset;
        card.isPointerBlocker = canAfford; // Bloquer interactions si pas d'argent
        parent.addControl(card);

        // Effet désaturation si pas assez d'argent
        if (!canAfford) {
            card.alpha = 0.6;
        }

        ShopUI._addNeonCardContours(this.scene, card, canAfford ? color : '#666666', this._listeners);

        // ── Bandeau rareté ──
        const rarityBg = new Rectangle(`rarity_${item.id}`);
        rarityBg.width = '100%';
        rarityBg.height = '40px';
        rarityBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        rarityBg.leftInPixels = 0;
        rarityBg.background = (canAfford ? color : '#666666') + '26';
        rarityBg.thickness = 0;
        rarityBg.cornerRadius = 4;
        rarityBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        card.addControl(rarityBg);

        // ── Étoiles ──
        let starCount = item.rarity;
        const cardWidth = 420;
        const starSpacing = 24;
        const starW = 18;
        const totalStarWidth = (starCount - 1) * starSpacing + starW;
        const startLeft = Math.round((cardWidth - totalStarWidth) / 2);

        for (let i = 0; i < starCount; i++) {
            const starImg = new Image(`star_${item.id}_${i}`, 'assets/star.png');
            starImg.width = '18px';
            starImg.height = '18px';
            starImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
            starImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            starImg.leftInPixels = startLeft + i * starSpacing;
            starImg.alpha = canAfford ? 1 : 0.5;
            rarityBg.addControl(starImg);
        }

        // ── Icône ──
        const iconImg = new Image(`icon_${item.id}`, item.sprite || item.image || 'assets/items/floppydisk.png');
        iconImg.width = '70px';
        iconImg.height = '70px';
        iconImg.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        iconImg.topInPixels = 50;
        iconImg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        iconImg.leftInPixels = 16;
        iconImg.alpha = canAfford ? 1 : 0.5;
        card.addControl(iconImg);

        // ── Nom + Prix ──
        const textContainer = new Rectangle('textContainer');
        textContainer.width = 'calc(100% - 100px)';
        textContainer.height = '100px';
        textContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        textContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        textContainer.leftInPixels = 100;
        textContainer.topInPixels = 50;
        textContainer.thickness = 0;
        card.addControl(textContainer);

        const nameText = new TextBlock(`name_${item.id}`);
        nameText.text = item.name;
        nameText.color = canAfford ? '#ffffff' : '#999999';
        nameText.fontSize = 14;
        nameText.fontFamily = 'monospace';
        nameText.fontStyle = 'bold';
        nameText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        nameText.textWrapping = true;
        nameText.height = '40px';
        textContainer.addControl(nameText);

        const bonusText = new TextBlock(`bonus_${item.id}`);
        bonusText.text = item.bonus || item.description || '';
        bonusText.color = canAfford ? color + 'cc' : '#777777';
        bonusText.fontSize = 11;
        bonusText.fontFamily = 'monospace';
        bonusText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        bonusText.topInPixels = 40;
        bonusText.height = '40px';
        bonusText.textWrapping = true;
        textContainer.addControl(bonusText);

        // ── Prix (en rouge, en bas-droit) ──
        const priceText = new TextBlock(`price_${item.id}`);
        priceText.text = `💰 ${item.price}`;
        priceText.color = '#ff4444';
        priceText.fontSize = 13;
        priceText.fontFamily = 'monospace';
        priceText.fontStyle = 'bold';
        priceText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        priceText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        priceText.rightInPixels = 12;
        priceText.bottomInPixels = 12;
        card.addControl(priceText);

        // ── Hover effect (si on peut l'acheter) ──
        if (canAfford) {
            card.onPointerEnterObservable.add(() => {
                card.background = '#111126';
                card.thickness = 3;
            });
            card.onPointerOutObservable.add(() => {
                card.background = '#0a0a14';
                card.thickness = 2;
            });

            // ── Click : sélectionner l'item ──
            const selectItem = () => {
                if (this._isClosing) return;
                this._selectedItem = item;
                this._updateDialogue(item, player);
                this._showConfirmButton(item, player, onClose);
            };

            const cardClickObserver = card.onPointerClickObservable.add(selectItem);
            this._listeners.push({ observable: card.onPointerClickObservable, observer: cardClickObserver });
        } else {
            // Afficher "Pas assez d'argent" au survol
            card.onPointerEnterObservable.add(() => {
                this._dialogueText.text = `[Pas assez d'argent : ${item.price - player.money} pièces manquantes]`;
            });
            card.onPointerOutObservable.add(() => {
                if (this._selectedItem === null) {
                    this._dialogueText.text = 'Qu\'est ce qu\'il vous ferait cyber-plaisir ?';
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────
    // GÉRER LA SÉLECTION
    // ─────────────────────────────────────────────────────

    _updateDialogue(item, player) {
        this._dialogueText.text = `Donc vous voulez un ${item.name} ?`;
    }

    _showConfirmButton(item, player, onClose) {
        // Vérifier si bouton existe déjà
        const existing = this._overlay.getChildByName('confirmBtn');
        if (existing) existing.dispose();

        const confirmBtn = Button.CreateSimpleButton('confirmBtn', 'ACHETER');
        confirmBtn.width = '200px';
        confirmBtn.height = '50px';
        confirmBtn.background = '#ff4444';
        confirmBtn.color = '#ffffff';
        confirmBtn.thickness = 2;
        confirmBtn.cornerRadius = 4;
        confirmBtn.fontSize = 14;
        confirmBtn.fontFamily = 'monospace';
        confirmBtn.fontStyle = 'bold';
        confirmBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        confirmBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        confirmBtn.bottomInPixels = 40;
        this._overlay.addControl(confirmBtn);

        confirmBtn.onPointerClickObservable.add(() => {
            if (this._isClosing) return;
            this._isClosing = true;

            // Déduire l'argent et ajouter l'item
            if (player.money >= item.price) {
                player.money -= item.price;
                player.inventory.addItem(item.id);
                this.hide(() => onClose());
            }
        });

        // Animation d'apparition du bouton
        confirmBtn.alpha = 0;
        const startTime = performance.now();
        const fadeIn = this.scene.onBeforeRenderObservable.add(() => {
            const t = Math.min(1, (performance.now() - startTime) / 200);
            confirmBtn.alpha = t;
            if (t >= 1) this.scene.onBeforeRenderObservable.remove(fadeIn);
        });
    }

    // ─────────────────────────────────────────────────────
    // MASQUER L'ÉCRAN
    // ─────────────────────────────────────────────────────

    hide(callback) {
        if (!this._overlay) return;

        this._visible = false;
        const startTime = performance.now();
        const fadeOut = this.scene.onBeforeRenderObservable.add(() => {
            const t = Math.min(1, (performance.now() - startTime) / 200);
            this._overlay.alpha = 1 - t;
            if (t >= 1) {
                this._clearUI();
                this.scene.onBeforeRenderObservable.remove(fadeOut);
                if (callback) callback();
            }
        });
    }

    _clearUI() {
        if (this._overlay) {
            this._overlay.dispose();
            this._overlay = null;
        }
        this._listeners.forEach(l => {
            if (l.cleanup) l.cleanup();
            else if (l.observable && l.observer) {
                l.observable.remove(l.observer);
            }
        });
        this._listeners = [];
    }

    // ─────────────────────────────────────────────────────
    // UTILITAIRES
    // ─────────────────────────────────────────────────────

    static _rarityColor(rarity) {
        const colors = { 1: '#ffffff', 2: '#00ff88', 3: '#00ccff', 4: '#ffcc00' };
        return colors[rarity] || '#ffffff';
    }

    static _addNeonCardContours(scene, card, color, listeners) {
        // Coin TL
        const cornerTL = new Rectangle('cornerTL');
        cornerTL.width = '12px';
        cornerTL.height = '12px';
        cornerTL.left = '-2px';
        cornerTL.top = '-2px';
        cornerTL.thickness = 2;
        cornerTL.color = color;
        cornerTL.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        cornerTL.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        cornerTL.isHitTestVisible = false;
        card.addControl(cornerTL);

        // Coin BR
        const cornerBR = new Rectangle('cornerBR');
        cornerBR.width = '12px';
        cornerBR.height = '12px';
        cornerBR.right = '-2px';
        cornerBR.bottom = '-2px';
        cornerBR.thickness = 2;
        cornerBR.color = color;
        cornerBR.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        cornerBR.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        cornerBR.isHitTestVisible = false;
        card.addControl(cornerBR);
    }
}
