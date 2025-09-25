import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";
import { WeaponFX } from "../fx/helix.js";

Registry.register("TERMINATOR", (player) => {
    const startPos = player.getHeadLocation();
    const baseDirection = player.getViewDirection();
    
    // Fire 5 explosive arrows
    for (let i = 0; i < 5; i++) {
        system.runTimeout(() => {
            const spread = (Math.random() - 0.5) * 0.3;
            const direction = {
                x: baseDirection.x + spread,
                y: baseDirection.y + spread,
                z: baseDirection.z + spread
            };

            let distance = 0;
            const arrowId = system.runInterval(() => {
                distance += 2;
                const currentPos = {
                    x: startPos.x + direction.x * distance,
                    y: startPos.y + direction.y * distance,
                    z: startPos.z + direction.z * distance
                };

                player.dimension.spawnParticle("minecraft:basic_flame_particle", currentPos);

                const block = player.dimension.getBlock(currentPos);
                const entities = player.dimension.getEntities({
                    location: currentPos,
                    maxDistance: 2,
                    excludeNames: [player.name],
                    excludeTypes: ["minecraft:item"]
                });

                if (distance >= 25 || entities.length > 0 || (block && block.typeId !== "minecraft:air")) {
                    system.clearRun(arrowId);
                    
                    // Explosion
                    WeaponFX.shockwave(player, {
                        maxRadius: 4,
                        damage: 20,
                        particleType: "minecraft:explosion_particle",
                        location: currentPos
                    });
                    
                    player.dimension.playSound("random.explode", currentPos);
                }
            }, 1);
        }, i * 3);
    }

    player.playSound("random.bow");
}, manaReq.TERMINATOR, true);
