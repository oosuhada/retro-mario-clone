var requestAnimFrame = (function(){
  return window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(callback){
      window.setTimeout(callback, 1000 / 60);
    };
})();

//create the canvas
var canvas = document.createElement("canvas");
var ctx = canvas.getContext('2d');
var updateables = [];
var fireballs = [];
var player = new Mario.Player([0,0]);
var gameMode = 'start';
var lives = 3;
var score = 0;
var worldLabel = '1-1';
var timeRemaining = 400;
var lastTimerSecond = 0;
var pendingGameOver = false;
var viewportOffsetX = 0;
var viewportOffsetY = 0;
var renderScale = 1;

document.body.appendChild(canvas);

//viewport
var vX = 0,
    vY = 0,
    vWidth = 256,
    vHeight = 240;

// Keep the original 240px-tall logical game world, but expand the horizontal
// viewport to match the browser aspect ratio. This fills modern screens without
// stretching the pixel art or changing the game's physics coordinates.
function resizeCanvas() {
  var viewportWidth = Math.max(320, window.innerWidth || 320);
  var viewportHeight = Math.max(240, window.innerHeight || 240);
  var isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  var isPortraitTouch = isTouchDevice && viewportHeight > viewportWidth;
  var cssWidth = isPortraitTouch ? viewportHeight : viewportWidth;
  var cssHeight = isPortraitTouch ? viewportWidth : viewportHeight;
  var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderScale = cssHeight / 240;

  canvas.width = Math.round(cssWidth * pixelRatio);
  canvas.height = Math.round(cssHeight * pixelRatio);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.style.position = 'fixed';

  if (isPortraitTouch) {
    canvas.style.left = ((viewportWidth - cssWidth) / 2) + 'px';
    canvas.style.top = ((viewportHeight - cssHeight) / 2) + 'px';
    canvas.style.transform = 'rotate(90deg)';
    canvas.style.transformOrigin = 'center center';
  } else {
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.style.transform = 'none';
    canvas.style.transformOrigin = 'center center';
  }

  vWidth = cssWidth / renderScale;
  vHeight = 240;

  viewportOffsetX = 0;
  viewportOffsetY = 0;

  ctx.setTransform(
    renderScale * pixelRatio,
    0,
    0,
    renderScale * pixelRatio,
    0,
    0
  );
  ctx.imageSmoothingEnabled = false;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

//load our images
resources.load([
  'sprites/player.png',
  'sprites/enemy.png',
  'sprites/tiles.png',
  'sprites/playerl.png',
  'sprites/items.png',
  'sprites/enemyr.png',
]);

resources.onReady(init);
var level;
var sounds;
var music;

//initialize
var lastTime;
function init() {
  music = {
    overworld: new Audio('sounds/aboveground_bgm.ogg'),
    underground: new Audio('sounds/underground_bgm.ogg'),
    clear: new Audio('sounds/stage_clear.wav'),
    death: new Audio('sounds/mariodie.wav')
  };
  sounds = {
    smallJump: new Audio('sounds/jump-small.wav'),
    bigJump: new Audio('sounds/jump-super.wav'),
    breakBlock: new Audio('sounds/breakblock.wav'),
    bump: new Audio('sounds/bump.wav'),
    coin: new Audio('sounds/coin.wav'),
    fireball: new Audio('sounds/fireball.wav'),
    flagpole: new Audio('sounds/flagpole.wav'),
    kick: new Audio('sounds/kick.wav'),
    pipe: new Audio('sounds/pipe.wav'),
    itemAppear: new Audio('sounds/itemAppear.wav'),
    powerup: new Audio('sounds/powerup.wav'),
    stomp: new Audio('sounds/stomp.wav')
  };
  Mario.oneone();
  gameMode = 'start';
  lives = 3;
  score = 0;
  timeRemaining = 400;
  lastTimerSecond = 0;
  pendingGameOver = false;
  music.overworld.pause();
  music.overworld.currentTime = 0;
  lastTime = Date.now();
  main();
}

var gameTime = 0;

//set up the game loop
function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000.0;

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  if (gameMode !== 'playing') {
    return;
  }

  gameTime += dt;
  lastTimerSecond += dt;
  if (lastTimerSecond >= 1) {
    var elapsedSeconds = Math.floor(lastTimerSecond);
    lastTimerSecond -= elapsedSeconds;
    timeRemaining = Math.max(0, timeRemaining - elapsedSeconds);
    if (timeRemaining <= 0 && !player.dying) {
      player.die();
      return;
    }
  }

  handleInput(dt);
  updateEntities(dt, gameTime);

  checkCollisions();
}

