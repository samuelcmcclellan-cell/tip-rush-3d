/* ============================================
   game.js — Main Game Loop, State Management,
   Initialization
   ============================================ */

window.GAME = window.GAME || {};

(function() {
    // Three.js globals
    var renderer, scene, camera;
    // Timing handled by performance.now() via lastTime

    // Game objects
    var playerModel = null;
    var franciscoModel = null;
    var restaurantData = null;

    // Input state
    var keys = {};
    var gameActive = false;

    // Milkshake aura (visual effect around player during boost)
    var milkshakeAura = null;

    /**
     * Initialize everything on page load
     */
    function initEngine() {
        // Create renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        document.body.insertBefore(renderer.domElement, document.body.firstChild);

        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);

        // Create camera
        camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        // Clock for delta time
        // Build restaurant environment (visible behind menu)
        restaurantData = window.GAME.Restaurant.build(scene);

        // Initialize camera
        var isMobile = window.GAME.UI.isTouchDevice();
        window.GAME.Camera.init(camera, isMobile);

        // Set camera to a nice overview position for menu
        camera.position.set(0, 15, 10);
        camera.lookAt(0, 0, 0);

        // Initialize UI
        window.GAME.UI.init(onCharacterSelected);

        // Initialize mechanics
        window.GAME.Mechanics.init(restaurantData, scene);

        // Keyboard input
        document.addEventListener('keydown', function(e) {
            keys[e.code] = true;
        });
        document.addEventListener('keyup', function(e) {
            keys[e.code] = false;
        });

        // Window resize
        window.addEventListener('resize', onResize);

        // Create milkshake aura effect (hidden initially)
        createMilkshakeAura();

        // Start render loop (always running for menu background)
        lastTime = performance.now();
        animate();
        // Fallback interval for when tab is hidden (rAF pauses)
        setInterval(function() {
            if (document.hidden) tick();
        }, 1000 / 30);
    }

    /**
     * Create the milkshake speed boost aura effect
     */
    function createMilkshakeAura() {
        var auraGroup = new THREE.Group();

        // Pink ring particles
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0xFF69B4,
            transparent: true,
            opacity: 0.4
        });

        for (var i = 0; i < 8; i++) {
            var particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 6, 6),
                ringMat.clone()
            );
            var angle = (i / 8) * Math.PI * 2;
            particle.position.set(Math.cos(angle) * 1, 0.5, Math.sin(angle) * 1);
            particle.userData.angle = angle;
            auraGroup.add(particle);
        }

        // Pink light
        var pinkLight = new THREE.PointLight(0xFF69B4, 0, 5);
        pinkLight.position.y = 1;
        auraGroup.add(pinkLight);
        auraGroup.userData.light = pinkLight;

        auraGroup.visible = false;
        milkshakeAura = auraGroup;
        scene.add(auraGroup);
    }

    /**
     * Called when player selects a character
     */
    function onCharacterSelected(characterName) {
        // Remove existing player/francisco if any
        if (playerModel) scene.remove(playerModel);
        if (franciscoModel) scene.remove(franciscoModel);

        // Create player
        playerModel = window.GAME.Characters.createPlayer(characterName);
        playerModel.position.set(0, 0, 15); // bottom-center of restaurant
        scene.add(playerModel);

        // Create Francisco
        franciscoModel = window.GAME.Characters.createFrancisco();
        franciscoModel.position.set(0, 0, -15); // near counter area
        scene.add(franciscoModel);

        // Reset mechanics
        window.GAME.Mechanics.reset();
        window.GAME.Mechanics.init(restaurantData, scene);

        // Show HUD
        window.GAME.UI.showHUD();
        gameActive = true;

        // Reset timing to avoid large dt on first frame
        lastTime = performance.now();
    }

    /**
     * Handle keyboard input → movement vector
     */
    function getKeyboardInput() {
        var ix = 0, iz = 0;

        if (keys['KeyW'] || keys['ArrowUp']) iz = -1;
        if (keys['KeyS'] || keys['ArrowDown']) iz = 1;
        if (keys['KeyA'] || keys['ArrowLeft']) ix = -1;
        if (keys['KeyD'] || keys['ArrowRight']) ix = 1;

        // Normalize diagonal
        var mag = Math.sqrt(ix * ix + iz * iz);
        if (mag > 1) {
            ix /= mag;
            iz /= mag;
        }

        return { x: ix, z: iz };
    }

    /**
     * Main game update
     */
    function updateGame(dt) {
        if (!gameActive) return;

        var state = window.GAME.Mechanics.getState();
        if (state.gameOver) return;

        // Get input
        var input;
        if (window.GAME.UI.isTouchDevice()) {
            var joystick = window.GAME.UI.getJoystickInput();
            input = { x: joystick.x, z: joystick.y };
        } else {
            input = getKeyboardInput();
        }

        // Get camera yaw for movement direction
        var cameraYaw = window.GAME.Camera.getYaw();

        // Update player movement
        var moveMag = window.GAME.Mechanics.updatePlayerMovement(
            playerModel, input.x, input.z, dt, cameraYaw
        );

        // Update food carrying visual
        window.GAME.Characters.setCarryingFood(playerModel, state.carryingFood);

        // Animate player
        var speed = Math.sqrt(input.x * input.x + input.z * input.z);
        window.GAME.Characters.animateWalk(playerModel, dt, speed * 10);
        window.GAME.Characters.animateIdle(playerModel, state.elapsedTime);

        // Update Francisco
        var franciscoDist = window.GAME.Mechanics.updateFrancisco(
            franciscoModel, playerModel.position, dt
        );

        // Animate Francisco
        var fSpeed = window.GAME.Mechanics.getFranciscoSpeed();
        window.GAME.Characters.animateWalk(franciscoModel, dt, fSpeed);
        window.GAME.Characters.animateIdle(franciscoModel, state.elapsedTime);

        // Francisco eye tracking
        window.GAME.Characters.updateEyeTracking(franciscoModel, playerModel.position);

        // Francisco anger effects
        window.GAME.Characters.updateAngerEffects(
            franciscoModel, state.difficulty, state.elapsedTime, scene
        );

        // Tension lighting — shift a pendant light reddish when Francisco is close
        if (restaurantData.pendantLights.length > 0 && franciscoDist !== undefined) {
            var tensionLight = restaurantData.pendantLights[restaurantData.pendantLights.length - 1];
            if (franciscoDist < 8) {
                var redAmount = Math.max(0, (8 - franciscoDist) / 8);
                var r = 1;
                var g = 0.9 * (1 - redAmount * 0.5);
                var b = 0.7 * (1 - redAmount * 0.7);
                tensionLight.color.setRGB(r, g, b);
                tensionLight.intensity = 0.8 + redAmount * 0.5;
            } else {
                tensionLight.color.setHex(0xFFE4B5);
                tensionLight.intensity = 0.8;
            }
        }

        // Update mechanics (orders, tips, etc.)
        window.GAME.Mechanics.update(dt, playerModel.position);

        // Milkshake aura effect
        if (milkshakeAura) {
            if (state.milkshakeBoost) {
                milkshakeAura.visible = true;
                milkshakeAura.position.copy(playerModel.position);
                milkshakeAura.children.forEach(function(child) {
                    if (child.userData.angle !== undefined) {
                        child.userData.angle += dt * 3;
                        child.position.set(
                            Math.cos(child.userData.angle) * 1.2,
                            0.5 + Math.sin(state.elapsedTime * 5 + child.userData.angle) * 0.3,
                            Math.sin(child.userData.angle) * 1.2
                        );
                        child.material.opacity = 0.3 + Math.sin(state.elapsedTime * 4) * 0.2;
                    }
                });
                if (milkshakeAura.userData.light) {
                    milkshakeAura.userData.light.intensity = 0.8 + Math.sin(state.elapsedTime * 3) * 0.3;
                }
            } else {
                milkshakeAura.visible = false;
            }
        }

        // Check catch
        if (window.GAME.Mechanics.checkCatch(playerModel.position, franciscoModel.position)) {
            triggerGameOver();
        }

        // Update camera
        window.GAME.Camera.update(playerModel, dt, franciscoDist);

        // Update HUD
        window.GAME.UI.updateHUD(state);
    }

    /**
     * Trigger game over
     */
    function triggerGameOver() {
        var state = window.GAME.Mechanics.getState();
        window.GAME.Mechanics.setGameOver();
        gameActive = false;

        window.GAME.Audio.gameover();

        // Camera shake
        window.GAME.Camera.shake(1);

        var isNewHigh = state.score > window.GAME.UI.getHighScore();
        window.GAME.UI.showGameOver(state.score, state.elapsedTime, isNewHigh);
    }

    /**
     * Animation loop — uses both rAF and setInterval to ensure
     * the game runs even when the tab is not visible
     */
    var lastTime = performance.now();

    function animate() {
        requestAnimationFrame(animate);
        tick();
    }

    function tick() {
        var now = performance.now();
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        // Cap delta time to prevent huge jumps
        dt = Math.min(dt, 0.05);
        // Skip zero-time frames
        if (dt <= 0) return;

        if (gameActive) {
            try {
                updateGame(dt);
            } catch(e) {
                console.error('updateGame error:', e.message, e.stack);
            }
        } else {
            // Menu camera slow orbit
            var time = performance.now() / 1000;
            camera.position.x = Math.sin(time * 0.15) * 12;
            camera.position.z = Math.cos(time * 0.15) * 12;
            camera.position.y = 10 + Math.sin(time * 0.1) * 2;
            camera.lookAt(0, 1, 0);
        }

        renderer.render(scene, camera);
    }

    /**
     * Handle window resize
     */
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Start everything when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEngine);
    } else {
        initEngine();
    }
})();
