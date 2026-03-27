/**
 * LoadingScreen: Affiche un écran de chargement pendant le loading des assets
 * - Barre de progression
 * - Loading spinner
 * - Disparaît quand tout est chargé
 */
export class LoadingScreen {
  constructor() {
    this._container = null;
    this._progressBar = null;
    this._progressText = null;
    this._progress = 0;
    this._isVisible = true;
    this._init();
  }

  /**
   * Crée l'interface visuelle du loading
   * @private
   */
  _init() {
    if (typeof document === 'undefined') return;

    // Container principal
    const container = document.createElement('div');
    container.id = 'loading-screen';
    
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(10, 10, 20, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999,
      fontFamily: 'monospace',
      color: '#00ff00',
      textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
    });

    // Title
    const title = document.createElement('div');
    title.textContent = 'INITIALIZING...';
    Object.assign(title.style, {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '60px',
      letterSpacing: '2px',
      animation: 'glow 1.5s ease-in-out infinite'
    });

    // Loading spinner
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    Object.assign(spinner.style, {
      width: '60px',
      height: '60px',
      border: '4px solid rgba(0, 255, 0, 0.3)',
      borderTop: '4px solid #00ff00',
      borderRadius: '50%',
      marginBottom: '40px',
      animation: 'spin 1s linear infinite'
    });

    // Progress bar container
    const progressContainer = document.createElement('div');
    Object.assign(progressContainer.style, {
      width: '300px',
      height: '20px',
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      border: '2px solid #00ff00',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '20px'
    });

    // Progress bar fill
    this._progressBar = document.createElement('div');
    Object.assign(this._progressBar.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#00ff00',
      transition: 'width 0.3s ease',
      boxShadow: '0 0 10px rgba(0, 255, 0, 0.8)'
    });
    progressContainer.appendChild(this._progressBar);

    // Progress text
    this._progressText = document.createElement('div');
    this._progressText.textContent = 'Loading assets... 0%';
    Object.assign(this._progressText.style, {
      fontSize: '14px',
      marginTop: '20px',
      minWidth: '200px',
      textAlign: 'center'
    });

    // Assemble
    container.appendChild(title);
    container.appendChild(spinner);
    container.appendChild(progressContainer);
    container.appendChild(this._progressText);

    document.body.appendChild(container);
    this._container = container;

    // Add animations to stylesheet
    this._addAnimations();
  }

  /**
   * Ajoute les animations CSS
   * @private
   */
  _addAnimations() {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes glow {
        0%, 100% { text-shadow: 0 0 10px rgba(0, 255, 0, 0.5); }
        50% { text-shadow: 0 0 20px rgba(0, 255, 0, 0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Met à jour la progression
   * @param {number} percent - Pourcentage (0-100)
   * @param {string} message - Message optionnel
   */
  setProgress(percent, message = null) {
    if (!this._progressBar) return;
    
    this._progress = Math.min(100, Math.max(0, percent));
    this._progressBar.style.width = this._progress + '%';
    
    if (this._progressText) {
      this._progressText.textContent = message || `Loading assets... ${Math.round(this._progress)}%`;
    }
  }

  /**
   * Cache l'écran de loading avec fade-out
   * @param {number} duration - Durée du fade en ms
   */
  hide(duration = 500) {
    if (!this._container) return;
    
    this._isVisible = false;
    this._container.style.transition = `opacity ${duration}ms ease-out`;
    this._container.style.opacity = '0';
    
    setTimeout(() => {
      if (this._container && this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
    }, duration);
  }

  /**
   * Affiche l'écran (inverse de hide)
   */
  show() {
    if (!this._container) return;
    
    this._isVisible = true;
    this._container.style.opacity = '1';
    this._container.style.display = 'flex';
  }

  /**
   * Retourne l'état visible
   */
  isVisible() {
    return this._isVisible;
  }
}
