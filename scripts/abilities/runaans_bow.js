import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("RUNAANS_BOW", (player) => {
    const startPos = player.getHeadLocation();
    const baseDirection = player.getViewDirection();
    
    // Three arrows: straight, left, right
    const directions = [
        baseDirection,
        { x: baseDirection.x - 0.3, y: baseDirection.y, z: baseDirection.z - 0.3 },
        { x: baseDirection.x + 0.3, y: baseDirection.y, z: baseDirection.z + 0.3 }
    ];

    directions.forEach((direction, index) => {
        let distance = 0;
        const arrowId = system.runInterval(() => {
            distance += 2;
            const currentPos = {
                x: startPos.x + direction.x * distance,
                y: startPos.y + direction.y * distance,
                z: startPos.z + direction.z * distance
            };

            player.dimension.spawnParticle("minecraft:villager_happy", currentPos);

            const entities = player.dimension.getEntities({
                location: currentPos,
                maxDistance: 1.9,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(entity => {
                entity.applyDamage(18, { cause: "magic", damagingEntity: player });
            });

            const block = player.dimension.getBlock(currentPos);
            if (distance >= 25 || entities.length > 0 || (block && block.typeId !== "minecraft:air")) {
                system.clearRun(arrowId);
            }
        }, 1);
    });

    player.playSound("random.bow");
}, manaReq.RUNAANS_BOW, true);