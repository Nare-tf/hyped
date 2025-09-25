import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";


Registry.register("VALKYRIE", (player) => {
    // Shield effect
    player.addEffect("resistance", 8 * 20, { amplifier: 2 });
    player.addEffect("absorption", 15 * 20, { amplifier: 3 });

    // Dash attack after 1 second
    system.runTimeout(() => {
        const direction = player.getViewDirection();
        const dashDistance = 8;

        for (let i = 1; i <= dashDistance; i++) {
            const checkPos = {
                x: player.location.x + direction.x * i,
                y: player.location.y + direction.y * i,
                z: player.location.z + direction.z * i
            };

            const entities = player.dimension.getEntities({
                location: checkPos,
                maxDistance: 2,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(entity => {
                entity.applyDamage(30, { cause: "entityAttack", damagingEntity: player });
                player.dimension.spawnParticle("minecraft:crit_particle", entity.location);
            });

            player.dimension.spawnParticle("minecraft:flame_particle", checkPos);
        }

        // Teleport to end position
        const endPos = {
            x: player.location.x + direction.x * dashDistance,
            y: player.location.y,
            z: player.location.z + direction.z * dashDistance
        };
        player.teleport(endPos);
        player.playSound("mob.enderdragon.wings");
    }, 20);

    player.playSound("item.shield.block");
}, manaReq.VALKYRIE, true);