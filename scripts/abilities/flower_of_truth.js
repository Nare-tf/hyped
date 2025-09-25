import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("FLOWER_OF_TRUTH", (player) => {
    const startPos = player.getHeadLocation();
    const direction = player.getViewDirection();
    let distance = 0;
    const maxDistance = 20;
    const hitEntities = new Set();

    const projectileId = system.runInterval(() => {
        distance += 1;
        const currentPos = {
            x: startPos.x + direction.x * distance,
            y: startPos.y + direction.y * distance,
            z: startPos.z + direction.z * distance
        };

        player.dimension.spawnParticle("minecraft:villager_happy", currentPos);

        // Check for entities
        const entities = player.dimension.getEntities({
            location: currentPos,
            maxDistance: 1.5,
            excludeNames: [player.name],
            excludeTypes: ["minecraft:item"]
        });

        entities.forEach(entity => {
            if (!hitEntities.has(entity.id)) {
                entity.applyDamage(20, { cause: "magic", damagingEntity: player });
                hitEntities.add(entity.id);
                player.dimension.spawnParticle("minecraft:basic_crit_particle", entity.location);
            }
        });

        // Check for blocks or max distance
        const block = player.dimension.getBlock(currentPos);
        if (distance >= maxDistance || (block && block.typeId !== "minecraft:air")) {
            system.clearRun(projectileId);
        }
    }, 2);

    player.playSound("random.bow");
}, manaReq.FLOWER_OF_TRUTH, true);