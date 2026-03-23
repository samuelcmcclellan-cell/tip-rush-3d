/* ============================================
   mechanics.js — Food Delivery, Tips, Orders,
   Milkshake Powerup, Collision Detection
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.Mechanics = (function() {

    // Game state
    var state = {
        score: 0,
        elapsedTime: 0,
        difficulty: 0,
        carryingFood: false,
        milkshakeBoost: false,
        milkshakeTimer: 0,
        milkshakeBoostDuration: 5,
        orders: [],
        tips: [],
        activeMilkshake: null,
        milkshakeSpawnTimer: 0,
        orderSpawnTimer: 0,
        maxOrders: 4,
        initialOrdersSpawned: false,
        franciscoStuckTime: 0,
        franciscoLastPos: { x: 0, z: 0 },
        playerSpeed: 14,
        franciscoBaseSpeed: 6.5,
        franciscoSpeedIncrease: 0.7,
        franciscoMaxSpeed: 16,
        gameOver: false,
        friscoMeltCount: 0
    };

    var restaurantData = null;
    var scene = null;

    // Order type definitions
    var ORDER_TYPES = [
        { name: 'Burger', chance: 0.6, tip: 2, color: 0xFF8800, label: '🍔 $2' },
        { name: 'Shake Combo', chance: 0.25, tip: 5, color: 0xFF8800, label: '🍔🥤 $5' },
        { name: 'FRISCO MELT', chance: 0.15, tip: 10, color: 0xFFD700, label: '⭐$10' }
    ];

    /**
     * Initialize mechanics with restaurant data
     */
    function init(restData, sceneRef) {
        restaurantData = restData;
        scene = sceneRef;
        reset();
    }

    /**
     * Reset all state for a new game
     */
    function reset() {
        // Clean up existing 3D objects
        state.orders.forEach(function(o) { if (o.group) scene.remove(o.group); });
        state.tips.forEach(function(t) { if (t.mesh) scene.remove(t.mesh); });
        if (state.activeMilkshake && state.activeMilkshake.group) {
            scene.remove(state.activeMilkshake.group);
        }

        state.score = 0;
        state.elapsedTime = 0;
        state.difficulty = 0;
        state.carryingFood = false;
        state.milkshakeBoost = false;
        state.milkshakeTimer = 0;
        state.orders = [];
        state.tips = [];
        state.activeMilkshake = null;
        state.milkshakeSpawnTimer = 5; // first milkshake after 5 sec
        state.orderSpawnTimer = 2;
        state.initialOrdersSpawned = false;
        state.franciscoStuckTime = 0;
        state.franciscoLastPos = { x: 0, z: 0 };
        state.gameOver = false;
        state.friscoMeltCount = 0;
    }

    /**
     * AABB collision check
     */
    function aabbOverlap(a, b) {
        return a.minX < b.maxX && a.maxX > b.minX &&
               a.minZ < b.maxZ && a.maxZ > b.minZ;
    }

    /**
     * Check if a position collides with any obstacle
     * @param {number} x - position x
     * @param {number} z - position z
     * @param {number} radius - half-width of the character's bounding box
     * @returns {boolean} true if collision
     */
    function checkCollision(x, z, radius) {
        var charBox = {
            minX: x - radius,
            maxX: x + radius,
            minZ: z - radius,
            maxZ: z + radius
        };
        for (var i = 0; i < restaurantData.obstacles.length; i++) {
            if (aabbOverlap(charBox, restaurantData.obstacles[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Move a character with collision (slide along walls)
     * @returns {object} new position {x, z}
     */
    function moveWithCollision(currentX, currentZ, dx, dz, radius) {
        var newX = currentX + dx;
        var newZ = currentZ + dz;

        // Clamp to restaurant bounds
        var halfW = restaurantData.WIDTH / 2 - radius - 0.3;
        var halfD = restaurantData.DEPTH / 2 - radius - 0.3;

        // Try full movement
        if (!checkCollision(newX, newZ, radius)) {
            return {
                x: Math.max(-halfW, Math.min(halfW, newX)),
                z: Math.max(-halfD, Math.min(halfD, newZ))
            };
        }

        // Try X only
        if (!checkCollision(newX, currentZ, radius)) {
            return {
                x: Math.max(-halfW, Math.min(halfW, newX)),
                z: currentZ
            };
        }

        // Try Z only
        if (!checkCollision(currentX, newZ, radius)) {
            return {
                x: currentX,
                z: Math.max(-halfD, Math.min(halfD, newZ))
            };
        }

        // Can't move
        return { x: currentX, z: currentZ };
    }

    /**
     * Update player movement based on input
     */
    function updatePlayerMovement(player, inputX, inputZ, dt, cameraYaw) {
        if (state.gameOver) return;

        var speed = state.playerSpeed;
        if (state.milkshakeBoost) speed *= 1.8;

        // Transform input relative to camera direction
        var cos = Math.cos(cameraYaw);
        var sin = Math.sin(cameraYaw);
        var worldX = inputX * cos + inputZ * sin;
        var worldZ = -inputX * sin + inputZ * cos;

        var mag = Math.sqrt(worldX * worldX + worldZ * worldZ);
        if (mag > 1) {
            worldX /= mag;
            worldZ /= mag;
        }

        var dx = worldX * speed * dt;
        var dz = worldZ * speed * dt;

        if (mag > 0.1) {
            var newPos = moveWithCollision(player.position.x, player.position.z, dx, dz, 0.5);
            player.position.x = newPos.x;
            player.position.z = newPos.z;

            // Rotate player to face movement direction (smooth)
            var targetAngle = Math.atan2(worldX, worldZ);
            var currentAngle = player.rotation.y;
            var angleDiff = targetAngle - currentAngle;
            // Normalize angle
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            player.rotation.y += angleDiff * Math.min(1, dt * 10);
        }

        return mag;
    }

    /**
     * Update Francisco AI movement
     */
    function updateFrancisco(francisco, playerPos, dt) {
        if (state.gameOver) return;

        var speed = Math.min(
            state.franciscoMaxSpeed,
            state.franciscoBaseSpeed + state.difficulty * state.franciscoSpeedIncrease
        );

        // Direction to player
        var dx = playerPos.x - francisco.position.x;
        var dz = playerPos.z - francisco.position.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.1) {
            dx /= dist;
            dz /= dist;

            var newPos = moveWithCollision(
                francisco.position.x, francisco.position.z,
                dx * speed * dt, dz * speed * dt,
                0.6
            );

            // Check if stuck
            var movedDist = Math.sqrt(
                Math.pow(newPos.x - francisco.position.x, 2) +
                Math.pow(newPos.z - francisco.position.z, 2)
            );

            if (movedDist < 0.05 * dt) {
                state.franciscoStuckTime += dt;
            } else {
                state.franciscoStuckTime = 0;
            }

            // Unstick: try perpendicular direction
            if (state.franciscoStuckTime > 0.25) {
                var perpX = -dz;
                var perpZ = dx;

                // Try both perpendicular directions
                var tryPos1 = moveWithCollision(
                    francisco.position.x, francisco.position.z,
                    perpX * speed * dt * 2, perpZ * speed * dt * 2, 0.6
                );
                var tryPos2 = moveWithCollision(
                    francisco.position.x, francisco.position.z,
                    -perpX * speed * dt * 2, -perpZ * speed * dt * 2, 0.6
                );

                var dist1 = Math.sqrt(
                    Math.pow(tryPos1.x - francisco.position.x, 2) +
                    Math.pow(tryPos1.z - francisco.position.z, 2)
                );
                var dist2 = Math.sqrt(
                    Math.pow(tryPos2.x - francisco.position.x, 2) +
                    Math.pow(tryPos2.z - francisco.position.z, 2)
                );

                if (dist1 > dist2) {
                    newPos = tryPos1;
                } else {
                    newPos = tryPos2;
                }

                if (dist1 > 0.01 || dist2 > 0.01) {
                    state.franciscoStuckTime = 0;
                }
            }

            francisco.position.x = newPos.x;
            francisco.position.z = newPos.z;

            // Rotate to face player (smooth)
            var targetAngle = Math.atan2(dx, dz);
            var currentAngle = francisco.rotation.y;
            var angleDiff = targetAngle - currentAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            francisco.rotation.y += angleDiff * Math.min(1, dt * 8);
        }

        return dist;
    }

    /**
     * Check if Francisco caught the player (game over)
     */
    function checkCatch(playerPos, franciscoPos) {
        // 55% shrink for fairness
        var catchRadius = 0.5 * 0.55;
        var dx = playerPos.x - franciscoPos.x;
        var dz = playerPos.z - franciscoPos.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        return dist < catchRadius * 2 + 0.3; // combined radii with shrink
    }

    /**
     * Check if player is in the food pickup zone
     */
    function isInPickupZone(playerPos) {
        var pz = restaurantData.pickupZone;
        return playerPos.x >= pz.minX && playerPos.x <= pz.maxX &&
               playerPos.z >= pz.minZ && playerPos.z <= pz.maxZ;
    }

    /**
     * Create a 3D order indicator above a table
     */
    function createOrderIndicator(order) {
        var group = new THREE.Group();
        var isfrisco = order.type.name === 'FRISCO MELT';

        // Bubble sphere
        var bubbleColor = isfrisco ? 0xFFD700 : 0xFF8800;
        var bubbleMat = new THREE.MeshBasicMaterial({
            color: bubbleColor,
            transparent: true,
            opacity: 0.8
        });
        var bubble = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), bubbleMat);
        bubble.position.y = 0;
        group.add(bubble);

        // Text label via canvas
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = isfrisco ? '#FFD700' : '#FF8800';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$' + order.type.tip, 64, 20);
        ctx.font = '16px Arial';
        ctx.fillText(order.type.name, 64, 48);
        var tex = new THREE.CanvasTexture(canvas);
        var label = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.6),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false })
        );
        label.position.y = -0.8;
        group.add(label);

        // Timer bar background
        var timerBg = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        timerBg.position.y = -1.15;
        group.add(timerBg);

        // Timer bar fill (starts green)
        var timerFill = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x33FF33 })
        );
        timerFill.position.y = -1.15;
        timerFill.position.z = 0.01;
        group.add(timerFill);

        // Frisco Melt golden glow
        if (isfrisco) {
            var glow = new THREE.PointLight(0xFFD700, 1, 6);
            glow.position.y = -2;
            group.add(glow);
        }

        group.position.set(order.tablePos.x, order.tablePos.y + 2.5, order.tablePos.z);

        order.group = group;
        order.bubble = bubble;
        order.timerFill = timerFill;

        scene.add(group);
    }

    /**
     * Roll a random order type
     */
    function rollOrderType() {
        var roll = Math.random();
        var cumulative = 0;
        for (var i = 0; i < ORDER_TYPES.length; i++) {
            cumulative += ORDER_TYPES[i].chance;
            if (roll <= cumulative) return ORDER_TYPES[i];
        }
        return ORDER_TYPES[0];
    }

    /**
     * Spawn an order at a random table
     */
    function spawnOrder() {
        if (state.orders.length >= state.maxOrders) return;
        if (!restaurantData || !restaurantData.tablePositions.length) return;

        // Find tables without active orders
        var availableTables = restaurantData.tablePositions.filter(function(tp) {
            return !state.orders.some(function(o) {
                return o.tablePos.x === tp.x && o.tablePos.z === tp.z;
            });
        });

        if (availableTables.length === 0) return;

        var tablePos = availableTables[Math.floor(Math.random() * availableTables.length)];
        var type = rollOrderType();

        var maxTimer = type.name === 'FRISCO MELT'
            ? Math.max(6, 12 - state.difficulty * 0.5)
            : Math.max(8, 15 - state.difficulty * 0.5);

        var order = {
            type: type,
            tablePos: tablePos,
            timer: maxTimer,
            maxTimer: maxTimer,
            group: null,
            bubble: null,
            timerFill: null
        };

        createOrderIndicator(order);
        state.orders.push(order);

        // Track frisco melt count
        if (type.name === 'FRISCO MELT') {
            state.friscoMeltCount++;
        }
    }

    /**
     * Try to pick up food from counter
     */
    function tryPickup(playerPos) {
        if (state.carryingFood) return false;
        if (!isInPickupZone(playerPos)) return false;

        state.carryingFood = true;
        window.GAME.Audio.pickup();
        return true;
    }

    /**
     * Try to deliver food to a table
     */
    function tryDeliver(playerPos) {
        if (!state.carryingFood) return false;

        for (var i = state.orders.length - 1; i >= 0; i--) {
            var order = state.orders[i];
            var dx = playerPos.x - order.tablePos.x;
            var dz = playerPos.z - order.tablePos.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 2.5) {
                // Deliver food
                state.carryingFood = false;
                window.GAME.Audio.deliver();

                // Spawn tip near table
                spawnTip(order.tablePos, order.type.tip);

                // Remove order
                if (order.group) scene.remove(order.group);
                if (order.type.name === 'FRISCO MELT') state.friscoMeltCount--;
                state.orders.splice(i, 1);

                return true;
            }
        }
        return false;
    }

    /**
     * Spawn a collectible tip near a table
     */
    function spawnTip(tablePos, value) {
        var tipGroup = new THREE.Group();

        // Green dollar bill
        var billMat = new THREE.MeshBasicMaterial({
            color: 0x33CC33,
            transparent: true,
            opacity: 0.9
        });
        var bill = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), billMat);
        tipGroup.add(bill);

        // "$" text on bill
        var canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#005500';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$' + value, 32, 16);
        var tex = new THREE.CanvasTexture(canvas);
        var label = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.2),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
        label.position.y = 0.02;
        label.rotation.x = -Math.PI / 2;
        tipGroup.add(label);

        // Glow
        var glowLight = new THREE.PointLight(0x33FF33, 0.5, 3);
        glowLight.position.y = 0.3;
        tipGroup.add(glowLight);

        // Position near the table with slight random offset
        tipGroup.position.set(
            tablePos.x + (Math.random() - 0.5) * 1.5,
            0.5,
            tablePos.z + (Math.random() - 0.5) * 1.5
        );

        scene.add(tipGroup);

        state.tips.push({
            mesh: tipGroup,
            value: value,
            bobTime: Math.random() * Math.PI * 2,
            x: tipGroup.position.x,
            z: tipGroup.position.z
        });
    }

    /**
     * Create 3D milkshake model
     */
    function createMilkshakeModel() {
        var group = new THREE.Group();

        // Cup (white cylinder)
        var cupMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.3 });
        var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.7, 12), cupMat);
        cup.position.y = 0.35;
        group.add(cup);

        // Pink dome top (half sphere)
        var domeMat = new THREE.MeshStandardMaterial({
            color: 0xFF69B4,
            roughness: 0.3,
            emissive: 0xFF69B4,
            emissiveIntensity: 0.2
        });
        var dome = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
        dome.position.y = 0.7;
        group.add(dome);

        // Red straw (angled thin cylinder)
        var strawMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.4 });
        var straw = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), strawMat);
        straw.position.set(0.1, 0.85, 0);
        straw.rotation.z = -0.3;
        group.add(straw);

        // Cherry on top (small red sphere)
        var cherryMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.4 });
        var cherry = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), cherryMat);
        cherry.position.set(0, 0.95, 0);
        group.add(cherry);

        // Pink glow
        var glow = new THREE.PointLight(0xFF69B4, 0.8, 4);
        glow.position.y = 0.5;
        group.add(glow);

        return group;
    }

    /**
     * Spawn a milkshake at a random counter position
     */
    function spawnMilkshake() {
        if (state.activeMilkshake || state.milkshakeBoost) return;
        if (!restaurantData || !restaurantData.milkshakeSpots.length) return;

        var spot = restaurantData.milkshakeSpots[
            Math.floor(Math.random() * restaurantData.milkshakeSpots.length)
        ];

        var model = createMilkshakeModel();
        model.position.set(spot.x, 0.5, spot.z);
        scene.add(model);

        state.activeMilkshake = {
            group: model,
            x: spot.x,
            z: spot.z,
            bobTime: 0
        };
    }

    /**
     * Check if player collected the milkshake
     */
    function checkMilkshakeCollect(playerPos) {
        if (!state.activeMilkshake || state.milkshakeBoost) return false;

        var ms = state.activeMilkshake;
        var dx = playerPos.x - ms.x;
        var dz = playerPos.z - ms.z;
        var dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1.5) {
            // Collect milkshake
            scene.remove(ms.group);
            state.activeMilkshake = null;
            state.milkshakeBoost = true;
            state.milkshakeTimer = state.milkshakeBoostDuration;
            window.GAME.Audio.powerup();
            return true;
        }
        return false;
    }

    /**
     * Check if player collected any tips
     */
    function checkTipCollect(playerPos) {
        var collected = 0;
        for (var i = state.tips.length - 1; i >= 0; i--) {
            var tip = state.tips[i];
            var dx = playerPos.x - tip.x;
            var dz = playerPos.z - tip.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 1.2) {
                state.score += tip.value;
                window.GAME.Audio.collect();
                scene.remove(tip.mesh);
                state.tips.splice(i, 1);
                collected += tip.value;
            }
        }
        return collected;
    }

    /**
     * Main update loop for all mechanics
     */
    function update(dt, playerPos) {
        if (state.gameOver) return;

        state.elapsedTime += dt;
        state.difficulty = Math.floor(state.elapsedTime / 8);

        // Spawn initial orders
        if (!state.initialOrdersSpawned) {
            for (var i = 0; i < 3; i++) spawnOrder();
            state.initialOrdersSpawned = true;
        }

        // Order spawn timer
        var spawnRate = Math.max(2, 5 - state.difficulty * 0.3);
        state.orderSpawnTimer -= dt;
        if (state.orderSpawnTimer <= 0) {
            spawnOrder();
            state.orderSpawnTimer = spawnRate;
        }

        // Update order timers and visuals
        for (var i = state.orders.length - 1; i >= 0; i--) {
            var order = state.orders[i];
            order.timer -= dt;

            // Update timer bar
            if (order.timerFill) {
                var pct = Math.max(0, order.timer / order.maxTimer);
                order.timerFill.scale.x = pct;
                order.timerFill.position.x = -(1 - pct) * 0.5;

                // Color: green to red
                var r = Math.floor((1 - pct) * 255);
                var g = Math.floor(pct * 255);
                order.timerFill.material.color.setRGB(r / 255, g / 255, 0);
            }

            // Pulse bubble
            if (order.bubble) {
                var pulse = 1 + Math.sin(state.elapsedTime * 4) * 0.1;
                order.bubble.scale.set(pulse, pulse, pulse);
            }

            // Bob the indicator
            if (order.group) {
                order.group.position.y = order.tablePos.y + 2.5 + Math.sin(state.elapsedTime * 2) * 0.2;
            }

            // Order expired
            if (order.timer <= 0) {
                if (order.group) scene.remove(order.group);
                if (order.type.name === 'FRISCO MELT') state.friscoMeltCount--;
                state.orders.splice(i, 1);
            }
        }

        // Update tips (bobbing)
        state.tips.forEach(function(tip) {
            tip.bobTime += dt;
            if (tip.mesh) {
                tip.mesh.position.y = 0.5 + Math.sin(tip.bobTime * 3) * 0.15;
                tip.mesh.rotation.y += dt * 1.5;
            }
        });

        // Milkshake spawn timer
        state.milkshakeSpawnTimer -= dt;
        if (state.milkshakeSpawnTimer <= 0 && !state.activeMilkshake && !state.milkshakeBoost) {
            spawnMilkshake();
            state.milkshakeSpawnTimer = 12;
        }

        // Milkshake bobbing animation
        if (state.activeMilkshake && state.activeMilkshake.group) {
            state.activeMilkshake.bobTime += dt;
            state.activeMilkshake.group.position.y = 0.5 + Math.sin(state.activeMilkshake.bobTime * 3) * 0.2;
            state.activeMilkshake.group.rotation.y += dt;
        }

        // Milkshake boost timer
        if (state.milkshakeBoost) {
            state.milkshakeTimer -= dt;
            if (state.milkshakeTimer <= 0) {
                state.milkshakeBoost = false;
                state.milkshakeTimer = 0;
            }
        }

        // Auto-pickup food when in pickup zone
        tryPickup(playerPos);

        // Auto-deliver when near table with order
        tryDeliver(playerPos);

        // Auto-collect tips
        checkTipCollect(playerPos);

        // Auto-collect milkshake
        checkMilkshakeCollect(playerPos);

        // Pulse pickup zone glow
        if (window.GAME._pickupGlow) {
            var glowPulse = 0.15 + Math.sin(state.elapsedTime * 3) * 0.1;
            window.GAME._pickupGlow.material.opacity = state.carryingFood ? 0.05 : glowPulse;
        }
    }

    /**
     * Get current game state for UI
     */
    function getState() {
        return state;
    }

    /**
     * Set game over
     */
    function setGameOver() {
        state.gameOver = true;
    }

    /**
     * Get Francisco's current speed
     */
    function getFranciscoSpeed() {
        return Math.min(
            state.franciscoMaxSpeed,
            state.franciscoBaseSpeed + state.difficulty * state.franciscoSpeedIncrease
        );
    }

    return {
        init: init,
        reset: reset,
        update: update,
        updatePlayerMovement: updatePlayerMovement,
        updateFrancisco: updateFrancisco,
        checkCatch: checkCatch,
        getState: getState,
        setGameOver: setGameOver,
        getFranciscoSpeed: getFranciscoSpeed,
        moveWithCollision: moveWithCollision
    };
})();
