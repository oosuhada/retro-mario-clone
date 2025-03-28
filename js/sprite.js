(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  var vividPlayerCache = {};

  function getVividPlayerImage(path) {
    if (path !== 'sprites/player.png' && path !== 'sprites/playerl.png') {
      return resources.get(path);
    }

    if (vividPlayerCache[path]) {
      return vividPlayerCache[path];
    }

    var source = resources.get(path);
    var offscreen = document.createElement('canvas');
    offscreen.width = source.width;
    offscreen.height = source.height;
    var offscreenCtx = offscreen.getContext('2d');
    offscreenCtx.imageSmoothingEnabled = false;
    offscreenCtx.drawImage(source, 0, 0);

    var imageData = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    var pixels = imageData.data;

    for (var index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] === 0) {
        continue;
      }

      var r = pixels[index];
      var g = pixels[index + 1];
      var b = pixels[index + 2];

      if (r === 177 && g === 52 && b === 37) {
        pixels[index] = 255;
        pixels[index + 1] = 24;
        pixels[index + 2] = 8;
      } else if (r === 230 && g === 156 && b === 33) {
        pixels[index] = 255;
        pixels[index + 1] = 198;
        pixels[index + 2] = 42;
      } else if (r === 156 && g === 74 && b === 0) {
        pixels[index] = 148;
        pixels[index + 1] = 78;
        pixels[index + 2] = 0;
      }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
    vividPlayerCache[path] = offscreen;
    return offscreen;
  }

  var Sprite = Mario.Sprite = function(img, pos, size, speed, frames, once) {
    this.pos = pos;
    this.size = size;
    this.speed = speed;
    this._index = 0;
    this.img = img;
    this.once = once;
    this.frames = frames;
  }

  Sprite.prototype.update = function(dt, gameTime) {
    if (gameTime && gameTime == this.lastUpdated) return;
    this._index += this.speed*dt;
    if (gameTime) this.lastUpdated = gameTime;
  }

  Sprite.prototype.setFrame = function(frame) {
    this._index = frame;
  }

  Sprite.prototype.render = function(ctx, posx, posy, vX, vY) {
    var frame;

    if (this.speed > 0) {
      var max = this.frames.length;
      var idx = Math.floor(this._index);
      frame = this.frames[idx % max];

      if (this.once && idx >= max) {
        this.done = true;
        return;
      }
    } else {
      frame = 0;
    }

    var x = this.pos[0];
    var y = this.pos[1];

    x += frame*this.size[0];

    // Sample the sprite sheet on exact source-pixel boundaries and snap only
    // the rendered position to the logical pixel grid. Physics can keep using
    // fractional coordinates, while the visible sprite remains nearest-neighbor
    // sharp instead of sampling across adjacent sprite-sheet pixels.
    ctx.drawImage(
      getVividPlayerImage(this.img),
      Math.round(x),
      Math.round(y),
      this.size[0],
      this.size[1],
      Math.round(posx - vX),
      Math.round(posy - vY),
      this.size[0],
      this.size[1]
    );
  }
})();
