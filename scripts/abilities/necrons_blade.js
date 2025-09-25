import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("NECRONS_BLADE", (player) => {
    const playerPos = player.location;

    // Life steal aura
    let duration = 0;
    const auraId = system.runInterval(() => {
        duration++;
        
        // Spawn dark particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + (duration * 0.1);
            const particlePos = {
                x: playerPos.x + Math.cos(angle) * 4,
                y: playerPos.y + 1,
                z: playerPos.z + Math.sin(angle) * 4
            };
            player.dimension.spawnParticle("minecraft:dragon_dying_explosion", particlePos);
        }

        // Damage and heal
        const entities = player.dimension.getEntities({
            location: playerPos,
            maxDistance: 5,
            excludeNames: [player.name],
            excludeTypes: ["minecraft:item"]
        });

        let totalDamage = 0;
        entities.forEach(entity => {
            const damage = 8;
            entity.applyDamage(damage, { cause: "magic", damagingEntity: player });
            totalDamage += damage;
        });

        // Life steal: heal for 50% of damage dealt
        if (totalDamage > 0) {
            player.addEffect("instant_health", 1, { amplifier: Math.floor(totalDamage * 0.5 / 4) });
        }

        if (duration >= 100) { // 5 seconds
            system.clearRun(auraId);
        }
    }, 2);

    player.playSound("mob.wither.ambient");
}, manaReq.NECRONS_BLADE, true);