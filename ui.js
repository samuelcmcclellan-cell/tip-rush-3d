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

    // Tap-to-move state (mobile)
    var tapTarget = { x: 0, z: 0, active: false };
    var tapTouchId = null;
    var cameraRef = null; // set via setCamera()

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

        // Setup tap-to-move for touch devices
        if (isTouchDevice()) {
            setupTapToMove();
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
     * Set camera reference for tap-to-move raycasting
     */
    function setCamera(cam) {
        cameraRef = cam;
    }

    /**
     * Setup tap-to-move controls for mobile
     * Player taps/drags on screen → raycast to floor → set walk target
     */
    function setupTapToMove() {
        var canvas = document.querySelector('canvas');
        if (!canvas) return;

        canvas.addEventListener('touchstart', function(e) {
            // Don't handle taps when menus are visible
            if (menuOverlay.style.display !== 'none' || gameoverOverlay.style.display !== 'none') return;
            e.preventDefault();
            var touch = e.changedTouches[0];
            tapTouchId = touch.identifier;
            raycastToFloor(touch.clientX, touch.clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            if (tapTouchId === null) return;
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                if (touch.identifier === tapTouchId) {
                    e.preventDefault();
                    raycastToFloor(touch.clientX, touch.clientY);
                    break;
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', function(e) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === tapTouchId) {
                    tapTouchId = null;
                    // Keep target active — player walks to it
                    break;
                }
            }
        });
    }

    /**
     * Raycast from screen touch to the floor plane (y=0)
     */
    function raycastToFloor(screenX, screenY) {
        if (!cameraRef) return;

        // Convert screen coords to normalized device coords (-1 to +1)
        var ndcX = (screenX / window.innerWidth) * 2 - 1;
        var ndcY = -(screenY / window.innerHeight) * 2 + 1;

        // Create a ray from camera through the touch point
        var raycaster = new THREE.Raycaster();
        var mouseVec = new THREE.Vector2(ndcX, ndcY);
        raycaster.setFromCamera(mouseVec, cameraRef);

        // Intersect with floor plane (y = 0)
        var floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var intersection = new THREE.Vector3();
        var hit = raycaster.ray.intersectPlane(floorPlane, intersection);

        if (hit) {
            tapTarget.x = intersection.x;
            tapTarget.z = intersection.z;
            tapTarget.active = true;
        }
    }

    /**
     * Get tap-to-move target position
     */
    function getTapTarget() {
        return tapTarget;
    }

    /**
     * Clear tap target (when player reaches it)
     */
    function clearTapTarget() {
        tapTarget.active = false;
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
        getTapTarget: getTapTarget,
        clearTapTarget: clearTapTarget,
        setCamera: setCamera,
        getHighScore: getHighScore,
        isTouchDevice: isTouchDevice
    };
})();
