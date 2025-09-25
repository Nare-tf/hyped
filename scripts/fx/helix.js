// fx/weapon_effects.js
import { system } from "@minecraft/server";

export class WeaponFX {
    static activeEffects = new Map(); // playerId -> Map<effectId, effectData>
    static effectIdCounter = 0; // Generate unique IDs

    /**
     * AOTD expanding fire helix effect (Hypixel-style)
     * @param {Player} player 
     * @param {Object} options 
     */
    static aotdFireHelix(player, options = {}) {
        const config = {
            duration: options.duration || 60, // ticks (3 seconds)
            maxRadius: options.maxRadius || 8,
            helixHeight: options.helixHeight || 12,
            spirals: options.spirals || 3, // Number of helix spirals
            particlesPerSpiral: options.particlesPerSpiral || 2,
            damage: options.damage || 15,
            knockbackDistance: options.knockbackDistance || 10, // blocks
            knockbackHeight: options.knockbackHeight || 0.4, // vertical component
            allowMultiple: options.allowMultiple !== false, // Default to true
            ...options
        };

        // Only clear existing if multiple not allowed
        if (!config.allowMultiple) {
            this.clearEffect(player.id, "aotd_helix");
        }

        const effectId = ++this.effectIdCounter;
        const startPos = player.getHeadLocation();
        const direction = player.getViewDirection();
        
        const effectData = {
            id: effectId,
            type: "aotd_helix",
            startTime: system.currentTick,
            config,
            startPos,
            direction,
            hitEntities: new Set() // Prevent multi-hit on same entity
        };

        // Store effect with unique ID
        if (!this.activeEffects.has(player.id)) {
            this.activeEffects.set(player.id, new Map());
        }
        this.activeEffects.get(player.id).set(effectId, effectData);

        // Start the effect loop
        const runId = system.runInterval(() => {
            this.updateAotdHelix(player, effectData, runId);
        }, 1);

        effectData.runId = runId;
        return effectId; // Return ID for manual cancellation if needed
    }

    static updateAotdHelix(player, effectData, runId) {
        const elapsed = system.currentTick - effectData.startTime;
        const progress = elapsed / effectData.config.duration;

        if (progress >= 1) {
            system.clearRun(runId);
            this.clearEffectById(player.id, effectData.id);
            return;
        }

        // Expanding radius over time (ease-out curve)
        const radius = effectData.config.maxRadius * this.easeOut(progress);
        
        // Forward distance based on progress
        const forwardDistance = progress * effectData.config.helixHeight;

        // Generate helix points
        for (let spiral = 0; spiral < effectData.config.spirals; spiral++) {
            for (let p = 0; p < effectData.config.particlesPerSpiral; p++) {
                const angle = (progress * Math.PI * 4) + (spiral * (Math.PI * 2 / effectData.config.spirals)) + (p * 0.5);
                
                // Calculate helix position
                const helixPos = this.calculateHelixPoint(
                    effectData.startPos,
                    effectData.direction,
                    angle,
                    radius,
                    forwardDistance + (spiral * 0.5) // Slight stagger between spirals
                );

                // Spawn particles
                this.spawnFireParticle(player.dimension, helixPos, progress);
                
                // Check for entity damage
                this.checkHelixDamage(player, helixPos, effectData);
            }
        }
    }

    /**
     * Calculate 3D helix point in world space
     */
    static calculateHelixPoint(startPos, direction, angle, radius, forwardDist) {
        // Create orthogonal vectors for the helix plane
        const up = { x: 0, y: 1, z: 0 };
        const right = this.crossProduct(direction, up);
        const actualUp = this.crossProduct(right, direction);

        // Normalize vectors
        this.normalizeVector(right);
        this.normalizeVector(actualUp);

        // Calculate helix position
        const x = startPos.x + direction.x * forwardDist + 
                  right.x * Math.cos(angle) * radius + 
                  actualUp.x * Math.sin(angle) * radius;
        
        const y = startPos.y + direction.y * forwardDist + 
                  right.y * Math.cos(angle) * radius + 
                  actualUp.y * Math.sin(angle) * radius;
        
        const z = startPos.z + direction.z * forwardDist + 
                  right.z * Math.cos(angle) * radius + 
                  actualUp.z * Math.sin(angle) * radius;

        return { x, y, z };
    }

