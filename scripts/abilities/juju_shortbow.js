import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { system } from "@minecraft/server";

Registry.register("JUJU_SHORTBOW", (player) => {
    let arrows = 0;
    const rapidFire = system.runInterval(() => {
        if (arrows >= 10) {
            system.clearRun(rapidFire);
            return;
        }

        const startPos = player.getHeadLocation();
        const direction = player.getViewDirection();
        let distance = 0;

        const arrowId = system.runInterval(() => {
            distance += 3;
            const currentPos = {
                x: startPos.x + direction.x * distance,
                y: startPos.y + direction.y * distance,
                z: startPos.z + direction.z * distance
            };

            player.dimension.spawnParticle("minecraft:basic_crit_particle", currentPos);

            const entities = player.dimension.getEntities({
                location: currentPos,
                maxDistance: 1.5,
                excludeNames: [player.name],
                excludeTypes: ["minecraft:item"]
            });

            entities.forEach(entity => {
                entity.applyDamage(12, { cause: "magic", damagingEntity: player });
            });

            const block = player.dimension.getBlock(currentPos);
            if (distance >= 20 || entities.length > 0 || (block && block.typeId !== "minecraft:air")) {
                system.clearRun(arrowId);
            }
        }, 1);

        arrows++;
        player.playSound("random.bow", { pitch: 1.5 });
    }, 2);
}, manaReq.JUJU_SHORTBOW, true);