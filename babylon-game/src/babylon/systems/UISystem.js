import { AdvancedDynamicTexture, TextBlock, Control, Rectangle } from "@babylonjs/gui";

export class UISystem {
  constructor(scene) {
    this.scene = scene;
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    this._createScore();
    this._createRound();
    this._createLifeBar();
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

    this.roundTimer = new TextBlock();
    this.roundTimer.color = "white";
    this.roundTimer.fontSize = 22;
    this.roundTimer.topInPixels = 10;
    this.roundTimer.left = "45%";
    this.ui.addControl(this.roundTimer);
  }

  _createLifeBar() {
    const bg = new Rectangle();
    bg.width = "300px";
    bg.height = "40px";
    bg.background = "black";
    bg.thickness = 4;
    bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bg.leftInPixels = 30;
    bg.bottomInPixels = 60;

    this.ui.addControl(bg);

    this.lifeFill = new Rectangle();
    this.lifeFill.width = "100%";
    this.lifeFill.height = "100%";
    this.lifeFill.background = "green";
    this.lifeFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    bg.addControl(this.lifeFill);
  }

  updateScore(score) {
    this.scoreText.text = `Score: ${score}`;
  }

  updateLife(current, max) {
    const percent = current / max;
    this.lifeFill.width = (percent * 100) + "%";

    if (percent > 0.5) this.lifeFill.background = "green";
    else if (percent > 0.2) this.lifeFill.background = "orange";
    else this.lifeFill.background = "red";
  }

  updateRound(index, total, state, remaining) {
    this.roundText.text = `Round: ${index}/${total}`;

    if (state === "waiting") {
      this.roundTimer.text = `Starts in ${Math.ceil(remaining)}s`;
    } else if (state === "running") {
      const secs = Math.ceil(remaining);
      const mm = Math.floor(secs / 60).toString().padStart(2, '0');
      const ss = (secs % 60).toString().padStart(2, '0');
      this.roundTimer.text = `${mm}:${ss}`;
    } else if (state === "finished") {
      this.roundTimer.text = "Finished";
    }
  }
}
