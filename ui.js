/* ============================================
   ui.js — HUD, Menus, Game Over Screen
   HTML overlay management
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.UI = (function() {
    // DOM references
    var menuOverlay, hudEl, gameoverOverlay;
    var hudScore, hudStatus, hudTimer, hudOrders, hudBest, hudFrisco;
    var milkshakeBar, milkshakeFill;
    var franciscoWarning;
    var gameoverScore, gameoverNewHigh, gameoverTime;
    var menuHighscore;
    var joystickContainer, joystickOuter, joystickInner;

    // Joystick state
    var joystickActive = false;
    var joystickInput = { x: 0, y: 0 };
    var joystickTouchId = null;
    var joystickCenterX = 0;
    var joystickCenterY = 0;
    var joystickMaxRadius = 50; // half of (130 - 55) / 2 roughly

    // High score
    var highScore = 0;

    // Callbacks
    var onCharacterSelect = null;

    /**
     * Initialize all UI references and events
     */
    function init(characterSelectCallback) {
        onCharacterSelect = characterSelectCallback;

        // Cache DOM references
        menuOverlay = document.getElementById('menu-overlay');
        hudEl = document.getElementById('hud');
        gameoverOverlay = document.getElementById('gameover-overlay');
        hudScore = document.getElementById('hud-score');
        hudStatus = document.getElementById('hud-status');
        hudTimer = document.getElementById('hud-timer');
        hudOrders = document.getElementById('hud-orders');
        hudBest = document.getElementById('hud-best');
        hudFrisco = document.getElementById('hud-frisco');
        milkshakeBar = document.getElementById('milkshake-bar');
        milkshakeFill = document.getElementById('milkshake-fill');
        franciscoWarning = document.getElementById('francisco-warning');
        gameoverScore = document.getElementById('gameover-score');
        gameoverNewHigh = document.getElementById('gameover-newhigh');
        gameoverTime = document.getElementById('gameover-time');
        menuHighscore = document.getElementById('menu-highscore');
        joystickContainer = document.getElementById('joystick-container');
        joystickOuter = document.getElementById('joystick-outer');
        joystickInner = document.getElementById('joystick-inner');

        // Load high score
        highScore = parseInt(localStorage.getItem('steaknshake3d_highscore') || '0', 10);

        // Character select buttons
        var charBtns = document.querySelectorAll('.char-btn');
        charBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var charName = btn.getAttribute('data-char');
                window.GAME.Audio.init();
                if (onCharacterSelect) onCharacterSelect(charName);
            });
        });

        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', function() {
            showMenu();
        });

        // Setup joystick for touch devices
        if (isTouchDevice()) {
            setupJoystick();
        }

        // Show menu initially
        showMenu();
    }

    /**
     * Detect touch-capable device
     */
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Setup virtual joystick for mobile
     */
    function setupJoystick() {
        joystickContainer.style.display = 'block';

        joystickOuter.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            joystickActive = true;

            var rect = joystickOuter.getBoundingClientRect();
            joystickCenterX = rect.left + rect.width / 2;
            joystickCenterY = rect.top + rect.height / 2;

            updateJoystickPosition(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('touchmove', function(e) {
            if (!joystickActive) return;
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId) {
                    e.preventDefault();
                    updateJoystickPosition(touch.clientX, touch.clientY);
                    break;
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', function(e) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) {
                    joystickActive = false;
                    joystickTouchId = null;
                    joystickInput.x = 0;
                    joystickInput.y = 0;
                    joystickInner.style.transform = 'translate(-50%, -50%)';
                    joystickInner.style.left = '50%';
                    joystickInner.style.top = '50%';
                    break;
                }
            }
        });
    }

    function updateJoystickPosition(touchX, touchY) {
        var dx = touchX - joystickCenterX;
        var dy = touchY - joystickCenterY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = joystickMaxRadius;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
            dist = maxDist;
        }

        // Normalize to -1..1
        joystickInput.x = dx / maxDist;
        joystickInput.y = dy / maxDist;

        // Move inner circle
        var innerOffsetX = 50 + (dx / 65) * 50;
        var innerOffsetY = 50 + (dy / 65) * 50;
        joystickInner.style.left = innerOffsetX + '%';
        joystickInner.style.top = innerOffsetY + '%';
        joystickInner.style.transform = 'translate(-50%, -50%)';
    }

    /**
     * Get joystick input
     */
    function getJoystickInput() {
        return joystickInput;
    }

    /**
     * Show character select menu
     */
    function showMenu() {
        menuOverlay.style.display = 'flex';
        hudEl.style.display = 'none';
        gameoverOverlay.style.display = 'none';

        if (highScore > 0) {
            menuHighscore.textContent = 'High Score: $' + highScore;
        } else {
            menuHighscore.textContent = '';
        }
    }

    /**
     * Show in-game HUD
     */
    function showHUD() {
        menuOverlay.style.display = 'none';
        hudEl.style.display = 'block';
        gameoverOverlay.style.display = 'none';
        franciscoWarning.style.display = 'none';
        milkshakeBar.style.display = 'none';

        // Show joystick on mobile
        if (isTouchDevice()) {
            joystickContainer.style.display = 'block';
        }
    }

    /**
     * Show game over screen
     */
    function showGameOver(score, time, isNewHigh) {
        gameoverOverlay.style.display = 'flex';
        hudEl.style.display = 'none';

        gameoverScore.textContent = '$' + score;

        var minutes = Math.floor(time / 60);
        var seconds = Math.floor(time % 60);
        gameoverTime.textContent = 'Time: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        if (isNewHigh) {
            gameoverNewHigh.style.display = 'block';
            highScore = score;
            localStorage.setItem('steaknshake3d_highscore', String(score));
        } else {
            gameoverNewHigh.style.display = 'none';
        }

        // Hide joystick
        if (joystickContainer) {
            joystickContainer.style.display = 'none';
        }
    }

    /**
     * Update HUD with current game state
     */
    function updateHUD(gameState) {
        // Score
        hudScore.textContent = '$' + gameState.score;

        // Carrying status
        if (gameState.carryingFood) {
            hudStatus.textContent = '🍔 DELIVERING...';
            hudStatus.className = 'delivering';
        } else {
            hudStatus.textContent = 'GO TO COUNTER';
            hudStatus.className = '';
        }

        // Timer
        var minutes = Math.floor(gameState.elapsedTime / 60);
        var seconds = Math.floor(gameState.elapsedTime % 60);
        hudTimer.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        // Orders
        hudOrders.textContent = gameState.orders.length + ' ORDERS';

        // Best
        hudBest.textContent = 'BEST: $' + highScore;

        // Frisco Melt indicator
        if (gameState.friscoMeltCount > 0) {
            hudFrisco.textContent = '⭐ ' + gameState.friscoMeltCount + ' FRISCO MELT!';
        } else {
            hudFrisco.textContent = '';
        }

        // Milkshake boost bar
        if (gameState.milkshakeBoost) {
            milkshakeBar.style.display = 'block';
            var pct = (gameState.milkshakeTimer / gameState.milkshakeBoostDuration) * 100;
            milkshakeFill.style.width = pct + '%';
        } else {
            milkshakeBar.style.display = 'none';
        }

        // Francisco warning
        if (gameState.difficulty >= 3) {
            franciscoWarning.style.display = 'block';
        } else {
            franciscoWarning.style.display = 'none';
        }
    }

    /**
     * Get the current high score
     */
    function getHighScore() {
        return highScore;
    }

    return {
        init: init,
        showMenu: showMenu,
        showHUD: showHUD,
        showGameOver: showGameOver,
        updateHUD: updateHUD,
        getJoystickInput: getJoystickInput,
        getHighScore: getHighScore,
        isTouchDevice: isTouchDevice
    };
})();
