import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("SHADOW_FURY", (player) => {
    const playerPos = player.location;
    const clonePositions = [
        { x: playerPos.x + 2, y: playerPos.y, z: playerPos.z },
        { x: playerPos.x - 2, y: playerPos.y, z: playerPos.z },
        { x: playerPos.x, y: playerPos.y, z: playerPos.z + 2 },
        { x: playerPos.x, y: playerPos.y, z: playerPos.z - 2 }
    ];

    let attacks = 0;
    const shadowAttack = system.runInterval(() => {
        if (attacks >= 4) {
            system.clearRun(shadowAttack);
            return;
        }

        const clonePos = clonePositions[attacks];
        player.dimension.spawnParticle("minecraft:dragon_dying_explosion", clonePos);

        const entities = player.dimension.getEntities({
            location: clonePos,
            maxDistance: 3,
            excludeNames: [player.name],
            excludeTypes: ["minecraft:item"]
        });

        entities.forEach(entity => {
            entity.applyDamage(15, { cause: "magic", damagingEntity: player });
            player.dimension.spawnParticle("minecraft:crit_particle", entity.location);
        });

        attacks++;
    }, 5);

    player.playSound("mob.wither.shoot");
}, manaReq.SHADOW_FURY, true);
