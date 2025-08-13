// 主人公スライムの初期設定
let isGameStarted = false;
let player;
let isGameOver = false;
let isGameClear = false;
let clearSoundPlayed = false;

// 敵スライムの配列
let slimes = [];

// スライム生成の間隔を管理する変数
let slimeSpawnInterval = 180;
let lastSlimeSpawnFrame = 0;

// タイマーとランキング用の変数
let startTime;
let elapsedTime;
let clearRankings = [];
let survivalRankings = [];

// 効果音用の変数
let eatSound;
let gameoverSound;
let clearSound;
let startSound;
let clickSound;
let bgm;

// 入力フィールド
let nameInput;
let inputArea;

// p5.js のプリロード関数 (プログラムが始まる前に実行される)
function preload() {
  soundFormats('mp3');
  eatSound = loadSound('eat.mp3');
  gameoverSound = loadSound('gameover.mp3');
  clearSound = loadSound('clear.mp3');
  startSound = loadSound('start.mp3');
  clickSound = loadSound('click.mp3');
  bgm = loadSound('bgm.mp3');
}

// p5.js のセットアップ関数
function setup() {
  let canvas = createCanvas(800, 600);
  canvas.parent('game-container');
  bgm.setLoop(true);
  loadRankings();

  // ★★★ HTMLの要素を取得して、イベントを設定 ★★★
  nameInput = select('#name-input');
  inputArea = select('#input-area');

  nameInput.changed(() => {
    if (nameInput.value()) {
      let record = { name: nameInput.value(), time: elapsedTime };
      if (isGameClear) {
        clearRankings.push(record);
        clearRankings.sort((a, b) => a.time - b.time);
        clearRankings = clearRankings.slice(0, 5);
        storeItem('clearRankings', clearRankings);
      } else if (isGameOver) {
        survivalRankings.push(record);
        survivalRankings.sort((a, b) => b.time - a.time);
        survivalRankings = survivalRankings.slice(0, 5);
        storeItem('survivalRankings', survivalRankings);
      }
      inputArea.style('display', 'none');
      updateRankingDisplay();
      drawButton(); // ボタンを描画
    }
  });

  resetGame();
  updateRankingDisplay();
}

// マウスがクリックされたときに実行される関数
function mousePressed() {
  if (!isGameStarted) {
    isGameStarted = true;
    userStartAudio();
    startSound.play();
    bgm.play();
    startTime = millis();
    inputArea.style('display', 'none');
    return;
  }

  if (isGameOver || isGameClear) {
    let buttonX = width / 2 - 100;
    let buttonY = height / 2 + 50;
    let buttonWidth = 200;
    let buttonHeight = 50;
    
    if (mouseX > buttonX && mouseX < buttonX + buttonWidth &&
        mouseY > buttonY && mouseY < buttonY + buttonHeight) {
      resetGame();
      clickSound.play();
    }
  }
}

// p5.js の描画ループ関数 (毎フレーム実行される)
function draw() {
  background(220);

  if (!isGameStarted) {
    textSize(32);
    textAlign(CENTER, CENTER);
    text("クリックして開始", width / 2, height / 2);
    return;
  }
  
  if (!isGameOver && !isGameClear) {
    elapsedTime = (millis() - startTime) / 1000;
    fill(0);
    textSize(24);
    textAlign(LEFT, TOP);
    text("Time: " + nf(elapsedTime, 0, 3) + "s", 10, 10);
    
    player.update();
    player.show();

    if (player.r > width / 2 || player.r > height / 2) {
      isGameClear = true;
    }

    if (frameCount - lastSlimeSpawnFrame > slimeSpawnInterval) {
      let newSlime = createNewSlime();
      slimes.push(newSlime);
      lastSlimeSpawnFrame = frameCount;
    }

    for (let i = slimes.length - 1; i >= 0; i--) {
      slimes[i].update();
      slimes[i].show();

      if (player.eats(slimes[i])) {
        if (player.r > slimes[i].r) {
          player.r += slimes[i].r * 0.05;
          slimes.splice(i, 1);
          let newSlime = createNewSlime();
          slimes.push(newSlime);
          eatSound.play();
        } else {
          isGameOver = true;
          gameoverSound.play();
        }
      }
    }
  } else if (isGameClear) {
    if (bgm.isPlaying()) {
      bgm.stop();
    }
    
    player.updateColor();
    player.updateSize();
    player.show();
    
    for (let i = slimes.length - 1; i >= 0; i--) {
      slimes[i].show();
      slimes[i].alpha -= 2;
      if (slimes[i].alpha <= 0) {
        slimes.splice(i, 1);
      }
    }
    
    if (player.r < width * 0.8) {
      if (frameCount % 12 == 0) {
        eatSound.play();
      }
    } else {
      if (eatSound.isPlaying()) {
        eatSound.stop();
      }
    }

    if (player.r > width * 0.8) {
      if (!clearSoundPlayed) {
        clearSound.play();
        clearSoundPlayed = true;
      }
      fill(0);
      textSize(32);
      textAlign(CENTER, CENTER);
      text("あなたは世界で一番大きなスライムになりました", width / 2, height / 2 - 100);
      text("クリア時間: " + nf(elapsedTime, 0, 3) + "s", width / 2, height / 2 - 50);
      
      if (nameInput.style('display') === 'none') {
        drawButton();
      }
      
      if (!nameInput.value()) {
        inputArea.style('display', 'block');
      }
    }
  } else if (isGameOver) {
    if (bgm.isPlaying()) {
      bgm.stop();
    }
    
    if (!nameInput.value()) {
      inputArea.style('display', 'block');
    }

    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("生きた時間: " + nf(elapsedTime, 0, 3) + "s", width / 2, height / 2 - 100);
    textSize(64);
    text("ゲームオーバー", width / 2, height / 2);
    
    if (nameInput.style('display') === 'none') {
      drawButton();
    }
  }
}

