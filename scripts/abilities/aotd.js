import Registry from "./registry";
import { manaReq } from "../itemsRegister"
Registry.register("AOTD", (player) => {
    player.sendMessage("§6[§eAOTD§6] §aAbility not yet implemented!");
}, manaReq.AOTD, true);  