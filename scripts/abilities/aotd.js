import Registry from "./registry";
import { manaReq } from "../itemsRegister"
import { WeaponFX } from "../fx/helix";
Registry.register("AOTD", (player) => {
    //player.sendMessage("§6[§eAOTD§6] §aAbility not yet implemented!");
    WeaponFX.aotdFireHelix(player, {
        duration: 20,        // 2.25 seconds
        maxRadius: 1.5,        // Max expansion radius
        helixHeight: 4,     // Forward distance
        spirals: 4,          // Two intertwining spirals
        damage: 18,          // Base damage
        particlesPerSpiral: 1, // Particle density
        allowMultiple: true
    });
    player.playSound("mob.enderdragon.growl", {volume: 0.5})
}, manaReq.AOTD, true);  