/* ============================================
   camera.js — GTA-style Third-Person Camera
   Smooth follow, orbit controls, wall collision
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.Camera = (function() {
    var camera = null;
    var targetPlayer = null;

    // Camera orbit settings
    var orbitAngle = 0;           // Horizontal orbit angle (radians)
    var orbitPitch = 0.35;        // Vertical pitch (radians, ~20° — shallower for more forward visibility)
    var orbitDistance = 9;         // Distance from player (tighter for indoor space)
    var minDistance = 5;
    var maxDistance = 16;
    var smoothFactor = 0.12;

    // Camera offset when at default position
    var heightOffset = 8;

    // Mouse drag state
    var isDragging = false;
    var lastMouseX = 0;
    var lastMouseY = 0;
    var mouseSensitivity = 0.005;

    // Camera shake
    var shakeIntensity = 0;
    var shakeDecay = 5;

    // Raycaster for wall collision
    var raycaster = new THREE.Raycaster();

    // Collision meshes (set from restaurant data)
    var wallMeshes = [];

    // Track if mobile (auto-follow behind player)
    var isMobile = false;
    var autoFollowAngle = 0;

    /**
     * Initialize camera system
     */
    function init(threeCamera, isTouchDevice) {
        camera = threeCamera;
        isMobile = isTouchDevice;

        // Set initial camera position
        camera.position.set(0, heightOffset, orbitDistance);
        camera.lookAt(0, 1, 0);

        // Mouse controls
        if (!isMobile) {
            document.addEventListener('mousedown', onMouseDown);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('wheel', onWheel, { passive: false });

            // Prevent right-click context menu
            document.addEventListener('contextmenu', function(e) {
                if (isDragging) e.preventDefault();
            });
        }
    }

    function onMouseDown(e) {
        // Right-click or middle-click to orbit
        if (e.button === 2 || e.button === 1) {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            e.preventDefault();
        }
    }

    function onMouseMove(e) {
        if (!isDragging) return;
        var dx = e.clientX - lastMouseX;
        var dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        orbitAngle -= dx * mouseSensitivity;
        orbitPitch = Math.max(0.1, Math.min(1.2, orbitPitch + dy * mouseSensitivity));
    }

    function onMouseUp(e) {
        if (e.button === 2 || e.button === 1) {
            isDragging = false;
        }
    }

    function onWheel(e) {
        e.preventDefault();
        orbitDistance += e.deltaY * 0.01;
        orbitDistance = Math.max(minDistance, Math.min(maxDistance, orbitDistance));
    }

    /**
     * Set wall meshes for camera collision detection
     */
    function setWallMeshes(meshes) {
        wallMeshes = meshes;
    }

    /**
     * Update camera position to follow player
     */
    function update(player, dt, franciscoDistance) {
        if (!camera || !player) return;

        // On mobile, auto-follow behind player's movement direction
        if (isMobile) {
            // Smoothly rotate to behind the player
            var targetAutoAngle = player.rotation.y + Math.PI;
            var angleDiff = targetAutoAngle - autoFollowAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            autoFollowAngle += angleDiff * dt * 2;
            orbitAngle = autoFollowAngle;
        }

        // Calculate desired camera position
        var horizontalDist = orbitDistance * Math.cos(orbitPitch);
        var verticalDist = orbitDistance * Math.sin(orbitPitch);

        var desiredX = player.position.x - Math.sin(orbitAngle) * horizontalDist;
        var desiredZ = player.position.z - Math.cos(orbitAngle) * horizontalDist;
        var desiredY = player.position.y + verticalDist;

        // Clamp Y above floor
        desiredY = Math.max(2, Math.min(6.5, desiredY));

        // Camera shake when Francisco is close
        if (franciscoDistance !== undefined && franciscoDistance < 5) {
            var shakeAmount = (5 - franciscoDistance) * 0.04;
            desiredX += (Math.random() - 0.5) * shakeAmount;
            desiredY += (Math.random() - 0.5) * shakeAmount * 0.5;
            desiredZ += (Math.random() - 0.5) * shakeAmount;
        }

        // Smooth follow (lerp)
        var lerpFactor = 1 - Math.pow(1 - smoothFactor, dt * 60);
        camera.position.x += (desiredX - camera.position.x) * lerpFactor;
        camera.position.y += (desiredY - camera.position.y) * lerpFactor;
        camera.position.z += (desiredZ - camera.position.z) * lerpFactor;

        // Clamp camera within restaurant bounds (with padding)
        var halfW = 14;
        var halfD = 22;
        camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
        camera.position.z = Math.max(-halfD, Math.min(halfD, camera.position.z));

        // Look at player (slightly above head)
        var lookTarget = new THREE.Vector3(
            player.position.x,
            player.position.y + 2.0,
            player.position.z
        );
        camera.lookAt(lookTarget);
    }

    /**
     * Get the camera's Y-axis rotation (yaw) for movement direction calculation
     */
    function getYaw() {
        return orbitAngle;
    }

    /**
     * Get the camera reference
     */
    function getCamera() {
        return camera;
    }

    /**
     * Trigger camera shake
     */
    function shake(intensity) {
        shakeIntensity = Math.max(shakeIntensity, intensity);
    }

    /**
     * Reset orbit angle (e.g. when starting a new game)
     */
    function setOrbitAngle(angle) {
        orbitAngle = angle;
        autoFollowAngle = angle;
    }

    /**
     * Clean up event listeners
     */
    function dispose() {
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('wheel', onWheel);
    }

    return {
        init: init,
        update: update,
        getYaw: getYaw,
        getCamera: getCamera,
        shake: shake,
        setOrbitAngle: setOrbitAngle,
        setWallMeshes: setWallMeshes,
        dispose: dispose
    };
})();
