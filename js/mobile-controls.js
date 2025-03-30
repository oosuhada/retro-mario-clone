(function() {
  var controls = document.querySelector('.mobile-controls');

  if (!controls || !window.input) {
    return;
  }

  var isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  var lastTouchEndAt = 0;

  function preventBrowserGesture(event) {
    if (!isTouchDevice) {
      return;
    }

    event.preventDefault();
  }

  function preventDoubleTapZoom(event) {
    if (!isTouchDevice) {
      return;
    }

    var now = Date.now();
    if (now - lastTouchEndAt <= 320) {
      event.preventDefault();
    }
    lastTouchEndAt = now;
  }

  function updateMobileUi() {
    var isPortrait = window.innerHeight > window.innerWidth;
    controls.classList.toggle('is-visible', isTouchDevice);
    controls.classList.toggle('is-portrait-rotated', isTouchDevice && isPortrait);

    if (isTouchDevice && isPortrait) {
      var width = window.innerHeight;
      var height = window.innerWidth;
      controls.style.width = width + 'px';
      controls.style.height = height + 'px';
      controls.style.left = ((window.innerWidth - width) / 2) + 'px';
      controls.style.top = ((window.innerHeight - height) / 2) + 'px';
    } else {
      controls.style.width = '';
      controls.style.height = '';
      controls.style.left = '';
      controls.style.top = '';
    }
  }

  function tryLandscapeLock() {
    if (!screen.orientation || typeof screen.orientation.lock !== 'function') {
      return;
    }

    screen.orientation.lock('landscape').catch(function() {});
  }

  function pressButton(button, pointerId) {
    var key = button.getAttribute('data-key');
    if (!key) return;

    button.setPointerCapture(pointerId);
    button.classList.add('is-pressed');
    window.input.press(key);

    if (key === 'JUMP' && typeof window.startOrRestartGame === 'function' && window.gameMode !== 'playing') {
      window.startOrRestartGame();
    }

    tryLandscapeLock();
  }

  function releaseButton(button, pointerId) {
    var key = button.getAttribute('data-key');
    if (!key) return;

    if (button.hasPointerCapture && button.hasPointerCapture(pointerId)) {
      button.releasePointerCapture(pointerId);
    }
    button.classList.remove('is-pressed');
    window.input.release(key);
  }

  controls.querySelectorAll('[data-key]').forEach(function(button) {
    button.addEventListener('pointerdown', function(event) {
      event.preventDefault();
      pressButton(button, event.pointerId);
    });

    button.addEventListener('pointerup', function(event) {
      event.preventDefault();
      releaseButton(button, event.pointerId);
    });

    button.addEventListener('pointercancel', function(event) {
      releaseButton(button, event.pointerId);
    });

    button.addEventListener('contextmenu', function(event) {
      event.preventDefault();
    });
  });

  document.addEventListener('gesturestart', preventBrowserGesture, { passive: false });
  document.addEventListener('gesturechange', preventBrowserGesture, { passive: false });
  document.addEventListener('gestureend', preventBrowserGesture, { passive: false });
  document.addEventListener('dblclick', preventBrowserGesture, { passive: false });
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

  window.addEventListener('resize', updateMobileUi);
  window.addEventListener('orientationchange', updateMobileUi);
  updateMobileUi();
})();
