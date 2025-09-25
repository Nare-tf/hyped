import Registry from "./registry.js";
import { manaReq } from "../itemsRegister.js";
import { WeaponFX } from "../fx/helix.js";

Registry.register("GIANTS_SWORD", (player) => {
    const playerPos = player.location;
    
    // Visual effect
    WeaponFX.shockwave(player, {
        maxRadius: 8,
        damage: 35,
        particleType: "minecraft:explosion_particle"
    });

    player.playSound("random.explode");
}, manaReq.GIANTS_SWORD, true);