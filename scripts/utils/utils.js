import { ItemStack } from "@minecraft/server";
import Registry from "../abilities/registry";

/**
 * 
 * @param {import("@minecraft/server").Vector3} direction 
 * @param {import("@minecraft/server").Vector3} location
 * @param {Number} dist
 * @returns {import("@minecraft/server").Vector3}
 */
function getPoint(direction, location, dist) {
    return {
        x: location.x + direction.x * dist,
        y: location.y + direction.y * dist,
        z: location.z + direction.z * dist
    }
}
/**
 * 
 * @param {import("@minecraft/server").Vector3} loc1 
 * @param {import("@minecraft/server").Vector3} loc2 
 * @returns {Number}
 */
function getDist(loc1, loc2) {
    return Math.hypot(loc1.x - loc2.x, loc1.y - loc2.y, loc1.z - loc2.z);
}

/**
 * 
 * @param {import("@minecraft/server").Player} player 
 * @param {"display" | "hide" | "subtract" | "add"} mode 
 * @param  {...any} args 
 */
function updateManaDisplay(player, mode, ...args) {
    switch (mode) {
        case "display":
            player.onScreenDisplay.setActionBar(`§9Mana: §b${player.mana().get()}§7/§b${player.mana().getMax()}`);
            break;
        case "hide":
            break;
        case "subtract":
            player.onScreenDisplay.setActionBar(`§9Mana: §b${player.mana().get()}§7/§b${player.mana().getMax()} §c-${args[0]}`);
            player.mana().remove(args[0]);
            break;
        case "add":
            player.onScreenDisplay.setActionBar(`§9Mana: §b${player.mana().get()}§7/§b${player.mana().getMax()} §a+${args[0]}`);
            player.mana().add(args[0]);
            break;
    }
} 

/**
 * 
 * @param {Number} val 
 * @param {Number} min 
 * @param {Number} max 
 * @returns Number
 */
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
/**
 * 
 * @param {ItemStack} item1 
 * @param {ItemStack} item2 
 * @returns {Boolean}
 */
function isSameItem(item1, item2) {
    if (!item1 || !item2) return false
    if (item1.typeId !== item2.typeId) return false;
    if (item1.nameTag !== item2.nameTag) return false;
    if ((item1.getLore() && !item2.getLore()) || (item2.getLore() && !item1.getLore())) return false;
    if (!sameArray(item1.getLore(), item2.getLore())) return false
    return true
}
/**
 * 
 * @param {Array} arr1 
 * @param {Array} arr2 
 * @returns {Boolean}
 */
function sameArray(arr1, arr2)  {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false
    if (arr1.length !== arr2.length) return false
    for (let i in arr1) {
        if (arr1[i] !== arr2[i]) return false
    }
    return true
}
/**
 * 
 * @param {ItemStack} toItem 
 * @param {ItemStack} fromItem 
 * @returns {Number | void}
 */
function stackNum(fromItem, toItem) {
    if (!fromItem || !toItem) return
    if (toItem.isStackableWith(fromItem)) {
        const toAmt = toItem.amount
        const fromAmt = fromItem.amount
        if (toAmt < toItem.maxAmount) {
            const diff = toItem.maxAmount - toAmt
            if (diff <= fromAmt) {
                return diff
            } else if (diff >  fromAmt) {
                return fromAmt
            }
        }
    }
}

/**
 * 
 * @param {Player} player 
 * @param {ItemStack} itemStack 
 * @param {Number} amount 
 */
/**
 * @param {Entity} entity
 * @param {ItemStack | ItemStack[]} items
 */
function giveItem(entity, items) {
    const inv = entity.getComponent('inventory')?.container;
    if (inv == undefined) return;
    if (!Array.isArray(items)) items = [items];

    for (let item of items) {
        if (item == undefined) continue;

        item = inv.addItem(item);
        if (item) try {
            entity.dimension.spawnItem(item, entity.location);
        } catch {}
    } 
}
/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} z 
 * @returns {import("@minecraft/server").Vector3}
 */
const Vec3 = (x,y,z) => ({x:x,y:y,z:z})
export { getPoint, getDist, updateManaDisplay, clamp, stackNum, sameArray, isSameItem, giveItem, Vec3};