    /**
     * Spawn fire particle with intensity based on progress
     */
    static spawnFireParticle(dimension, pos, progress) {
        // Different particles based on intensity
        const particles = [
            "minecraft:basic_flame_particle"
        ];
        
        const particleIndex = Math.floor(progress * particles.length);
        const particle = particles[Math.min(particleIndex, particles.length - 1)];
        
        try {
            dimension.spawnParticle(particle, pos);
            
            // Add some randomness for more natural look
            if (Math.random() < 0.3) {
                const offset = {
                    x: pos.x + (Math.random() - 0.5) * 0.3,
                    y: pos.y + (Math.random() - 0.5) * 0.3,
                    z: pos.z + (Math.random() - 0.5) * 0.3
                };
                dimension.spawnParticle("minecraft:basic_flame_particle", offset);
            }
        } catch (e) {
            // Particle spawn failed (likely out of bounds)
        }
    }

    /**
     * Check for entities in helix path and damage them
     */
    static checkHelixDamage(player, pos, effectData) {
        const entities = player.dimension.getEntities({
            location: pos,
            maxDistance: 2,
            excludeNames: [player.name],
            excludeTypes: ["minecraft:item"]
        });

        entities.forEach(entity => {
            const entityId = entity.id;
            if (effectData.hitEntities.has(entityId)) return; // Already hit

            // Apply damage and effects
            entity.applyDamage(effectData.config.damage, {
                cause: "magic",
                damagingEntity: player
            });

            // Configurable knockback - shoot entity backward X blocks
            const knockbackDirection = this.normalize({
                x: entity.location.x - player.location.x,
                y: 0, // Keep horizontal
                z: entity.location.z - player.location.z
            });

            // Apply knockback with configurable distance
            if (entity.applyKnockback) {
                const knockbackForce = effectData.config.knockbackDistance// / 10; // Convert blocks to force
                knockbackDirection.x = knockbackDirection.x * knockbackForce;
                knockbackDirection.z = knockbackDirection.z * knockbackForce;
                entity.applyKnockback(
                    knockbackDirection, 
                    effectData.config.knockbackHeight
                );
            }

            // Mark as hit
            effectData.hitEntities.add(entityId);

            // Visual/audio feedback
            player.playSound("item.firecharge.use");
        });
    }

    /**
     * Clear specific effect by ID
     */
    static clearEffectById(playerId, effectId) {
        const playerEffects = this.activeEffects.get(playerId);
        if (!playerEffects) return;

        const effect = playerEffects.get(effectId);
        if (effect) {
            if (effect.runId) system.clearRun(effect.runId);
            playerEffects.delete(effectId);
        }

        if (playerEffects.size === 0) {
            this.activeEffects.delete(playerId);
        }
    }

    /**
     * Clear all effects of a type (optional)
     */
    static clearEffect(playerId, effectType) {
        const playerEffects = this.activeEffects.get(playerId);
        if (!playerEffects) return;

        for (const [id, effect] of playerEffects) {
            if (effect.type === effectType) {
                if (effect.runId) system.clearRun(effect.runId);
                playerEffects.delete(id);
            }
        }

        if (playerEffects.size === 0) {
            this.activeEffects.delete(playerId);
        }
    }

    /**
     * Clean up all player effects
     */
    static cleanupPlayer(playerId) {
        const playerEffects = this.activeEffects.get(playerId);
        if (playerEffects) {
            for (const effect of playerEffects.values()) {
                if (effect.runId) system.clearRun(effect.runId);
            }
            this.activeEffects.delete(playerId);
        }
    }

    /**
     * Get active effect count for player
     */
    static getActiveEffectCount(playerId, effectType = null) {
        const playerEffects = this.activeEffects.get(playerId);
        if (!playerEffects) return 0;
        
        if (effectType) {
            return Array.from(playerEffects.values()).filter(e => e.type === effectType).length;
        }
        return playerEffects.size;
    }

