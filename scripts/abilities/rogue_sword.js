import Registry from "./registry";
import { manaReq } from "../itemsRegister"
import { WeaponFX } from "../fx/helix";

Registry.register("ROGUE_SWORD", (player) => {
    player.addEffect("speed", 5*20, {showParticles: false, amplifier: 5});
     WeaponFX.bladeArc(player, {particle: "minecraft:basic_crit_particle", steps: 6, radius: 1.5})
    // WeaponFX.icicleBurst(player)
    // WeaponFX.lightningStrike(player)
    // WeaponFX.shockwave(player)
}, manaReq.ROGUE_SWORD, true);  