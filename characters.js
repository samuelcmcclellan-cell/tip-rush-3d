/* ============================================
   characters.js — Player + Francisco 3D Models
   Built from primitives (boxes, cylinders, spheres)
   ============================================ */

window.GAME = window.GAME || {};

window.GAME.Characters = (function() {

    /**
     * Create a canvas texture for name tags
     */
    function createNameTag(name) {
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 128, 32);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 64, 16);
        var tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        return tex;
    }

    /**
     * Build the Steak 'n' Shake uniform body (shared structure)
     * Returns a group with body parts that can be animated
     */
    function buildCharacter(config) {
        var group = new THREE.Group();
        var parts = {};

        var skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.7 });
        var shirtMat = new THREE.MeshStandardMaterial({ color: 0xF5F5DC, roughness: 0.6 }); // off-white
        var pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
        var apronMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        var shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        var hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.8 });
        var bowtieMat = new THREE.MeshStandardMaterial({ color: 0xCC0000, roughness: 0.5 });

        var scale = config.scale || 1;
        var bodyWidth = (config.bodyWidth || 0.8) * scale;
        var bodyHeight = (config.bodyHeight || 1) * scale;

        // HEAD
        var headSize = 0.55 * scale;
        var head = new THREE.Mesh(
            new THREE.BoxGeometry(headSize, headSize * 0.9, headSize * 0.85),
            skinMat
        );
        head.position.y = bodyHeight + 0.15 * scale + headSize * 0.45;
        head.castShadow = true;
        parts.head = head;
        group.add(head);

        // HAIR
        if (config.hairStyle === 'short_brown' || config.hairStyle === 'short_black') {
            var hair = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 1.05, headSize * 0.35, headSize * 0.9),
                hairMat
            );
            hair.position.y = head.position.y + headSize * 0.35;
            hair.castShadow = true;
            group.add(hair);
        } else if (config.hairStyle === 'thick_wavy') {
            // Francisco's thick, voluminous hair
            var hairTop = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 1.2, headSize * 0.5, headSize * 1.1),
                hairMat
            );
            hairTop.position.y = head.position.y + headSize * 0.35;
            hairTop.castShadow = true;
            group.add(hairTop);

            // Hair sides going past ears
            var hairLeft = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 0.2, headSize * 0.6, headSize * 0.8),
                hairMat
            );
            hairLeft.position.set(-headSize * 0.55, head.position.y + headSize * 0.1, 0);
            group.add(hairLeft);

            var hairRight = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 0.2, headSize * 0.6, headSize * 0.8),
                hairMat
            );
            hairRight.position.set(headSize * 0.55, head.position.y + headSize * 0.1, 0);
            group.add(hairRight);

            // Hair back
            var hairBack = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 1.1, headSize * 0.7, headSize * 0.2),
                hairMat
            );
            hairBack.position.set(0, head.position.y + headSize * 0.1, -headSize * 0.45);
            group.add(hairBack);
        }

        // EYES
        var eyeMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        var pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        var eyeSize = 0.07 * scale;
        var eyeSpacing = 0.12 * scale;

        var leftEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 8, 8), eyeMat);
        leftEyeWhite.position.set(-eyeSpacing, head.position.y + 0.02 * scale, headSize * 0.4);
        group.add(leftEyeWhite);

        var rightEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 8, 8), eyeMat);
        rightEyeWhite.position.set(eyeSpacing, head.position.y + 0.02 * scale, headSize * 0.4);
        group.add(rightEyeWhite);

        var leftPupil = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.55, 6, 6), pupilMat);
        leftPupil.position.set(-eyeSpacing, head.position.y + 0.02 * scale, headSize * 0.4 + eyeSize * 0.6);
        parts.leftPupil = leftPupil;
        group.add(leftPupil);

        var rightPupil = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.55, 6, 6), pupilMat);
        rightPupil.position.set(eyeSpacing, head.position.y + 0.02 * scale, headSize * 0.4 + eyeSize * 0.6);
        parts.rightPupil = rightPupil;
        group.add(rightPupil);

        // SMILE (for player characters)
        if (config.smile) {
            var smileMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            var smile = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.02 * scale, 0.02 * scale), smileMat);
            smile.position.set(0, head.position.y - 0.1 * scale, headSize * 0.43);
            group.add(smile);
        }

        // FRANCISCO SPECIAL FEATURES
        if (config.isFrancisco) {
            // Thick mustache
            var mustacheMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
            var mustache = new THREE.Mesh(
                new THREE.BoxGeometry(headSize * 0.7, headSize * 0.12, headSize * 0.15),
                mustacheMat
            );
            mustache.position.set(0, head.position.y - 0.06 * scale, headSize * 0.4);
            group.add(mustache);

            // Puffy cheeks (wider head extensions)
            var cheekMat = skinMat;
            var leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 8), cheekMat);
            leftCheek.position.set(-headSize * 0.4, head.position.y - 0.05 * scale, headSize * 0.2);
            group.add(leftCheek);
            var rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 8), cheekMat);
            rightCheek.position.set(headSize * 0.4, head.position.y - 0.05 * scale, headSize * 0.2);
            group.add(rightCheek);

            // Double chin
            var chin = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 8, 8), skinMat);
            chin.position.set(0, head.position.y - headSize * 0.5, headSize * 0.15);
            group.add(chin);

            // Forehead wrinkle lines (dark thin boxes)
            var wrinkleMat = new THREE.MeshBasicMaterial({ color: 0x5a4030 });
            for (var w = 0; w < 3; w++) {
                var wrinkle = new THREE.Mesh(
                    new THREE.BoxGeometry(headSize * 0.5, 0.01, 0.01),
                    wrinkleMat
                );
                wrinkle.position.set(0, head.position.y + headSize * 0.2 + w * 0.04, headSize * 0.43);
                group.add(wrinkle);
            }

            // Red eye emissive (for higher difficulty — controlled externally)
            var redEyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0 });
            var leftRedEye = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.4, 6, 6), redEyeMat);
            leftRedEye.position.copy(leftPupil.position);
            leftRedEye.position.z += 0.01;
            parts.leftRedEye = leftRedEye;
            group.add(leftRedEye);

            var rightRedEye = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.4, 6, 6), redEyeMat.clone());
            rightRedEye.position.copy(rightPupil.position);
            rightRedEye.position.z += 0.01;
            parts.rightRedEye = rightRedEye;
            group.add(rightRedEye);

            // Anger aura particles container (added dynamically)
            parts.auraParticles = [];
        }

        // TORSO (white dress shirt)
        var torso = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.55, bodyWidth * 0.65),
            shirtMat
        );
        torso.position.y = bodyHeight * 0.65;
        torso.castShadow = true;
        parts.torso = torso;
        group.add(torso);

        // FRANCISCO BELLY
        if (config.isFrancisco) {
            var bellyMat = new THREE.MeshStandardMaterial({ color: 0xF0F0D0, roughness: 0.6 });
            var belly = new THREE.Mesh(
                new THREE.SphereGeometry(bodyWidth * 0.45, 12, 12),
                bellyMat
            );
            belly.position.set(0, bodyHeight * 0.55, bodyWidth * 0.2);
            belly.scale.set(1, 0.8, 0.7);
            belly.castShadow = true;
            parts.belly = belly;
            group.add(belly);
        }

        // BLACK APRON
        var apron = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 0.85, bodyHeight * 0.45, 0.06),
            apronMat
        );
        apron.position.set(0, bodyHeight * 0.45, bodyWidth * 0.35);
        group.add(apron);

        // NAME TAG
        var tagTex = createNameTag(config.name);
        var tagMat = new THREE.MeshBasicMaterial({ map: tagTex });
        var tag = new THREE.Mesh(new THREE.PlaneGeometry(0.4 * scale, 0.15 * scale), tagMat);
        tag.position.set(0.15 * scale, bodyHeight * 0.6, bodyWidth * 0.35 + 0.04);
        group.add(tag);

        // RED BOWTIE
        // Two small triangular shapes meeting at center
        var bowtieLeft = new THREE.Mesh(
            new THREE.ConeGeometry(0.08 * scale, 0.15 * scale, 4),
            bowtieMat
        );
        bowtieLeft.rotation.z = -Math.PI / 2;
        bowtieLeft.position.set(-0.07 * scale, bodyHeight + 0.1 * scale, bodyWidth * 0.35);
        group.add(bowtieLeft);

        var bowtieRight = new THREE.Mesh(
            new THREE.ConeGeometry(0.08 * scale, 0.15 * scale, 4),
            bowtieMat
        );
        bowtieRight.rotation.z = Math.PI / 2;
        bowtieRight.position.set(0.07 * scale, bodyHeight + 0.1 * scale, bodyWidth * 0.35);
        group.add(bowtieRight);

        // BLACK PANTS (lower body)
        var hips = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 0.9, bodyHeight * 0.15, bodyWidth * 0.6),
            pantsMat
        );
        hips.position.y = bodyHeight * 0.32;
        group.add(hips);

        // LEGS
        var legWidth = bodyWidth * 0.35;
        var legHeight = bodyHeight * 0.45;
        var legSpacing = bodyWidth * 0.25;

        var leftLeg = new THREE.Mesh(new THREE.BoxGeometry(legWidth, legHeight, legWidth), pantsMat);
        leftLeg.position.set(-legSpacing, legHeight / 2, 0);
        leftLeg.castShadow = true;
        parts.leftLeg = leftLeg;
        group.add(leftLeg);

        var rightLeg = new THREE.Mesh(new THREE.BoxGeometry(legWidth, legHeight, legWidth), pantsMat);
        rightLeg.position.set(legSpacing, legHeight / 2, 0);
        rightLeg.castShadow = true;
        parts.rightLeg = rightLeg;
        group.add(rightLeg);

        // SHOES
        var leftShoe = new THREE.Mesh(new THREE.BoxGeometry(legWidth * 1.1, 0.12 * scale, legWidth * 1.3), shoeMat);
        leftShoe.position.set(-legSpacing, 0.06 * scale, 0.05 * scale);
        group.add(leftShoe);

        var rightShoe = new THREE.Mesh(new THREE.BoxGeometry(legWidth * 1.1, 0.12 * scale, legWidth * 1.3), shoeMat);
        rightShoe.position.set(legSpacing, 0.06 * scale, 0.05 * scale);
        group.add(rightShoe);

        // ARMS
        var armWidth = bodyWidth * 0.22;
        var armHeight = bodyHeight * 0.5;

        var leftArm = new THREE.Mesh(new THREE.BoxGeometry(armWidth, armHeight, armWidth), shirtMat);
        leftArm.position.set(-bodyWidth / 2 - armWidth / 2, bodyHeight * 0.6, 0);
        leftArm.castShadow = true;
        parts.leftArm = leftArm;
        group.add(leftArm);

        var rightArm = new THREE.Mesh(new THREE.BoxGeometry(armWidth, armHeight, armWidth), shirtMat);
        rightArm.position.set(bodyWidth / 2 + armWidth / 2, bodyHeight * 0.6, 0);
        rightArm.castShadow = true;
        parts.rightArm = rightArm;
        group.add(rightArm);

        // Hands (skin-colored)
        var leftHand = new THREE.Mesh(new THREE.BoxGeometry(armWidth * 0.9, armWidth * 0.9, armWidth * 0.9), skinMat);
        leftHand.position.set(-bodyWidth / 2 - armWidth / 2, bodyHeight * 0.3, 0);
        parts.leftHand = leftHand;
        group.add(leftHand);

        var rightHand = new THREE.Mesh(new THREE.BoxGeometry(armWidth * 0.9, armWidth * 0.9, armWidth * 0.9), skinMat);
        rightHand.position.set(bodyWidth / 2 + armWidth / 2, bodyHeight * 0.3, 0);
        parts.rightHand = rightHand;
        group.add(rightHand);

        // FOOD TRAY (hidden by default, shown when carrying food)
        var trayGroup = new THREE.Group();
        // Tray plate
        var trayPlate = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.5 })
        );
        trayGroup.add(trayPlate);

        // Burger on tray
        // Bottom bun
        var bottomBun = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), new THREE.MeshStandardMaterial({ color: 0xD4A76A }));
        bottomBun.position.y = 0.07;
        trayGroup.add(bottomBun);
        // Patty
        var patty = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28), new THREE.MeshStandardMaterial({ color: 0x6B3A2A }));
        patty.position.y = 0.13;
        trayGroup.add(patty);
        // Lettuce
        var lettuce = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), new THREE.MeshStandardMaterial({ color: 0x44AA44 }));
        lettuce.position.y = 0.17;
        trayGroup.add(lettuce);
        // Top bun
        var topBun = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0xD4A76A }));
        topBun.position.y = 0.24;
        trayGroup.add(topBun);

        trayGroup.position.set(0, bodyHeight + headSize + 0.3, 0);
        trayGroup.visible = false;
        parts.tray = trayGroup;
        group.add(trayGroup);

        // Store metadata
        group.userData = {
            parts: parts,
            config: config,
            walkTime: 0,
            isMoving: false,
            bodyHeight: bodyHeight,
            headY: head.position.y
        };

        // Set shadow on all meshes
        group.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        return group;
    }

    /**
     * Create the player character (Chris or Jabu)
     */
    function createPlayer(characterName) {
        var config;
        if (characterName === 'chris') {
            config = {
                name: 'CHRIS',
                skinColor: 0xFDBCB4,
                hairColor: 0x8B6914,
                hairStyle: 'short_brown',
                scale: 1,
                bodyWidth: 0.8,
                bodyHeight: 1,
                smile: true,
                isFrancisco: false
            };
        } else {
            config = {
                name: 'JABU',
                skinColor: 0xC68642,
                hairColor: 0x1a1a1a,
                hairStyle: 'short_black',
                scale: 1,
                bodyWidth: 0.8,
                bodyHeight: 1,
                smile: true,
                isFrancisco: false
            };
        }
        var model = buildCharacter(config);
        return model;
    }

    /**
     * Create Francisco (the antagonist)
     */
    function createFrancisco() {
        var config = {
            name: 'FRANCISCO',
            skinColor: 0x8B5E3C,
            hairColor: 0x1a1a1a,
            hairStyle: 'thick_wavy',
            scale: 1.15,
            bodyWidth: 1.05,
            bodyHeight: 1.1,
            smile: false,
            isFrancisco: true
        };
        var model = buildCharacter(config);
        return model;
    }

    /**
     * Animate walking motion
     */
    function animateWalk(model, dt, speed) {
        var data = model.userData;
        var parts = data.parts;
        if (!parts) return;

        if (speed > 0.5) {
            data.walkTime += dt * speed * 1.2;
            data.isMoving = true;

            // Body bob
            var bob = Math.sin(data.walkTime * 8) * 0.1;
            model.position.y = bob > 0 ? bob : 0;

            // Leg swing
            var legSwing = Math.sin(data.walkTime * 8) * 0.4;
            if (parts.leftLeg) {
                parts.leftLeg.rotation.x = legSwing;
                parts.rightLeg.rotation.x = -legSwing;
            }

            // Arm swing (opposite to legs)
            if (parts.leftArm) {
                parts.leftArm.rotation.x = -legSwing * 0.6;
                parts.rightArm.rotation.x = legSwing * 0.6;
            }
        } else {
            data.isMoving = false;
            model.position.y = 0;
            // Reset to idle
            if (parts.leftLeg) {
                parts.leftLeg.rotation.x = 0;
                parts.rightLeg.rotation.x = 0;
            }
            if (parts.leftArm) {
                parts.leftArm.rotation.x = 0;
                parts.rightArm.rotation.x = 0;
            }
        }
    }

    /**
     * Animate idle breathing
     */
    function animateIdle(model, time) {
        var data = model.userData;
        var parts = data.parts;
        if (!parts || data.isMoving) return;

        // Breathing: slight torso scale
        if (parts.torso) {
            var breathe = 1 + Math.sin(time * 2) * 0.015;
            parts.torso.scale.y = breathe;
            parts.torso.scale.x = breathe * 0.5 + 0.5;
        }

        // Francisco belly breathing
        if (parts.belly) {
            var bellyBreathe = 1 + Math.sin(time * 1.5) * 0.03;
            parts.belly.scale.z = bellyBreathe;
            parts.belly.scale.x = bellyBreathe;
        }
    }

    /**
     * Make Francisco's eyes track the player position
     */
    function updateEyeTracking(franciscoModel, playerPos) {
        var parts = franciscoModel.userData.parts;
        if (!parts || !parts.leftPupil || !parts.rightPupil) return;

        var headY = franciscoModel.userData.headY;
        var worldPos = new THREE.Vector3();
        franciscoModel.getWorldPosition(worldPos);

        // Direction to player in local space
        var dir = new THREE.Vector3(
            playerPos.x - worldPos.x,
            0,
            playerPos.z - worldPos.z
        ).normalize();

        // Rotate direction into Francisco's local space
        var invQuat = franciscoModel.quaternion.clone().invert();
        dir.applyQuaternion(invQuat);

        var maxOffset = 0.03;
        var ox = THREE.MathUtils.clamp(dir.x * 0.05, -maxOffset, maxOffset);
        var oz = THREE.MathUtils.clamp(dir.z * 0.05, -maxOffset, maxOffset);

        var eyeSpacing = 0.138; // 0.12 * 1.15 scale
        var headSize = 0.55 * 1.15;
        var eyeZ = headSize * 0.4;

        parts.leftPupil.position.set(-eyeSpacing + ox, headY + 0.023, eyeZ + 0.042 + oz);
        parts.rightPupil.position.set(eyeSpacing + ox, headY + 0.023, eyeZ + 0.042 + oz);
    }

    /**
     * Update Francisco's anger visual effects based on difficulty
     */
    function updateAngerEffects(franciscoModel, difficulty, time, scene) {
        var parts = franciscoModel.userData.parts;
        if (!parts) return;

        // Red eye glow (scales with difficulty)
        if (parts.leftRedEye && parts.rightRedEye) {
            var eyeIntensity = Math.min(1, difficulty * 0.1);
            parts.leftRedEye.material.opacity = eyeIntensity;
            parts.rightRedEye.material.opacity = eyeIntensity;
        }

        // Anger aura particles at difficulty >= 2
        if (difficulty >= 2) {
            // Create particles if needed
            while (parts.auraParticles.length < Math.min(8, difficulty * 2)) {
                var particleMat = new THREE.MeshBasicMaterial({
                    color: 0xFF2200,
                    transparent: true,
                    opacity: 0.6
                });
                var particle = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.15, 0.02),
                    particleMat
                );
                franciscoModel.add(particle);
                parts.auraParticles.push({
                    mesh: particle,
                    angle: Math.random() * Math.PI * 2,
                    speed: 1.5 + Math.random(),
                    radius: 0.8 + Math.random() * 0.3,
                    yOffset: 1.8 + Math.random() * 0.8
                });
            }

            // Animate particles
            parts.auraParticles.forEach(function(p) {
                p.angle += p.speed * 0.02;
                p.mesh.position.set(
                    Math.cos(p.angle) * p.radius,
                    p.yOffset + Math.sin(time * 3 + p.angle) * 0.15,
                    Math.sin(p.angle) * p.radius
                );
                p.mesh.rotation.y = p.angle;
                p.mesh.material.opacity = 0.3 + Math.sin(time * 4 + p.angle) * 0.3;
            });
        }
    }

    /**
     * Show or hide the food tray above player's head
     */
    function setCarryingFood(model, carrying) {
        var parts = model.userData.parts;
        if (parts && parts.tray) {
            parts.tray.visible = carrying;
        }
    }

    return {
        createPlayer: createPlayer,
        createFrancisco: createFrancisco,
        animateWalk: animateWalk,
        animateIdle: animateIdle,
        updateEyeTracking: updateEyeTracking,
        updateAngerEffects: updateAngerEffects,
        setCarryingFood: setCarryingFood
    };
})();