function loadRankings() {
  let savedClearRankings = getItem('clearRankings');
  if (savedClearRankings) {
    clearRankings = savedClearRankings;
  }
  let savedSurvivalRankings = getItem('survivalRankings');
  if (savedSurvivalRankings) {
    survivalRankings = savedSurvivalRankings;
  }
}

function saveRanking(time, name, isClear) {
  let record = { name: name, time: time };
  
  if (isClear) {
    clearRankings.push(record);
    clearRankings.sort((a, b) => a.time - b.time);
    clearRankings = clearRankings.slice(0, 5);
    storeItem('clearRankings', clearRankings);
  } else {
    survivalRankings.push(record);
    survivalRankings.sort((a, b) => b.time - a.time);
    survivalRankings = survivalRankings.slice(0, 5);
    storeItem('survivalRankings', survivalRankings);
  }
}

function updateRankingDisplay() {
  let clearRankingDiv = select('#clear-ranking');
  let survivalRankingDiv = select('#survival-ranking');
  
  clearRankingDiv.html("<h3>クリアランキング</h3>");
  if (clearRankings.length > 0) {
    for (let i = 0; i < clearRankings.length; i++) {
      clearRankingDiv.html(
        clearRankingDiv.html() + 
        (i + 1) + ". " + clearRankings[i].name + ": " + nf(clearRankings[i].time, 0, 3) + "s<br>"
      );
    }
  } else {
    clearRankingDiv.html(clearRankingDiv.html() + "まだランキングがありません");
  }
  
  survivalRankingDiv.html("<h3>生存ランキング</h3>");
  if (survivalRankings.length > 0) {
    for (let i = 0; i < survivalRankings.length; i++) {
      survivalRankingDiv.html(
        survivalRankingDiv.html() + 
        (i + 1) + ". " + survivalRankings[i].name + ": " + nf(survivalRankings[i].time, 0, 3) + "s<br>"
      );
    }
  } else {
    survivalRankingDiv.html(survivalRankingDiv.html() + "まだランキングがありません");
  }
}

function drawButton() {
    let buttonX = width / 2 - 100;
    let buttonY = height / 2 + 50;
    let buttonWidth = 200;
    let buttonHeight = 50;

    fill(255);
    rect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    fill(0);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("もう1回あそぶ", width / 2, height / 2 + 75);
}

function resetGame() {
  isGameStarted = false;
  isGameOver = false;
  isGameClear = false;
  clearSoundPlayed = false;
  
  player = new Slime(width / 2, height / 2, 20, true);
  
  slimes = [];
  for (let i = 0; i < 10; i++) {
    let x = random(width);
    let y = random(height);
    let r;
    let isSmaller = random() > 0.5;
    if (isSmaller) {
        r = random(5, player.r * 0.9);
    } else {
        r = random(player.r * 1.1, 40);
    }
    slimes.push(new Slime(x, y, r, false));
  }
}

class Slime {
  constructor(x, y, r, isPlayer) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.isPlayer = isPlayer;
    this.color = color(0, 0, 255, 150);
    this.alpha = 150;
    
    if (!this.isPlayer) {
      this.vx = random(-1, 1);
      this.vy = random(-1, 1);
    }
  }

  update() {
    if (this.isPlayer) {
      this.x = mouseX;
      this.y = mouseY;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < this.r || this.x > width - this.r) {
        this.vx *= -1;
      }
      if (this.y < this.r || this.y > height - this.r) {
        this.vy *= -1;
      }
    }
  }

  updateColor() {
    if (this.isPlayer) {
      let r = red(this.color);
      let g = green(this.color);
      let b = blue(this.color);
      let a = alpha(this.color);
      
      r += 0.5;
      g += 0.5;
      b += 0.5;

      this.color = color(r, g, b, a);
    }
  }
  
  updateSize() {
    if (this.isPlayer) {
      this.r += 2.0;
    }
  }

  show() {
    noStroke();
    if (this.isPlayer) {
      fill(this.color);
    } else {
      fill(255, 0, 0, this.alpha);
    }
    circle(this.x, this.y, this.r * 2);
  }

  eats(other) {
    let d = dist(this.x, this.y, other.x, other.y);
    let sumOfRadii = this.r + other.r;
    return d < sumOfRadii;
  }
}

function createNewSlime() {
  let x, y, r;
  let isSmaller = random() > 0.5;
  let newSlime;

  let safeSpawn = false;
  while (!safeSpawn) {
    x = random(width);
    y = random(height);

    if (isSmaller) {
      r = random(5, player.r * 0.9);
    } else {
      r = random(player.r * 1.1, 40);
    }

    if (isSmaller && player.r < 10) {
      r = random(5, player.r - 2);
    }

    newSlime = new Slime(x, y, r, false);

    if (!player.eats(newSlime)) {
      safeSpawn = true;
    }
  }
  return newSlime;
}