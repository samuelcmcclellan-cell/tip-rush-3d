/* ============================================
   restaurant.js — 3D Steak 'n' Shake Interior
   Builds the complete restaurant environment
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.Restaurant = (function() {
    // Restaurant dimensions
    const WIDTH = 30;
    const DEPTH = 45;
    const WALL_HEIGHT = 8;

    // Store obstacle bounding boxes for collision
    let obstacles = [];
    // Store table/booth positions for order system
    let tablePositions = [];
    // Food pickup zone bounds
    let pickupZone = { minX: -6, maxX: 6, minZ: -DEPTH/2 + 2, maxZ: -DEPTH/2 + 5 };
    // Milkshake spawn positions along counter front
    let milkshakeSpots = [];

    // Lights that can be modified for tension effects
    let pendantLights = [];

    /**
     * Create a canvas texture with text
     */
    function createTextTexture(text, width, height, fontSize, color, bgColor, fontFamily) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.fillStyle = color || '#fff';
        ctx.font = (fontSize || 24) + 'px ' + (fontFamily || 'Arial');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    /**
     * Create the checkerboard tile texture for the counter area
     */
    function createCheckerboardTexture(tilesX, tilesY) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const tileW = size / tilesX;
        const tileH = size / tilesY;
        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? '#222' : '#eee';
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            }
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    /**
     * Create the cream tile floor texture with grid lines
     */
    function createTileFloorTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Cream base
        ctx.fillStyle = '#F5F0E1';
        ctx.fillRect(0, 0, size, size);
        // Grid lines
        ctx.strokeStyle = '#E0D8C8';
        ctx.lineWidth = 2;
        const tileSize = size / 4;
        for (let i = 0; i <= 4; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tileSize, 0);
            ctx.lineTo(i * tileSize, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * tileSize);
            ctx.lineTo(size, i * tileSize);
            ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 9);
        return tex;
    }

    /**
     * Build the entire restaurant and add it to the scene
     */
    function build(scene) {
        obstacles = [];
        tablePositions = [];
        pendantLights = [];
        milkshakeSpots = [];

        const group = new THREE.Group();

        // ---- FLOOR ----
        // Main dining floor
        const floorTex = createTileFloorTexture();
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTex,
            roughness: 0.6,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(WIDTH, DEPTH),
            floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(floor);

        // Checkerboard strip near counter area
        const checkerTex = createCheckerboardTexture(16, 4);
        const checkerMat = new THREE.MeshStandardMaterial({
            map: checkerTex,
            roughness: 0.5,
            metalness: 0.1
        });
        const checkerStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(WIDTH - 4, 5),
            checkerMat
        );
        checkerStrip.rotation.x = -Math.PI / 2;
        checkerStrip.position.set(0, 0.01, -DEPTH / 2 + 6);
        group.add(checkerStrip);

        // ---- CEILING ----
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(WIDTH, DEPTH),
            ceilingMat
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = WALL_HEIGHT;
        group.add(ceiling);

        // ---- WALLS ----
        buildWalls(group);

        // ---- COUNTER / BAR ----
        buildCounter(group);

        // ---- BOOTHS ----
        buildBooths(group);

        // ---- CENTER TABLES ----
        buildCenterTables(group);

        // ---- LIGHTING ----
        buildLighting(scene, group);

        // ---- PROPS ----
        buildProps(group);

        // ---- FOOD PICKUP ZONE (green glow on floor) ----
        buildPickupZone(group);

        scene.add(group);

        // Calculate milkshake spawn spots along counter front
        for (let i = 0; i < 5; i++) {
            milkshakeSpots.push({
                x: -6 + (i * 3),
                z: -DEPTH / 2 + 7
            });
        }

        return {
            obstacles: obstacles,
            tablePositions: tablePositions,
            pickupZone: pickupZone,
            milkshakeSpots: milkshakeSpots,
            pendantLights: pendantLights,
            WIDTH: WIDTH,
            DEPTH: DEPTH
        };
    }

    function buildWalls(group) {
        // Materials
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.8 });
        const creamWallMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E7, roughness: 0.9 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x3a2515, roughness: 0.7 });

        var wallConfigs = [
            // Back wall
            { w: WIDTH, pos: [0, WALL_HEIGHT/2, -DEPTH/2], rot: [0, 0, 0] },
            // Front wall
            { w: WIDTH, pos: [0, WALL_HEIGHT/2, DEPTH/2], rot: [0, Math.PI, 0] },
            // Left wall
            { w: DEPTH, pos: [-WIDTH/2, WALL_HEIGHT/2, 0], rot: [0, Math.PI/2, 0] },
            // Right wall
            { w: DEPTH, pos: [WIDTH/2, WALL_HEIGHT/2, 0], rot: [0, -Math.PI/2, 0] }
        ];

        wallConfigs.forEach(function(cfg) {
            // Lower dark wood panel
            var lower = new THREE.Mesh(
                new THREE.BoxGeometry(cfg.w, 3, 0.3),
                darkWoodMat
            );
            lower.position.set(cfg.pos[0], 1.5, cfg.pos[2]);
            lower.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
            lower.castShadow = true;
            lower.receiveShadow = true;
            group.add(lower);

            // Upper cream wall
            var upper = new THREE.Mesh(
                new THREE.BoxGeometry(cfg.w, WALL_HEIGHT - 3, 0.3),
                creamWallMat
            );
            upper.position.set(cfg.pos[0], 3 + (WALL_HEIGHT - 3) / 2, cfg.pos[2]);
            upper.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
            group.add(upper);

            // Baseboard trim
            var trim = new THREE.Mesh(
                new THREE.BoxGeometry(cfg.w, 0.2, 0.35),
                trimMat
            );
            trim.position.set(cfg.pos[0], 0.1, cfg.pos[2]);
            trim.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
            group.add(trim);
        });

        // Collision boxes for walls
        obstacles.push({ minX: -WIDTH/2, maxX: WIDTH/2, minZ: -DEPTH/2 - 0.5, maxZ: -DEPTH/2 + 0.5 }); // back
        obstacles.push({ minX: -WIDTH/2, maxX: WIDTH/2, minZ: DEPTH/2 - 0.5, maxZ: DEPTH/2 + 0.5 }); // front
        obstacles.push({ minX: -WIDTH/2 - 0.5, maxX: -WIDTH/2 + 0.5, minZ: -DEPTH/2, maxZ: DEPTH/2 }); // left
        obstacles.push({ minX: WIDTH/2 - 0.5, maxX: WIDTH/2 + 0.5, minZ: -DEPTH/2, maxZ: DEPTH/2 }); // right

        // Front wall glass door (centered)
        var glassMat = new THREE.MeshStandardMaterial({
            color: 0x88BBDD,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.8
        });
        var glassDoor = new THREE.Mesh(
            new THREE.BoxGeometry(4, 6, 0.15),
            glassMat
        );
        glassDoor.position.set(0, 3, DEPTH / 2 - 0.1);
        group.add(glassDoor);

        // Kitchen door on back wall
        var steelMat = new THREE.MeshStandardMaterial({ color: 0xA8A8A8, roughness: 0.3, metalness: 0.7 });
        // Left door panel
        var kitchenDoorL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5.5, 0.2), steelMat);
        kitchenDoorL.position.set(-1.3, 2.75, -DEPTH / 2 + 0.2);
        group.add(kitchenDoorL);
        // Right door panel
        var kitchenDoorR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 5.5, 0.2), steelMat);
        kitchenDoorR.position.set(1.3, 2.75, -DEPTH / 2 + 0.2);
        group.add(kitchenDoorR);
        // Small window on doors
        var windowMat = new THREE.MeshStandardMaterial({ color: 0xCCDDEE, transparent: true, opacity: 0.5 });
        var doorWindowL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.05), windowMat);
        doorWindowL.position.set(-1.3, 4, -DEPTH / 2 + 0.35);
        group.add(doorWindowL);
        var doorWindowR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.05), windowMat);
        doorWindowR.position.set(1.3, 4, -DEPTH / 2 + 0.35);
        group.add(doorWindowR);
        // "KITCHEN" text above door
        var kitchenTex = createTextTexture('KITCHEN', 256, 64, 36, '#fff', 'rgba(0,0,0,0)');
        var kitchenSign = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 1),
            new THREE.MeshBasicMaterial({ map: kitchenTex, transparent: true })
        );
        kitchenSign.position.set(0, 6.2, -DEPTH / 2 + 0.4);
        group.add(kitchenSign);
    }

    function buildCounter(group) {
        var counterTop = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
        var counterBase = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });

        // Counter top
        var top = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 2.5), counterTop);
        top.position.set(0, 3.2, -DEPTH / 2 + 4);
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // Counter base
        var base = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 2.2), counterBase);
        base.position.set(0, 1.5, -DEPTH / 2 + 4);
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Logo on front of counter
        var logoTex = createTextTexture("STEAK 'N' SHAKE", 512, 128, 48, '#fff', '#CC0000');
        var logoPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 2),
            new THREE.MeshBasicMaterial({ map: logoTex })
        );
        logoPlane.position.set(0, 1.8, -DEPTH / 2 + 5.15);
        group.add(logoPlane);

        // Counter collision
        obstacles.push({
            minX: -12, maxX: 12,
            minZ: -DEPTH / 2 + 2.5, maxZ: -DEPTH / 2 + 5.5
        });

        // Bar stools (7 evenly spaced)
        var stoolChromeMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.2, metalness: 0.8 });
        var stoolRedMat = new THREE.MeshStandardMaterial({ color: 0xCC2222, roughness: 0.5 });

        for (var i = 0; i < 7; i++) {
            var sx = -9 + i * 3;
            var sz = -DEPTH / 2 + 6.5;

            // Pedestal
            var pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.8, 8), stoolChromeMat);
            pedestal.position.set(sx, 0.9, sz);
            pedestal.castShadow = true;
            group.add(pedestal);

            // Cushion
            var cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), stoolRedMat);
            cushion.position.set(sx, 1.95, sz);
            cushion.castShadow = true;
            group.add(cushion);
        }
    }

    function buildBooths(group) {
        var seatMat = new THREE.MeshStandardMaterial({ color: 0x8B1A1A, roughness: 0.6 });
        var tableMat = new THREE.MeshStandardMaterial({ color: 0xD4A76A, roughness: 0.4 });
        var legMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.5 });

        // 3 booths on left wall, 3 on right wall
        var sides = [
            { x: -WIDTH / 2 + 2.5, facing: 1 },  // left wall
            { x: WIDTH / 2 - 2.5, facing: -1 }    // right wall
        ];

        var boothSpacing = 10;
        var startZ = -8;

        sides.forEach(function(side) {
            for (var i = 0; i < 3; i++) {
                var bz = startZ + i * boothSpacing;
                var bx = side.x;

                // Back seat (against wall)
                var backSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 4), seatMat);
                backSeat.position.set(bx, 1.5, bz);
                backSeat.castShadow = true;
                group.add(backSeat);

                // Table
                var table = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 3.5), tableMat);
                table.position.set(bx + side.facing * 2, 2.2, bz);
                table.castShadow = true;
                table.receiveShadow = true;
                group.add(table);

                // Table leg
                var leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), legMat);
                leg.position.set(bx + side.facing * 2, 1.1, bz);
                group.add(leg);

                // Front seat (facing wall)
                var frontSeat = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 4), seatMat);
                frontSeat.position.set(bx + side.facing * 3.8, 1.5, bz);
                frontSeat.castShadow = true;
                group.add(frontSeat);

                // Condiments (ketchup + mustard)
                var ketchup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xCC0000 }));
                ketchup.position.set(bx + side.facing * 2 - 0.3, 2.55, bz);
                group.add(ketchup);

                var mustard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0xDDCC00 }));
                mustard.position.set(bx + side.facing * 2 + 0.3, 2.53, bz);
                group.add(mustard);

                // Collision box for entire booth
                var boothMinX = Math.min(bx - 0.5, bx + side.facing * 3.8 - 0.5);
                var boothMaxX = Math.max(bx + 0.5, bx + side.facing * 3.8 + 0.5);
                obstacles.push({
                    minX: boothMinX,
                    maxX: boothMaxX,
                    minZ: bz - 2.2,
                    maxZ: bz + 2.2
                });

                // Table position for orders (center of the table top)
                tablePositions.push({
                    x: bx + side.facing * 2,
                    z: bz,
                    y: 2.5,
                    type: 'booth'
                });
            }
        });
    }

    function buildCenterTables(group) {
        var tableMat = new THREE.MeshStandardMaterial({ color: 0x8B6E4E, roughness: 0.5 });
        var legMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.5 });
        var chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.6 });
        var chairCushionMat = new THREE.MeshStandardMaterial({ color: 0xCC2222, roughness: 0.5 });

        // 2 columns of 3 tables
        var cols = [-4, 4];
        var rows = [-6, 4, 14];

        cols.forEach(function(cx) {
            rows.forEach(function(rz) {
                // Table top
                var top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2.5), tableMat);
                top.position.set(cx, 2.2, rz);
                top.castShadow = true;
                top.receiveShadow = true;
                group.add(top);

                // 4 metal legs
                [[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]].forEach(function(lp) {
                    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), legMat);
                    leg.position.set(cx + lp[0], 1.1, rz + lp[1]);
                    group.add(leg);
                });

                // 4 chairs
                var chairOffsets = [
                    { dx: -2.2, dz: 0, ry: Math.PI / 2 },
                    { dx: 2.2, dz: 0, ry: -Math.PI / 2 },
                    { dx: 0, dz: -1.8, ry: 0 },
                    { dx: 0, dz: 1.8, ry: Math.PI }
                ];

                chairOffsets.forEach(function(co) {
                    // Seat
                    var seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1), chairSeatMat);
                    seat.position.set(cx + co.dx, 1.3, rz + co.dz);
                    group.add(seat);
                    // Cushion
                    var cushion = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), chairCushionMat);
                    cushion.position.set(cx + co.dx, 1.4, rz + co.dz);
                    group.add(cushion);
                    // Back
                    var back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.15), chairSeatMat);
                    var backDz = co.dz + Math.sin(co.ry + Math.PI / 2) * -0.5;
                    var backDx = co.dx + Math.cos(co.ry + Math.PI / 2) * 0.5;
                    back.position.set(cx + backDx, 2, rz + backDz);
                    back.rotation.y = co.ry;
                    group.add(back);
                    // Legs
                    for (var li = 0; li < 4; li++) {
                        var lx = (li % 2 === 0 ? -0.35 : 0.35);
                        var lz = (li < 2 ? -0.35 : 0.35);
                        var cleg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 4), legMat);
                        cleg.position.set(cx + co.dx + lx, 0.65, rz + co.dz + lz);
                        group.add(cleg);
                    }
                });

                // Condiments on table
                var ketchup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xCC0000 }));
                ketchup.position.set(cx - 0.3, 2.55, rz);
                group.add(ketchup);
                var mustard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0xDDCC00 }));
                mustard.position.set(cx + 0.3, 2.53, rz);
                group.add(mustard);

                // Collision box
                obstacles.push({
                    minX: cx - 2.5,
                    maxX: cx + 2.5,
                    minZ: rz - 2,
                    maxZ: rz + 2
                });

                // Table position for orders
                tablePositions.push({
                    x: cx,
                    z: rz,
                    y: 2.5,
                    type: 'table'
                });
            });
        });
    }

    function buildLighting(scene, group) {
        // Warm ambient light
        var ambient = new THREE.AmbientLight(0xFFE4B5, 0.4);
        scene.add(ambient);

        // Hemisphere light for general fill
        var hemi = new THREE.HemisphereLight(0xFFE4B5, 0x443322, 0.3);
        scene.add(hemi);

        // Overhead pendant lights
        var pendantPositions = [
            { x: 0, z: -DEPTH / 2 + 5 },   // over counter
            { x: -4, z: -6 },  { x: 4, z: -6 },
            { x: -4, z: 4 },   { x: 4, z: 4 },
            { x: -4, z: 14 },  { x: 4, z: 14 },
            { x: 0, z: 9 }    // center
        ];

        pendantPositions.forEach(function(pp) {
            // Light fixture visual
            var fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.7 });
            var fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.4, 12), fixtureMat);
            fixture.position.set(pp.x, WALL_HEIGHT - 0.3, pp.z);
            group.add(fixture);

            // Cord
            var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), fixtureMat);
            cord.position.set(pp.x, WALL_HEIGHT - 0.8, pp.z);
            group.add(cord);

            // Point light
            var light = new THREE.PointLight(0xFFE4B5, 0.8, 18);
            light.position.set(pp.x, WALL_HEIGHT - 1.5, pp.z);
            light.castShadow = true;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.radius = 4;
            scene.add(light);

            pendantLights.push(light);
        });

        // Subtle red accent lights near booths
        [-WIDTH / 2 + 3, WIDTH / 2 - 3].forEach(function(bx) {
            var accent = new THREE.PointLight(0xFF4444, 0.15, 10);
            accent.position.set(bx, 4, 0);
            scene.add(accent);
        });
    }

    function buildProps(group) {
        // Jukebox in front-right corner
        var jukeboxBody = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.5 });
        var jukeboxAccent = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, metalness: 0.5 });
        var jukeboxGlass = new THREE.MeshStandardMaterial({
            color: 0x4488FF,
            transparent: true,
            opacity: 0.4,
            emissive: 0x2244AA,
            emissiveIntensity: 0.3
        });

        // Body
        var jbBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.5, 1.2), jukeboxBody);
        jbBody.position.set(WIDTH / 2 - 2, 1.75, DEPTH / 2 - 2);
        jbBody.castShadow = true;
        group.add(jbBody);

        // Rounded top
        var jbTop = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), jukeboxAccent);
        jbTop.position.set(WIDTH / 2 - 2, 3.5, DEPTH / 2 - 2);
        group.add(jbTop);

        // Glass front
        var jbGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), jukeboxGlass);
        jbGlass.position.set(WIDTH / 2 - 2, 2.5, DEPTH / 2 - 1.35);
        group.add(jbGlass);

        // Collision for jukebox
        obstacles.push({
            minX: WIDTH / 2 - 3, maxX: WIDTH / 2 - 1,
            minZ: DEPTH / 2 - 3, maxZ: DEPTH / 2 - 1
        });

        // "PLEASE WAIT TO BE SEATED" sign near front door
        var signTex = createTextTexture('PLEASE WAIT\nTO BE SEATED', 256, 128, 28, '#333', '#FFF8E7');
        var signMat = new THREE.MeshBasicMaterial({ map: signTex });
        var signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), signMat);
        signMesh.position.set(-4, 3.5, DEPTH / 2 - 1);
        group.add(signMesh);

        // Sign stand
        var standMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.3, metalness: 0.6 });
        var stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), standMat);
        stand.position.set(-4, 1.5, DEPTH / 2 - 1);
        group.add(stand);
        var standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), standMat);
        standBase.position.set(-4, 0.05, DEPTH / 2 - 1);
        group.add(standBase);
    }

    function buildPickupZone(group) {
        // Green glow zone on the floor near the kitchen counter
        var glowMat = new THREE.MeshBasicMaterial({
            color: 0x00FF44,
            transparent: true,
            opacity: 0.2
        });
        var glowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 3),
            glowMat
        );
        glowPlane.rotation.x = -Math.PI / 2;
        glowPlane.position.set(0, 0.02, -DEPTH / 2 + 3.5);
        group.add(glowPlane);

        // Pulsing glow stored for animation
        window.GAME._pickupGlow = glowPlane;
    }

    return {
        build: build
    };
})();
