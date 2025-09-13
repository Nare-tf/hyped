import { manaReq } from "../itemsRegister.js"
import Registry from "./registry.js";
import { getPoint, getDist, Vec3 } from "../utils/utils.js";

Registry.register("AOTE", (player) => {
    let plLoc = player.getHeadLocation();
    let dist = 8;
    let tpcoord = getPoint(player.getViewDirection(), plLoc, dist);
    let targetBlock = player.getBlockFromViewDirection();
    if (targetBlock) {
        dist = getDist(plLoc, targetBlock.block.location) - 1;
        tpcoord = getPoint(
            player.getViewDirection(),
            plLoc,
            dist > 8 ? 8 : dist
        );
    }

    player.teleport(Vec3(tpcoord.x, tpcoord.y + 0.3, tpcoord.z));
    player.playSound("mob.endermen.portal");
}, manaReq.AOTE, true);
