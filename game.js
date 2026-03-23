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
    var jaimeModel = null;
    var npcModels = [];
    var restaurantData = null;

    // Input state
    var keys = {};
    var gameActive = false;

    // Milkshake aura (visual effect around player during boost)
    var milkshakeAura = null;

    // Tap-to-move target marker (3D ring on floor)
    var tapTargetMarker = null;

    // Tutorial system
    var tutorialOverlay = null;
    var tutorialTimer = 0;
    var tutorialStep = 0;
    var tutorialActive = false;
    var TUTORIAL_STEPS = [
        { time: 0, text: "TAP ANYWHERE TO MOVE" },
        { time: 2.5, text: "WALK TO THE COUNTER\nTO PICK UP FOOD" },
        { time: 5, text: "DELIVER FOOD TO TABLES\nFOR TIPS! AVOID FRANCISCO!" }
    ];

    // Direction arrow (3D indicator above player)
    var directionArrow = null;
    var hasDeliveredOnce = false;

    // Francisco speech bubble system
    var franciscoSpeechMesh = null;
    var franciscoSpeechTimer = 4; // first speech after 4 seconds
    var franciscoSpeechDuration = 0;
    var franciscoSpeechVisible = false;
    var FRANCISCO_QUOTES = [
        "Hey you look tired...",
        "Come here for a sec...",
        "I just wanna talk...",
        "You look stressed...",
        "Take a break...",
        "Where you going?",
        "Slow down...",
        "Hey wait up...",
        "I need to tell you something...",
        "Hey lemme help you with your apron jaja",
        "You forgot to clock in...",
        "We need to talk about your performance...",
        "Come to my office real quick...",
        "I'm not mad, I'm disappointed...",
        "You call that a Frisco Melt?!",
        "Your apron is crooked jaja",
        "I'm writing you up...",
        "No running in my restaurant!",
        "That's coming out of your paycheck...",
        "I saw you take an extra break..."
    ];

    // Jaime speech bubble system
    var jaimeSpeechMesh = null;
    var jaimeSpeechTimer = 12;
    var jaimeSpeechDuration = 0;
    var jaimeSpeechVisible = false;
    var JAIME_QUOTES = [
        "Hey bro you got a dollar?",
        "Nice shoes... what size are those?",
        "My Neon's running outside don't tell nobody",
        "You want some... nevermind",
        "I know a guy who knows a guy...",
        "Bro I just need a ride home real quick",
        "Can you hold this for me? ...actually nevermind",
        "Tell Francisco I'm not here",
        "I left something in my car brb",
        "You smell that? ...me neither"
    ];

    // NPC speech bubble system
    var npcSpeechMeshes = [];
    var npcSpeechTimers = [];
    var npcSpeechDurations = [];
    var npcSpeechVisible = [];
    var NPC_QUOTES = [
        "I've been waiting 3 hours for my Frisco Melt...",
        "Is that Francisco? He owes me $5...",
        "This booth smells like regret",
        "I only came here for the milkshakes tbh",
        "Why is that guy running??",
        "Sir this is a Steak 'n' Shake",
        "I think my waiter is crying",
        "Can I get more ranch? ...hello?",
        "My Uber driver is outside honking",
        "I found a hair in my burger and I'm choosing peace",
        "That dude been staring at me for 10 minutes",
        "Is it normal for the manager to chase employees?",
        "I'm leaving a 1-star review",
        "The jukebox hasn't worked since 2014",
        "I asked for no pickles TWICE",
        "My kid just licked the window again",
        "Are they hiring? This looks fun actually",
        "I've seen things in this Steak 'n' Shake...",
        "Francisco just winked at me I'm scared",
        "Jaime tried to sell me something in the parking lot"
    ];

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

        // Build restaurant environment (visible behind menu)
        restaurantData = window.GAME.Restaurant.build(scene);

        // Initialize camera
        var isMobile = window.GAME.UI.isTouchDevice();
        window.GAME.Camera.init(camera, isMobile);

        // Set camera to a nice overview position for menu
        camera.position.set(0, 15, 10);
        camera.lookAt(0, 0, 0);

        // Initialize UI and pass camera for tap-to-move raycasting
        window.GAME.UI.init(onCharacterSelected);
        window.GAME.UI.setCamera(camera);

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

        // Create tap-to-move target marker
        createTapTargetMarker();

        // Create direction arrow
        createDirectionArrow();

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
     * Create tap-to-move target marker (pulsing ring on floor)
     */
    function createTapTargetMarker() {
        var ringGeo = new THREE.RingGeometry(0.3, 0.5, 24);
        var ringMat = new THREE.MeshBasicMaterial({
            color: 0x33FF33,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        tapTargetMarker = new THREE.Mesh(ringGeo, ringMat);
        tapTargetMarker.rotation.x = -Math.PI / 2; // lay flat on floor
        tapTargetMarker.position.y = 0.05;
        tapTargetMarker.visible = false;
        scene.add(tapTargetMarker);
    }

    /**
     * Create 3D direction arrow that floats above player
     */
    function createDirectionArrow() {
        var group = new THREE.Group();

        // Arrow shaft (cylinder)
        var shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8),
            new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.8 })
        );
        shaft.rotation.x = Math.PI / 2;
        shaft.position.z = -0.3;
        group.add(shaft);

        // Arrow head (cone)
        var head = new THREE.Mesh(
            new THREE.ConeGeometry(0.25, 0.5, 8),
            new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.8 })
        );
        head.rotation.x = -Math.PI / 2;
        head.position.z = -1.1;
        group.add(head);

        group.position.y = 4;
        group.visible = false;
        directionArrow = group;
        scene.add(directionArrow);
    }

    /**
     * Update direction arrow to point where player should go
     */
    function updateDirectionArrow(playerPos, state) {
        if (!directionArrow || hasDeliveredOnce) {
            if (directionArrow) directionArrow.visible = false;
            return;
        }

        directionArrow.visible = true;
        directionArrow.position.x = playerPos.x;
        directionArrow.position.z = playerPos.z;

        // Bob up and down
        directionArrow.position.y = 4 + Math.sin(state.elapsedTime * 3) * 0.3;

        if (!state.carryingFood) {
            // Point toward counter (pickup zone center at 0, -19)
            var angle = Math.atan2(playerPos.x - 0, playerPos.z - (-19));
            directionArrow.rotation.y = angle;
            // Green for counter
            directionArrow.children.forEach(function(c) {
                c.material.color.setHex(0x33FF33);
            });
        } else if (state.orders.length > 0) {
            // Point toward nearest order table
            var nearest = state.orders[0];
            var nearDist = Infinity;
            state.orders.forEach(function(o) {
                var d = Math.sqrt(
                    Math.pow(playerPos.x - o.tablePos.x, 2) +
                    Math.pow(playerPos.z - o.tablePos.z, 2)
                );
                if (d < nearDist) { nearDist = d; nearest = o; }
            });
            var angle = Math.atan2(playerPos.x - nearest.tablePos.x, playerPos.z - nearest.tablePos.z);
            directionArrow.rotation.y = angle;
            // Orange for delivery
            directionArrow.children.forEach(function(c) {
                c.material.color.setHex(0xFFA500);
            });
        }
    }

    /**
     * Start tutorial overlay sequence
     */
    function startTutorial() {
        tutorialOverlay = document.getElementById('tutorial-overlay');
        if (!tutorialOverlay) return;
        tutorialOverlay.style.display = 'flex';
        tutorialTimer = 0;
        tutorialStep = 0;
        tutorialActive = true;
        updateTutorialText();

        // Dismiss on tap
        tutorialOverlay.addEventListener('click', dismissTutorial);
        tutorialOverlay.addEventListener('touchstart', dismissTutorial);
    }

    function dismissTutorial() {
        tutorialActive = false;
        if (tutorialOverlay) tutorialOverlay.style.display = 'none';
    }

    function updateTutorialText() {
        var textEl = document.getElementById('tutorial-text');
        if (!textEl || tutorialStep >= TUTORIAL_STEPS.length) return;
        textEl.innerHTML = TUTORIAL_STEPS[tutorialStep].text.replace('\n', '<br>');
    }

    function updateTutorial(dt) {
        if (!tutorialActive) return;
        tutorialTimer += dt;

        // Advance steps
        if (tutorialStep < TUTORIAL_STEPS.length - 1 &&
            tutorialTimer >= TUTORIAL_STEPS[tutorialStep + 1].time) {
            tutorialStep++;
            updateTutorialText();
        }

        // Auto-dismiss after 7.5 seconds
        if (tutorialTimer >= 7.5) {
            dismissTutorial();
        }
    }

    /**
     * Show a speech bubble above an NPC
     */
    function showNPCSpeech(npcIndex, text) {
        // Remove old speech bubble for this NPC
        if (npcSpeechMeshes[npcIndex]) {
            scene.remove(npcSpeechMeshes[npcIndex]);
            npcSpeechMeshes[npcIndex] = null;
        }

        var tex = createSpeechBubbleTexture(text);
        var mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 1,
            depthTest: false
        });
        var mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), mat);
        mesh.renderOrder = 999;
        scene.add(mesh);

        npcSpeechMeshes[npcIndex] = mesh;
        npcSpeechVisible[npcIndex] = true;
        npcSpeechDurations[npcIndex] = 4;
    }

    /**
     * Update NPC speech bubble system
     */
    function updateNPCSpeech(dt) {
        for (var i = 0; i < npcModels.length; i++) {
            // Timer to show next speech
            npcSpeechTimers[i] -= dt;
            if (npcSpeechTimers[i] <= 0 && !npcSpeechVisible[i]) {
                var quote = NPC_QUOTES[Math.floor(Math.random() * NPC_QUOTES.length)];
                showNPCSpeech(i, quote);
                npcSpeechTimers[i] = 8 + Math.random() * 12; // 8-20 second interval
            }

            // Update visible speech bubble
            if (npcSpeechVisible[i] && npcSpeechMeshes[i] && npcModels[i]) {
                npcSpeechDurations[i] -= dt;

                // Position above NPC's head
                npcSpeechMeshes[i].position.set(
                    npcModels[i].position.x,
                    npcModels[i].position.y + 3.5,
                    npcModels[i].position.z
                );
                npcSpeechMeshes[i].lookAt(camera.position);

                // Fade out in last 0.5 seconds
                if (npcSpeechDurations[i] < 0.5) {
                    npcSpeechMeshes[i].material.opacity = Math.max(0, npcSpeechDurations[i] / 0.5);
                }

                // Remove when done
                if (npcSpeechDurations[i] <= 0) {
                    scene.remove(npcSpeechMeshes[i]);
                    npcSpeechMeshes[i] = null;
                    npcSpeechVisible[i] = false;
                }
            }
        }
    }

    /**
     * Show a speech bubble above Jaime
     */
    function showJaimeSpeech(text) {
        if (jaimeSpeechMesh) {
            scene.remove(jaimeSpeechMesh);
            jaimeSpeechMesh = null;
        }

        var tex = createSpeechBubbleTexture(text);
        var mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 1,
            depthTest: false
        });
        jaimeSpeechMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), mat);
        jaimeSpeechMesh.renderOrder = 999;
        scene.add(jaimeSpeechMesh);

        jaimeSpeechVisible = true;
        jaimeSpeechDuration = 3;
    }

    /**
     * Update Jaime speech bubble system
     */
    function updateJaimeSpeech(dt) {
        if (!jaimeModel) return;

        jaimeSpeechTimer -= dt;
        if (jaimeSpeechTimer <= 0 && !jaimeSpeechVisible) {
            var quote = JAIME_QUOTES[Math.floor(Math.random() * JAIME_QUOTES.length)];
            showJaimeSpeech(quote);
            jaimeSpeechTimer = 8 + Math.random() * 6;
        }

        if (jaimeSpeechVisible && jaimeSpeechMesh && jaimeModel) {
            jaimeSpeechDuration -= dt;

            jaimeSpeechMesh.position.set(
                jaimeModel.position.x,
                jaimeModel.position.y + 3,
                jaimeModel.position.z
            );
            jaimeSpeechMesh.lookAt(camera.position);

            if (jaimeSpeechDuration < 0.5) {
                jaimeSpeechMesh.material.opacity = Math.max(0, jaimeSpeechDuration / 0.5);
            }

            if (jaimeSpeechDuration <= 0) {
                scene.remove(jaimeSpeechMesh);
                jaimeSpeechMesh = null;
                jaimeSpeechVisible = false;
            }
        }
    }

    /**
     * Create a speech bubble canvas texture
     */
    function createSpeechBubbleTexture(text) {
        var canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        var ctx = canvas.getContext('2d');

        // Rounded rectangle background
        var radius = 20;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(canvas.width - radius, 0);
        ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
        ctx.lineTo(canvas.width, canvas.height - radius);
        ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
        ctx.lineTo(radius, canvas.height);
        ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#222';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        var tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    /**
     * Show a speech bubble above Francisco
     */
    function showFranciscoSpeech(text) {
        // Remove old speech bubble
        if (franciscoSpeechMesh) {
            scene.remove(franciscoSpeechMesh);
            franciscoSpeechMesh = null;
        }

        var tex = createSpeechBubbleTexture(text);
        var mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 1,
            depthTest: false
        });
        franciscoSpeechMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), mat);
        franciscoSpeechMesh.position.set(0, 3.5, 0);
        franciscoSpeechMesh.renderOrder = 999;
        scene.add(franciscoSpeechMesh);

        franciscoSpeechVisible = true;
        franciscoSpeechDuration = 3; // visible for 3 seconds
    }

    /**
     * Update Francisco speech bubble system
     */
    function updateFranciscoSpeech(dt) {
        // Timer to show next speech
        franciscoSpeechTimer -= dt;
        if (franciscoSpeechTimer <= 0 && !franciscoSpeechVisible) {
            var quote = FRANCISCO_QUOTES[Math.floor(Math.random() * FRANCISCO_QUOTES.length)];
            showFranciscoSpeech(quote);
            franciscoSpeechTimer = 6 + Math.random() * 4; // 6-10 second interval
        }

        // Update visible speech bubble
        if (franciscoSpeechVisible && franciscoSpeechMesh && franciscoModel) {
            franciscoSpeechDuration -= dt;

            // Position above Francisco's head, billboard toward camera
            franciscoSpeechMesh.position.set(
                franciscoModel.position.x,
                franciscoModel.position.y + 3.5,
                franciscoModel.position.z
            );
            franciscoSpeechMesh.lookAt(camera.position);

            // Fade out in last 0.5 seconds
            if (franciscoSpeechDuration < 0.5) {
                franciscoSpeechMesh.material.opacity = Math.max(0, franciscoSpeechDuration / 0.5);
            }

            // Remove when done
            if (franciscoSpeechDuration <= 0) {
                scene.remove(franciscoSpeechMesh);
                franciscoSpeechMesh = null;
                franciscoSpeechVisible = false;
            }
        }
    }

    /**
     * Called when player selects a character
     */
    function onCharacterSelected(characterName) {
        // Remove existing models
        if (playerModel) scene.remove(playerModel);
        if (franciscoModel) scene.remove(franciscoModel);
        if (jaimeModel) { scene.remove(jaimeModel); jaimeModel = null; }
        if (franciscoSpeechMesh) { scene.remove(franciscoSpeechMesh); franciscoSpeechMesh = null; }

        // Create player
        playerModel = window.GAME.Characters.createPlayer(characterName);
        playerModel.position.set(0, 0, 8); // centered in restaurant, room for camera behind
        playerModel.rotation.y = Math.PI;   // face toward Francisco (negative Z)
        scene.add(playerModel);

        // Create Francisco
        franciscoModel = window.GAME.Characters.createFrancisco();
        franciscoModel.position.set(-2, 0, -10); // visible ahead of player
        scene.add(franciscoModel);

        // Jaime spawns later (after 8 seconds)
        jaimeModel = null;

        // Remove old NPCs
        npcModels.forEach(function(npc) { scene.remove(npc); });
        npcModels = [];

        // Spawn 6 NPC diners at booths and center tables
        var npcConfigs = [
            { skin: 0xFDBCB4, hair: 0x8B6914, style: 'short_brown', x: -10, z: -8, ry: Math.PI / 2 },
            { skin: 0xC68642, hair: 0x1a1a1a, style: 'short_black', x: 10, z: 2, ry: -Math.PI / 2 },
            { skin: 0xE8C4A0, hair: 0x6B3A2A, style: 'short_brown', x: -10, z: 12, ry: Math.PI / 2 },
            { skin: 0x8B6E4E, hair: 0x1a1a1a, style: 'short_black', x: 10, z: -8, ry: -Math.PI / 2 },
            { skin: 0xD4A574, hair: 0x4A2800, style: 'short_brown', x: -4, z: 4, ry: 0 },
            { skin: 0xF5D6C3, hair: 0x2a1506, style: 'short_black', x: 4, z: 14, ry: Math.PI }
        ];
        npcConfigs.forEach(function(cfg) {
            var npc = window.GAME.Characters.createNPC(cfg.skin, cfg.hair, cfg.style);
            npc.position.set(cfg.x, 0.6, cfg.z); // raised slightly to look seated
            npc.rotation.y = cfg.ry;
            scene.add(npc);
            npcModels.push(npc);
        });

        // Reset mechanics
        window.GAME.Mechanics.reset();
        window.GAME.Mechanics.init(restaurantData, scene);

        // Reset speech bubble state
        franciscoSpeechTimer = 4;
        franciscoSpeechVisible = false;
        franciscoSpeechDuration = 0;
        jaimeSpeechTimer = 12;
        jaimeSpeechVisible = false;
        jaimeSpeechDuration = 0;
        if (jaimeSpeechMesh) { scene.remove(jaimeSpeechMesh); jaimeSpeechMesh = null; }

        // Initialize NPC speech timers (staggered so they don't all talk at once)
        npcSpeechMeshes = [];
        npcSpeechTimers = [];
        npcSpeechDurations = [];
        npcSpeechVisible = [];
        for (var j = 0; j < npcModels.length; j++) {
            npcSpeechMeshes.push(null);
            npcSpeechTimers.push(5 + j * 3 + Math.random() * 5); // staggered: 5-10s, 8-13s, etc.
            npcSpeechDurations.push(0);
            npcSpeechVisible.push(false);
        }

        // Reset direction arrow
        hasDeliveredOnce = false;

        // Position camera behind the player, facing Francisco
        window.GAME.Camera.setOrbitAngle(Math.PI);

        // Show HUD
        window.GAME.UI.showHUD();
        gameActive = true;

        // Start tutorial
        startTutorial();

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
        var moveMag = 0;

        if (window.GAME.UI.isTouchDevice()) {
            // Tap-to-move: get target, compute direction to it
            var tapTarget = window.GAME.UI.getTapTarget();
            if (tapTarget.active) {
                var tdx = tapTarget.x - playerModel.position.x;
                var tdz = tapTarget.z - playerModel.position.z;
                var tDist = Math.sqrt(tdx * tdx + tdz * tdz);

                if (tDist > 0.5) {
                    // Normalize direction — feed directly as world-space input
                    // (bypass camera-relative transform by setting cameraYaw to 0)
                    input = { x: tdx / tDist, z: tdz / tDist };
                    moveMag = 1;

                    // Show target marker
                    if (tapTargetMarker) {
                        tapTargetMarker.visible = true;
                        tapTargetMarker.position.set(tapTarget.x, 0.05, tapTarget.z);
                        var pulse = 0.8 + Math.sin(state.elapsedTime * 6) * 0.2;
                        tapTargetMarker.scale.set(pulse, pulse, pulse);
                    }
                } else {
                    // Reached target
                    window.GAME.UI.clearTapTarget();
                    input = { x: 0, z: 0 };
                    if (tapTargetMarker) tapTargetMarker.visible = false;
                }
            } else {
                input = { x: 0, z: 0 };
                if (tapTargetMarker) tapTargetMarker.visible = false;
            }
        } else {
            input = getKeyboardInput();
        }

        // Get camera yaw for movement direction
        // For tap-to-move, input is already in world space so use yaw=0
        var cameraYaw = window.GAME.UI.isTouchDevice() ? 0 : window.GAME.Camera.getYaw();

        // Update player movement
        window.GAME.Mechanics.updatePlayerMovement(
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

        // Francisco speech bubbles
        updateFranciscoSpeech(dt);

        // ---- JAIME SPAWN & UPDATE ----
        if (!jaimeModel && state.elapsedTime >= 20 && !state.jaimeSpawned) {
            // Spawn Jaime near front door
            jaimeModel = window.GAME.Characters.createJaime();
            jaimeModel.position.set(0, 0, restaurantData.DEPTH / 2 - 2);
            jaimeModel.rotation.y = Math.PI; // face into restaurant
            scene.add(jaimeModel);
            state.jaimeSpawned = true;
        }

        if (jaimeModel) {
            var jaimeDist = window.GAME.Mechanics.updateJaime(
                jaimeModel, playerModel.position, dt
            );
            var jSpeed = window.GAME.Mechanics.getJaimeSpeed();
            window.GAME.Characters.animateWalk(jaimeModel, dt, jSpeed);
            window.GAME.Characters.animateIdle(jaimeModel, state.elapsedTime);
        }

        // Jaime speech bubbles
        updateJaimeSpeech(dt);

        // NPC speech bubbles
        updateNPCSpeech(dt);

        // Tutorial
        updateTutorial(dt);

        // Direction arrow
        updateDirectionArrow(playerModel.position, state);

        // Track if player has delivered (to hide arrow after first delivery)
        if (state.lastTipFlashTimer > 0 && !hasDeliveredOnce) {
            hasDeliveredOnce = true;
        }

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

        // Check catch (Francisco or Jaime)
        var jaimePos = jaimeModel ? jaimeModel.position : null;
        var caughtBy = window.GAME.Mechanics.checkCatch(playerModel.position, franciscoModel.position, jaimePos);
        if (caughtBy) {
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

        // Hide tap target, speech bubbles, direction arrow, tutorial
        if (tapTargetMarker) tapTargetMarker.visible = false;
        if (directionArrow) directionArrow.visible = false;
        if (franciscoSpeechMesh) { scene.remove(franciscoSpeechMesh); franciscoSpeechMesh = null; }
        franciscoSpeechVisible = false;
        if (jaimeSpeechMesh) { scene.remove(jaimeSpeechMesh); jaimeSpeechMesh = null; }
        jaimeSpeechVisible = false;
        for (var i = 0; i < npcSpeechMeshes.length; i++) {
            if (npcSpeechMeshes[i]) { scene.remove(npcSpeechMeshes[i]); npcSpeechMeshes[i] = null; }
            npcSpeechVisible[i] = false;
        }
        dismissTutorial();

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