function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return; //don't accept input

  if (input.isDown('RUN')){
    player.run();
  } else {
    player.noRun();
  }
  if (input.isDown('JUMP')) {
    player.jump();
  } else {
    //we need this to handle the timing for how long you hold it
    player.noJump();
  }

  if (input.isDown('DOWN')) {
    player.crouch();
  } else {
    player.noCrouch();
  }

  if (input.isDown('LEFT')) { // 'd' or left arrow
    player.moveLeft();
  }
  else if (input.isDown('RIGHT')) { // 'k' or right arrow
    player.moveRight();
  } else {
    player.noWalk();
  }
}

//update all the moving stuff
function updateEntities(dt, gameTime) {
  player.update(dt, vX);
  updateables.forEach (function(ent) {
    ent.update(dt, gameTime);
  });

  //This should stop the jump when he switches sides on the flag.
  var cameraLead = vWidth * 0.32;
  var exitLead = vWidth * 0.375;
  if (player.exiting) {
    if (player.pos[0] > vX + exitLead)
      vX = player.pos[0] - exitLead
  }else if (level.scrolling && player.pos[0] > vX + cameraLead) {
    vX = player.pos[0] - cameraLead;
  }

  if (player.powering.length !== 0 || player.dying) { return; }
  level.items.forEach (function(ent) {
    ent.update(dt);
  });

  level.enemies.forEach (function(ent) {
    ent.update(dt, vX);
  });

  fireballs.forEach(function(fireball) {
    fireball.update(dt);
  });
  level.pipes.forEach (function(pipe) {
    pipe.update(dt);
  });
}

//scan for collisions
function checkCollisions() {
  if (player.powering.length !== 0 || player.dying) { return; }
  player.checkCollisions();

  //Apparently for each will just skip indices where things were deleted.
  level.items.forEach(function(item) {
    item.checkCollisions();
  });
  level.enemies.forEach (function(ent) {
    ent.checkCollisions();
  });
  fireballs.forEach(function(fireball){
    fireball.checkCollisions();
  });
  level.pipes.forEach (function(pipe) {
    pipe.checkCollisions();
  });
}

//draw the game!
function render() {
  updateables = [];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, vWidth, vHeight);

  var visibleColumns = Math.ceil(vWidth / 16) + 2;

  //scenery gets drawn first to get layering right.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + visibleColumns; j++){
      if (level.scenery[i][j]) {
        renderEntity(level.scenery[i][j]);
      }
    }
  }

  //then items
  level.items.forEach (function (item) {
    renderEntity(item);
  });

  level.enemies.forEach (function(enemy) {
    renderEntity(enemy);
  });



  fireballs.forEach(function(fireball) {
    renderEntity(fireball);
  })

  //then we draw every static object.
  for(var i = 0; i < 15; i++) {
    for (var j = Math.floor(vX / 16) - 1; j < Math.floor(vX / 16) + visibleColumns; j++){
      if (level.statics[i][j]) {
        renderEntity(level.statics[i][j]);
      }
      if (level.blocks[i][j]) {
        renderEntity(level.blocks[i][j]);
        updateables.push(level.blocks[i][j]);
      }
    }
  }

  //then the player
  if (player.invincibility % 2 === 0) {
    renderEntity(player);
  }

  //Mario goes INTO pipes, so naturally they go after.
  level.pipes.forEach (function(pipe) {
    renderEntity(pipe);
  });

  renderHud();
  renderControls();

  if (gameMode === 'start') {
    renderStartScreen();
  } else if (gameMode === 'gameover') {
    renderGameOverScreen();
  } else if (gameMode === 'clear') {
    renderClearScreen();
  }
}

