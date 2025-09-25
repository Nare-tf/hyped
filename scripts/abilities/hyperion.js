import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("HYPERION", (player) => {
    // Heal + mana orbs
    player.addEffect("regeneration", 10 * 20, { amplifier: 2 });
    player.mana().add(50);

    // Spawn healing orbs around player
    const playerPos = player.location;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const orbPos = {
            x: playerPos.x + Math.cos(angle) * 3,
            y: playerPos.y + 2,
            z: playerPos.z + Math.sin(angle) * 3
        };

        let orbLife = 0;
        const orbId = system.runInterval(() => {
            orbLife++;
            player.dimension.spawnParticle("minecraft:heart_particle", orbPos);

            if (orbLife > 100) {
                system.clearRun(orbId);
            }

            // Heal nearby players
            const nearbyPlayers = player.dimension.getPlayers({
                location: orbPos,
                maxDistance: 2
            });

            nearbyPlayers.forEach(p => {
                if (p.id !== player.id) {
                    p.addEffect("regeneration", 3 * 20, { amplifier: 1 });
                }
            });
        }, 5);
    }

    player.playSound("random.orb");
}, manaReq.HYPERION, true);