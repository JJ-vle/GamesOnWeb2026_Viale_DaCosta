/**
 * PerformanceMonitor: Affiche les métriques de performance en temps réel
 * - FPS (frames per second)
 * - GPU time (rendu)
 * - Nombre d'ennemis actifs
 * - Stats du pool d'ennemis
 * - Distance culling stats
 */
export class PerformanceMonitor {
  constructor(scene, spawnerSystem) {
    this.scene = scene;
    this.spawnerSystem = spawnerSystem;
    
    // Métriques
    this._frameCount = 0;
    this._lastTime = performance.now();
    this._fps = 60;
    this._gpuTime = 0;
    
    // UI DOM
    this._container = null;
    this._isVisible = true;
    
    // Stats de culling
    this._culledEnemies = 0;
    this._activeEnemies = 0;
    
    this._init();
  }

  /**
   * Crée l'interface visuelle
   * @private
   */
  _init() {
    // Si pas de document (SSR), skip
    if (typeof document === 'undefined') return;

    // Supprime l'ancien s'il existe pour éviter les doublons
    const oldContainer = document.getElementById('performance-monitor');
    if (oldContainer) {
      oldContainer.remove();
    }

    const container = document.createElement('div');
    container.id = 'performance-monitor';
    
    // Styling
    Object.assign(container.style, {
      position: 'fixed',
      top: '10px',
      left: '10px',
      padding: '12px 16px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1.5',
      textShadow: '0 0 4px rgba(0, 255, 0, 0.5)',
      zIndex: 10000,
      pointerEvents: 'none',
      borderRadius: '4px',
      border: '1px solid #00ff00',
      minWidth: '200px'
    });

    container.innerHTML = `
      <div><strong>╔═ PERFORMANCE ═╗</strong></div>
      <div id="perf-fps">FPS: 60</div>
      <div id="perf-gpu">GPU: 0ms</div>
      <div id="perf-enemies">Enemies: 0 (Culled: 0)</div>
      <div id="perf-pool">Pool: 0 types</div>
      <div><small style="color: #00aa00;">Press [E] to toggle</small></div>
    `;

    document.body.appendChild(container);
    this._container = container;

    // Toggle avec touche D
    this._setupToggleKey();
  }

  /**
   * Configure la touche [E] pour toggle le monitoring
   * @private
   */
  _setupToggleKey() {
    if (!this.scene) return
    
    let eKeyPressed = false;
    this.scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.event && kbInfo.event.key && kbInfo.event.key.toLowerCase() === 'e') {
        if (kbInfo.type === 1 && !eKeyPressed) { // keyDown
          eKeyPressed = true;
          this.toggle();
        } else if (kbInfo.type === 2) { // keyUp
          eKeyPressed = false;
        }
      }
    });
  }

  /**
   * Met à jour les métriques
   * @param {number} activeEnemyCount - Nombre d'ennemis actifs
   * @param {number} culledEnemyCount - Nombre d'ennemis culled
   */
  update(activeEnemyCount, culledEnemyCount) {
    this._frameCount++;
    const now = performance.now();
    const delta = now - this._lastTime;

    // FPS calculé chaque 500ms
    if (delta >= 500) {
      this._fps = Math.round((this._frameCount * 1000) / delta);
      this._frameCount = 0;
      this._lastTime = now;
    }

    // GPU time (approximation via engine)
    if (this.scene && this.scene.getEngine()) {
      const engine = this.scene.getEngine();
      this._gpuTime = Math.round((engine.deltaTime || 1) * 10) / 10; // ms
    }

    this._activeEnemies = activeEnemyCount;
    this._culledEnemies = culledEnemyCount;

    this._updateUI();
  }

  /**
   * Met à jour l'interface visuelle
   * @private
   */
  _updateUI() {
    if (!this._container || !this._isVisible) return;

    // FPS color: vert si >30, jaune si 20-30, rouge si <20
    const fpsColor = this._fps >= 30 ? '#00ff00' : (this._fps >= 20 ? '#ffff00' : '#ff0000');

    this._container.querySelector('#perf-fps').innerHTML = 
      `<span style="color: ${fpsColor};">FPS: ${this._fps}</span>`;
    
    this._container.querySelector('#perf-gpu').innerHTML = 
      `GPU: ${this._gpuTime}ms`;
    
    this._container.querySelector('#perf-enemies').innerHTML = 
      `Enemies: ${this._activeEnemies} (Culled: ${this._culledEnemies})`;

    if (this.spawnerSystem) {
      const poolStats = this.spawnerSystem.getPoolStats();
      const totalPooled = Object.keys(poolStats).length;
      this._container.querySelector('#perf-pool').innerHTML = 
        `Pool: ${totalPooled} types`;
    }
  }

  /**
   * Toggle la visibilité du monitoring
   */
  toggle() {
    if (!this._container) return;
    this._isVisible = !this._isVisible;
    this._container.style.display = this._isVisible ? 'block' : 'none';
  }

  /**
   * Affiche explicitement
   */
  show() {
    this._isVisible = true;
    if (this._container) this._container.style.display = 'block';
  }

  /**
   * Cache explicitement
   */
  hide() {
    this._isVisible = false;
    if (this._container) this._container.style.display = 'none';
  }

  /**
   * Enregistre une performance snapshot dans la console
   */
  logSnapshot() {
    const poolStats = this.spawnerSystem ? this.spawnerSystem.getPoolStats() : {};
    console.log('%c═ Performance Snapshot ═', 'color: #00ff00; font-weight: bold;');
    console.log('FPS:', this._fps);
    console.log('GPU Time:', this._gpuTime, 'ms');
    console.log('Active Enemies:', this._activeEnemies);
    console.log('Culled Enemies:', this._culledEnemies);
    console.log('Pool Stats:', poolStats);
  }
}
