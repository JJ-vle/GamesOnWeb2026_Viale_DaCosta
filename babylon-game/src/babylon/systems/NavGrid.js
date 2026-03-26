import { Vector3, Ray } from '@babylonjs/core';

/**
 * NavGrid: Grille de navigation pour pathfinding A*
 * 
 * Divise la map en cellules et marque les cellules occupées par des obstacles.
 * Les ennemis utilisent A* pour trouver un chemin contournant les obstacles.
 */
export class NavGrid {
    /**
     * @param {number} mapWidth - largeur totale de la map (ex: 130)
     * @param {number} mapHeight - profondeur totale de la map (ex: 110)
     * @param {number} cellSize - taille d'une cellule de la grille (ex: 2)
     */
    constructor(mapWidth, mapHeight, cellSize = 2) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.cellSize = cellSize;

        // Origine = coin bas-gauche en world space
        this.originX = -mapWidth / 2;
        this.originZ = -mapHeight / 2;

        // Dimensions de la grille
        this.cols = Math.ceil(mapWidth / cellSize);
        this.rows = Math.ceil(mapHeight / cellSize);

        // Grille: 0 = libre, 1 = bloqué
        this.grid = new Uint8Array(this.cols * this.rows);

        // Cache de chemins pour éviter de recalculer chaque frame
        this._pathCache = new Map();
        this._pathCacheMaxAge = 30; // frames avant expiration
        this._frameCounter = 0;
    }

    /**
     * Construit la grille à partir des obstacles de la scène.
     * Appeler une seule fois au début ou quand les obstacles changent.
     */
    buildFromScene(scene) {
        // Reset grid
        this.grid.fill(0);

        // Trouver tous les meshes obstacles
        const obstacles = scene.meshes.filter(mesh => {
            if (!mesh.name) return false;
            return mesh.name.includes('obstacle') || mesh.name.includes('wall_');
        });

        // Pour chaque obstacle, marquer les cellules occupées
        for (const obstacle of obstacles) {
            // IMPORTANT: Forcer le calcul de la world matrix pour avoir les bonnes positions
            obstacle.computeWorldMatrix(true);
            
            const bb = obstacle.getBoundingInfo().boundingBox;
            const min = bb.minimumWorld;
            const max = bb.maximumWorld;

            // Marge de sécurité large pour que les chemins passent bien autour
            const margin = 2.5;

            const minCol = Math.max(0, this._worldToCol(min.x - margin));
            const maxCol = Math.min(this.cols - 1, this._worldToCol(max.x + margin));
            const minRow = Math.max(0, this._worldToRow(min.z - margin));
            const maxRow = Math.min(this.rows - 1, this._worldToRow(max.z + margin));

            // console.log(`[NavGrid] Obstacle '${obstacle.name}': world(${min.x.toFixed(1)},${min.z.toFixed(1)})-(${max.x.toFixed(1)},${max.z.toFixed(1)}) -> cells(${minCol},${minRow})-(${maxCol},${maxRow})`);

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    this.grid[r * this.cols + c] = 1;
                }
            }
        }

        // Compter les cellules bloquées
        let blockedCount = 0;
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i] === 1) blockedCount++;
        }
        // console.log(`[NavGrid] Grille construite: ${this.cols}x${this.rows} cells (cellSize=${this.cellSize}), ${obstacles.length} obstacles, ${blockedCount} cellules bloquées`);
    }

    /**
     * Convertit une position world en coordonnées grille
     */
    _worldToCol(x) {
        return Math.floor((x - this.originX) / this.cellSize);
    }

    _worldToRow(z) {
        return Math.floor((z - this.originZ) / this.cellSize);
    }

    /**
     * Convertit des coordonnées grille en position world (centre de cellule)
     */
    _cellToWorld(col, row) {
        return new Vector3(
            this.originX + (col + 0.5) * this.cellSize,
            0,
            this.originZ + (row + 0.5) * this.cellSize
        );
    }

    /**
     * Vérifie si une cellule est libre
     */
    _isWalkable(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        return this.grid[row * this.cols + col] === 0;
    }

    /**
     * A* pathfinding: trouve le chemin optimal entre deux positions world
     * @param {Vector3} startPos - position de départ (world)
     * @param {Vector3} endPos - position d'arrivée (world)
     * @returns {Vector3[]} liste de waypoints en world coordinates, ou [] si pas de chemin
     */
    findPath(startPos, endPos) {
        const startCol = this._worldToCol(startPos.x);
        const startRow = this._worldToRow(startPos.z);
        const endCol = this._worldToCol(endPos.x);
        const endRow = this._worldToRow(endPos.z);

        // Vérifier validité
        if (!this._isInBounds(startCol, startRow) || !this._isInBounds(endCol, endRow)) {
            return [];
        }

        // Si départ ou arrivée bloqué, trouver la cellule libre la plus proche
        const actualStart = this._isWalkable(startCol, startRow) 
            ? { col: startCol, row: startRow }
            : this._findNearestWalkable(startCol, startRow);
        
        const actualEnd = this._isWalkable(endCol, endRow)
            ? { col: endCol, row: endRow }
            : this._findNearestWalkable(endCol, endRow);

        if (!actualStart || !actualEnd) return [];

        // Vérifier cache
        const cacheKey = `${actualStart.col},${actualStart.row}-${actualEnd.col},${actualEnd.row}`;
        const cached = this._pathCache.get(cacheKey);
        if (cached && (this._frameCounter - cached.frame) < this._pathCacheMaxAge) {
            return cached.path;
        }

        // A* algorithm
        const path = this._astar(actualStart.col, actualStart.row, actualEnd.col, actualEnd.row);

        // Convertir en world coordinates
        const worldPath = path.map(node => this._cellToWorld(node.col, node.row));

        // NE PAS lisser le chemin — garder tous les waypoints pour éviter de couper les coins
        // Le lissage supprimait des waypoints critiques et causait la traversée des murs

        // Sauvegarder en cache
        this._pathCache.set(cacheKey, { path: worldPath, frame: this._frameCounter });

        // Nettoyer le cache si trop gros
        if (this._pathCache.size > 200) {
            const oldKeys = [];
            for (const [key, val] of this._pathCache) {
                if (this._frameCounter - val.frame > this._pathCacheMaxAge * 2) {
                    oldKeys.push(key);
                }
            }
            oldKeys.forEach(k => this._pathCache.delete(k));
        }

        return worldPath;
    }

    _isInBounds(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    }

    _findNearestWalkable(col, row) {
        // Recherche en spirale
        for (let radius = 1; radius < 10; radius++) {
            for (let dc = -radius; dc <= radius; dc++) {
                for (let dr = -radius; dr <= radius; dr++) {
                    if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
                    const nc = col + dc;
                    const nr = row + dr;
                    if (this._isWalkable(nc, nr)) {
                        return { col: nc, row: nr };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Implémentation A* avec heuristique octile (diagonale autorisée)
     */
    _astar(startCol, startRow, endCol, endRow) {
        // Si même cellule ou adjacentes, pas besoin de pathfinding
        if (startCol === endCol && startRow === endRow) {
            return [{ col: endCol, row: endRow }];
        }

        const STRAIGHT_COST = 10;
        const DIAG_COST = 14;

        // Utiliser un index unique pour chaque cellule
        const toIndex = (c, r) => r * this.cols + c;

        const openSet = new Map(); // index -> node
        const closedSet = new Set(); // index

        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();

        const startIdx = toIndex(startCol, startRow);
        const endIdx = toIndex(endCol, endRow);

        gScore.set(startIdx, 0);
        fScore.set(startIdx, this._heuristic(startCol, startRow, endCol, endRow));
        openSet.set(startIdx, { col: startCol, row: startRow });

        // Directions: 8 directions (incluant diagonales)
        const directions = [
            { dc: 0, dr: 1, cost: STRAIGHT_COST },   // N
            { dc: 1, dr: 0, cost: STRAIGHT_COST },   // E
            { dc: 0, dr: -1, cost: STRAIGHT_COST },  // S
            { dc: -1, dr: 0, cost: STRAIGHT_COST },  // W
            { dc: 1, dr: 1, cost: DIAG_COST },       // NE
            { dc: 1, dr: -1, cost: DIAG_COST },      // SE
            { dc: -1, dr: 1, cost: DIAG_COST },      // NW
            { dc: -1, dr: -1, cost: DIAG_COST },     // SW
        ];

        let iterations = 0;
        const MAX_ITERATIONS = 2000; // Anti-boucle infinie

        while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
            iterations++;

            // Trouver le noeud avec le plus petit fScore
            let currentIdx = null;
            let currentNode = null;
            let bestF = Infinity;

            for (const [idx, node] of openSet) {
                const f = fScore.get(idx) || Infinity;
                if (f < bestF) {
                    bestF = f;
                    currentIdx = idx;
                    currentNode = node;
                }
            }

            // Arrivé?
            if (currentIdx === endIdx) {
                return this._reconstructPath(cameFrom, currentIdx, endCol, endRow);
            }

            openSet.delete(currentIdx);
            closedSet.add(currentIdx);

            // Explorer les voisins
            for (const dir of directions) {
                const nc = currentNode.col + dir.dc;
                const nr = currentNode.row + dir.dr;
                const nIdx = toIndex(nc, nr);

                if (!this._isWalkable(nc, nr) || closedSet.has(nIdx)) continue;

                // Pour les diagonales, vérifier que les deux cellules adjacentes sont libres
                // (éviter de couper les coins)
                if (dir.dc !== 0 && dir.dr !== 0) {
                    if (!this._isWalkable(currentNode.col + dir.dc, currentNode.row) ||
                        !this._isWalkable(currentNode.col, currentNode.row + dir.dr)) {
                        continue;
                    }
                }

                const tentativeG = (gScore.get(currentIdx) || 0) + dir.cost;

                if (tentativeG < (gScore.get(nIdx) || Infinity)) {
                    cameFrom.set(nIdx, currentIdx);
                    gScore.set(nIdx, tentativeG);
                    fScore.set(nIdx, tentativeG + this._heuristic(nc, nr, endCol, endRow));

                    if (!openSet.has(nIdx)) {
                        openSet.set(nIdx, { col: nc, row: nr });
                    }
                }
            }
        }

        // Pas de chemin trouvé
        return [];
    }

    /**
     * Heuristique octile (diagonale)
     */
    _heuristic(c1, r1, c2, r2) {
        const dx = Math.abs(c1 - c2);
        const dy = Math.abs(r1 - r2);
        return 10 * (dx + dy) + (14 - 2 * 10) * Math.min(dx, dy);
    }

    /**
     * Reconstitue le chemin à partir de la map cameFrom
     */
    _reconstructPath(cameFrom, currentIdx, endCol, endRow) {
        const path = [];
        let idx = currentIdx;

        while (idx !== undefined) {
            const row = Math.floor(idx / this.cols);
            const col = idx % this.cols;
            path.unshift({ col, row });
            idx = cameFrom.get(idx);
        }

        return path;
    }

    /**
     * Simplifie le chemin en supprimant les points intermédiaires alignés
     */
    _smoothPath(worldPath) {
        if (worldPath.length <= 2) return worldPath;

        const smoothed = [worldPath[0]];

        for (let i = 1; i < worldPath.length - 1; i++) {
            const prev = smoothed[smoothed.length - 1];
            const next = worldPath[i + 1];

            // Vérifier si on peut aller directement de prev à next
            // en vérifiant les cellules intermédiaires
            if (!this._isDirectPathClear(prev, next)) {
                smoothed.push(worldPath[i]);
            }
        }

        smoothed.push(worldPath[worldPath.length - 1]);
        return smoothed;
    }

    /**
     * Vérifie si le chemin direct entre deux points world est libre
     * (marche de Bresenham sur la grille)
     */
    _isDirectPathClear(from, to) {
        const c1 = this._worldToCol(from.x);
        const r1 = this._worldToRow(from.z);
        const c2 = this._worldToCol(to.x);
        const r2 = this._worldToRow(to.z);

        // Bresenham's line algorithm
        let dc = Math.abs(c2 - c1);
        let dr = Math.abs(r2 - r1);
        let sc = c1 < c2 ? 1 : -1;
        let sr = r1 < r2 ? 1 : -1;
        let err = dc - dr;

        let cc = c1;
        let cr = r1;

        while (true) {
            if (!this._isWalkable(cc, cr)) return false;
            if (cc === c2 && cr === r2) break;

            const e2 = 2 * err;
            if (e2 > -dr) {
                err -= dr;
                cc += sc;
            }
            if (e2 < dc) {
                err += dc;
                cr += sr;
            }
        }

        return true;
    }

    /**
     * Incrémente le compteur de frame (pour le cache)
     */
    tick() {
        this._frameCounter++;
    }
}