function drawPixelText(text, x, y, align) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = align || 'left';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function renderHud() {
  if (gameMode === 'start') return;

  var hudLeft = Math.max(18, (vWidth - 256) / 2 + 18);
  var hudRight = hudLeft + 198;
  drawPixelText('MARIO', hudLeft, 8);
  drawPixelText(String(score).padStart(6, '0'), hudLeft, 17);
  drawPixelText('x' + String(player.coins || 0).padStart(2, '0'), hudLeft + 76, 17);
  drawPixelText('WORLD', hudLeft + 136, 8);
  drawPixelText(worldLabel, hudLeft + 148, 17);
  drawPixelText('TIME', hudRight, 8);
  drawPixelText(String(timeRemaining).padStart(3, '0'), hudRight + 4, 17);
}

function renderStartScreen() {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, vWidth, 240);
  var centerX = vWidth / 2;
  drawPixelText('SUPER', centerX, 48, 'center');
  drawPixelText('MARIO BROS.', centerX, 62, 'center');
  drawPixelText('WORLD  ' + worldLabel, centerX, 108, 'center');
  drawPixelText('x  ' + lives, centerX, 126, 'center');
  drawPixelText('PRESS X OR ENTER', centerX, 170, 'center');
  ctx.restore();
}

function renderGameOverScreen() {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, vWidth, 240);
  var centerX = vWidth / 2;
  drawPixelText('GAME OVER', centerX, 96, 'center');
  drawPixelText('PRESS X OR ENTER', centerX, 124, 'center');
  ctx.restore();
}

function renderClearScreen() {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, vWidth, 240);
  var centerX = vWidth / 2;
  drawPixelText('WORLD ' + worldLabel + ' CLEAR', centerX, 92, 'center');
  drawPixelText('TIME  ' + String(timeRemaining).padStart(3, '0'), centerX, 112, 'center');
  drawPixelText('PRESS X OR ENTER', centerX, 146, 'center');
  ctx.restore();
}

// Keep the key guide inside the actual game canvas so the browser page itself
// stays visually identical to a standalone game screen.
function renderControls() {
  if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
    return;
  }

  var label = 'MOVE: ARROW KEYS   JUMP: X   RUN: Z';
  var panelHeight = 14;
  var y = 220;

  ctx.save();
  ctx.font = 'bold 6px monospace';
  var horizontalPadding = 5;
  var panelWidth = Math.ceil(ctx.measureText(label).width) + horizontalPadding * 2;
  var x = Math.max(6, vWidth - panelWidth - 6);
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + horizontalPadding, y + panelHeight / 2 + 0.5);
  ctx.restore();
}

function startOrRestartGame() {
  if (gameMode === 'start') {
    gameMode = 'playing';
    timeRemaining = 400;
    lastTimerSecond = 0;
    music.overworld.currentTime = 0;
    music.overworld.play();
    return;
  }

  if (gameMode === 'gameover' || gameMode === 'clear') {
    lives = 3;
    score = 0;
    timeRemaining = 400;
    lastTimerSecond = 0;
    pendingGameOver = false;
    player = new Mario.Player(level.playerPos);
    level.loader.call();
    input.reset();
    gameMode = 'playing';
  }
}

document.addEventListener('keydown', function(event) {
  if ((event.keyCode === 88 || event.keyCode === 13) && gameMode !== 'playing') {
    event.preventDefault();
    startOrRestartGame();
  }
});

window.onMarioDeath = function() {
  if (gameMode !== 'playing') return;
  lives -= 1;
  if (lives <= 0) {
    pendingGameOver = true;
  }
};

window.canRespawnMario = function() {
  return gameMode === 'playing' && lives > 0 && !pendingGameOver;
};

window.onMarioGameOver = function() {
  gameMode = 'gameover';
  pendingGameOver = false;
};

window.onMarioCourseClear = function() {
  if (gameMode !== 'playing') return;
  score += Math.max(0, timeRemaining) * 50;
  gameMode = 'clear';
  music.overworld.pause();
};

function renderEntity(entity) {
  entity.render(ctx, vX, vY);
}