    /**
     * Get all active effects for debugging
     */
    static getActiveEffects(playerId) {
        const playerEffects = this.activeEffects.get(playerId);
        return playerEffects ? Array.from(playerEffects.values()) : [];
    }

    // Utility functions
    static easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    static crossProduct(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    static normalizeVector(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len > 0) {
            v.x /= len;
            v.y /= len;
            v.z /= len;
        }
        return v;
    }

    static normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
    }

    /**
     * Create a simple expanding shockwave effect
     */
    static shockwave(player, options = {}) {
        const config = {
            duration: options.duration || 20,
            maxRadius: options.maxRadius || 15,
            damage: options.damage || 10,
            knockbackDistance: options.knockbackDistance || 5,
            particleType: options.particleType || "minecraft:explosion_particle",
            ...options
        };

        const effectId = ++this.effectIdCounter;
        const startPos = options.location ?? player.location;
        
        const effectData = {
            id: effectId,
            type: "shockwave",
            startTime: system.currentTick,
            config,
            startPos,
            hitEntities: new Set()
        };

        if (!this.activeEffects.has(player.id)) {
            this.activeEffects.set(player.id, new Map());
        }
        this.activeEffects.get(player.id).set(effectId, effectData);

        const runId = system.runInterval(() => {
            const elapsed = system.currentTick - effectData.startTime;
            const progress = elapsed / effectData.config.duration;

            if (progress >= 1) {
                system.clearRun(runId);
                this.clearEffectById(player.id, effectData.id);
                return;
            }

            const radius = progress * effectData.config.maxRadius;
            
            // Spawn ring particles
            for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
                const x = startPos.x + Math.cos(angle) * radius;
                const z = startPos.z + Math.sin(angle) * radius;
                
                try {
                    player.dimension.spawnParticle(config.particleType, { x, y: startPos.y, z });
                } catch {}
            }

            // Check for entities in expanding ring
            const entities = player.dimension.getEntities({
                location: startPos,
                maxDistance: radius + 1,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(entity => {
                const distance = Math.sqrt(
                    Math.pow(entity.location.x - startPos.x, 2) +
                    Math.pow(entity.location.z - startPos.z, 2)
                );

                if (Math.abs(distance - radius) < 1.5 && !effectData.hitEntities.has(entity.id)) {
                    entity.applyDamage(config.damage, {
                        cause: "magic",
                        damagingEntity: player
                    });

                    const knockDir = this.normalize({
                        x: entity.location.x - startPos.x,
                        y: 0,
                        z: entity.location.z - startPos.z
                    });

                    knockDir.x = knockDir.x * config.knockbackDistance;
                    knockDir.z = knockDir.z * config.knockbackDistance; 

                    if (entity.applyKnockback) {
                        try { entity.applyKnockback(knockDir, 0.4) } catch {};
                    }

                    effectData.hitEntities.add(entity.id);
                }
            });

        }, 1);

        effectData.runId = runId;
        return effectId;
    }
    /**
     * Lightning Strike - spawns multiple lightning bolts around the player
     */
    static lightningStrike(player, options = {}) {
        const config = {
            strikes: options.strikes || 5,
            radius: options.radius || 6,
            damage: options.damage || 12,
            particle: options.particle || "minecraft:electric_spark_particle",
            ...options
        };

        const effectId = ++this.effectIdCounter;
        const startPos = player.location;

        for (let i = 0; i < config.strikes; i++) {
            const angle = (Math.PI * 2 / config.strikes) * i;
            const x = startPos.x + Math.cos(angle) * config.radius;
            const z = startPos.z + Math.sin(angle) * config.radius;
            const pos = { x, y: startPos.y, z };

            try {
                player.dimension.spawnParticle(config.particle, pos);
                player.dimension.playSound("ambient.weather.thunder", pos);
            } catch {}

            const entities = player.dimension.getEntities({
                location: pos,
                maxDistance: 2,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(e => {
                e.applyDamage(config.damage, { cause: "lightning", damagingEntity: player });
            });
        }

        return effectId;
    }

    /**
     * Black Hole - pulls entities into a point while damaging
     */
    static blackHole(player, options = {}) {
        const config = {
            duration: options.duration || 60,
            radius: options.radius || 10,
            pullStrength: options.pullStrength || 0.2,
            damage: options.damage || 2,
            particle: options.particle || "minecraft:portal_reverse_particle",
            ...options
        };

        const effectId = ++this.effectIdCounter;
        const center = player.location;

        const effectData = {
            id: effectId,
            type: "blackhole",
            startTime: system.currentTick,
            config,
            center,
            hitEntities: new Set()
        };

        if (!this.activeEffects.has(player.id)) {
            this.activeEffects.set(player.id, new Map());
        }
        this.activeEffects.get(player.id).set(effectId, effectData);

        const runId = system.runInterval(() => {
            const elapsed = system.currentTick - effectData.startTime;
            if (elapsed > config.duration) {
                system.clearRun(runId);
                this.clearEffectById(player.id, effectData.id);
                return;
            }

            // Core particle
            try {
                player.dimension.spawnParticle(config.particle, center);
                if (Math.random() < 0.1) {
                    player.dimension.playSound("mob.enderman.portal", center);
                }
            } catch {}

            const entities = player.dimension.getEntities({
                location: center,
                maxDistance: config.radius,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(entity => {
                // Pull entity toward center
                const dir = {
                    x: center.x - entity.location.x,
                    y: center.y - entity.location.y,
                    z: center.z - entity.location.z
                };
                const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
                if (len > 0) {
                    dir.x /= len;
                    dir.y /= len;
                    dir.z /= len;
                }

                if (entity.applyKnockback) {
                    entity.applyKnockback(dir, 0); // Using new beta signature
                }

                // Periodic damage
                if (elapsed % 10 === 0) {
                    entity.applyDamage(config.damage, { cause: "magic", damagingEntity: player });
                }
            });

        }, 1);

        effectData.runId = runId;
        return effectId;
    }

    /**
     * Icicle Burst - ice shards erupt around the player
     */
    static icicleBurst(player, options = {}) {
        const config = {
            shards: options.shards || 8,
            radius: options.radius || 5,
            damage: options.damage || 8,
            particle: options.particle || "minecraft:snowflake_particle",
            ...options
        };

        const effectId = ++this.effectIdCounter;
        const pos = player.location;

        for (let i = 0; i < config.shards; i++) {
            const angle = (Math.PI * 2 / config.shards) * i;
            const x = pos.x + Math.cos(angle) * config.radius;
            const z = pos.z + Math.sin(angle) * config.radius;
            const shardPos = { x, y: pos.y, z };

            try {
                player.dimension.spawnParticle(config.particle, shardPos);
                player.dimension.playSound("block.amethyst_block.break", shardPos);
            } catch {}

            const entities = player.dimension.getEntities({
                location: shardPos,
                maxDistance: 2,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(e => {
                e.applyDamage(config.damage, { cause: "freezing", damagingEntity: player });
            });
        }

        return effectId;
    }

    /**
     * Blade Arc - forward crescent slash
     */
    static async bladeArc(player, options = {}) {
        const config = {
            radius: options.radius || 6,
            arcAngle: options.arcAngle || Math.PI / 2, // 90°
            steps: options.steps || 12,
            damage: options.damage || 10,
            particle: options.particle || "minecraft:crit_particle",
            ...options
        };

        const effectId = ++this.effectIdCounter;
        const start = player.location;
        const dir = player.getViewDirection();
        const facing = Math.atan2(dir.z, dir.x);

        player.dimension.playSound("item.trident.throw", player.location);

        for (let i = -config.arcAngle / 2; i <= config.arcAngle / 2; i += config.arcAngle / config.steps) {
            const angle = facing + i;
            const x = start.x + Math.cos(angle) * config.radius;
            const z = start.z + Math.sin(angle) * config.radius;
            const pos = { x, y: start.y + 1, z };

            try {
                player.dimension.spawnParticle(config.particle, pos);
            } catch {}

            const entities = player.dimension.getEntities({
                location: pos,
                maxDistance: 2,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(e => {
                e.applyDamage(config.damage, { cause: "entityAttack", damagingEntity: player });
            });
            await system.waitTicks(1); // Small delay for effect spread
        }
        return effectId;
    }
}