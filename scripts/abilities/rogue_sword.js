import Registry from "./registry";
import { manaReq } from "../itemsRegister"

Registry.register("ROGUE_SWORD", (player) => {
    player.addEffect("speed", 5*20, {showParticles: false, amplifier: 5});
}, manaReq.ROGUE_SWORD, true);  