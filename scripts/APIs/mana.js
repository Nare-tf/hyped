import { Player, ItemStack } from "@minecraft/server";
import { clamp } from "../utils/utils.js";
/**
 * Internal helper for mana operations
 * @param {Player} player
 * @returns {import("../types/types.js").ManaAPI}
 */
function ManaHelper(player) {
    return {
        get: () => player.getDynamicProperty("mana") ?? 0,
        set: (val = 0) => {
            const max = player.getDynamicProperty("maxMana") ?? 100;
            player.setDynamicProperty("mana", clamp(val, 0, max));
        },
        add: (val) => {
            const max = player.getDynamicProperty("maxMana") ?? 100;
            player.setDynamicProperty("mana", clamp(player.getDynamicProperty("mana") + val, 0, max));
        },
        remove: (val) => {
            const max = player.getDynamicProperty("maxMana") ?? 100;
            player.setDynamicProperty("mana", clamp(player.getDynamicProperty("mana") - val, 0, max));
        },
        has: (val = 0) => val === 0 ? false: (player.getDynamicProperty("mana") ?? 0) >= val,

        getMax: () => player.getDynamicProperty("maxMana") ?? 100,
        setMax: (val = 100) => {
            const newMax = Math.max(0, val);
            player.setDynamicProperty("maxMana", newMax);
            if ((player.getDynamicProperty("mana") ?? 0) > newMax) {
                player.setDynamicProperty("mana", newMax);
            }
        },
        addMax: (val) => {
            const newMax = Math.max(0, (player.getDynamicProperty("maxMana") ?? 100) + val);
            player.setDynamicProperty("maxMana", newMax);
            if ((player.getDynamicProperty("mana") ?? 0) > newMax) {
                player.setDynamicProperty("mana", newMax);
            }
        },
        removeMax: (val) => {
            const newMax = Math.max(0, (player.getDynamicProperty("maxMana") ?? 100) - val);
            player.setDynamicProperty("maxMana", newMax);
            if ((player.getDynamicProperty("mana") ?? 0) > newMax) {
                player.setDynamicProperty("mana", newMax);
            }
        },

        getRegen: () => player.getDynamicProperty("manaRegen") ?? 6,
        setRegen: (val = 6) => {
            player.setDynamicProperty("manaRegen", Math.max(0, val));
        },
        addRegen: (val) => {
            player.setDynamicProperty("manaRegen", Math.max(0, (player.getDynamicProperty("manaRegen") ?? 6) + val));
        },
        removeRegen: (val) => {
            player.setDynamicProperty("manaRegen", Math.max(0, (player.getDynamicProperty("manaRegen") ?? 6) - val));
        },

        regen: () => {
            const mana = player.getDynamicProperty("mana") ?? 0;
            const regen = player.getDynamicProperty("manaRegen") ?? 6;
            const max = player.getDynamicProperty("maxMana") ?? 100;
            player.setDynamicProperty("mana", clamp(mana + regen, 0, max));
        },

        init: (max = 100, regen = 6) => {
            player.setDynamicProperty("maxMana", max);
            player.setDynamicProperty("manaRegen", regen);
            player.setDynamicProperty("mana", max);
        }
    };
}

/**
 * @this {Player}
 * @returns {import("../types/types.js").ManaAPI}
 */
Player.prototype.mana = function () {
    return ManaHelper(this);
}; 

/**
 * 
 * @param {ItemStack} item 
 * @returns {import("../types/types.js").ItemManaCostAPI}
 */
function ItemStackHelper(item) {
    return {
        get: () => item.getDynamicProperty("manaCost") ?? 0,
        set: (val = 0) => {
            item.setDynamicProperty("manaCost", Math.max(0, val));
        },
        add: (val) => {
            item.setDynamicProperty("manaCost", Math.max(0, (item.getDynamicProperty("manaCost") ?? 0) + val));
        },
        remove: (val) => {
            item.setDynamicProperty("manaCost", Math.max(0, (item.getDynamicProperty("manaCost") ?? 0) - val));
        },
        has: (val = 0) => val === 0 ? false: (item.getDynamicProperty("manaCost") ?? 0) >= val
    };
}
/**
 * 
 * @this {ItemStack}
 * @returns {import("../types/types.js").ItemManaCostAPI}
 */
ItemStack.prototype.manaCost = function () {
    return ItemStackHelper(this);
}

