export const ITEMS = {
    "AOTE": { mana: 50, events: new Set(["itemUse"]), cooldown: 0, category: "utility" },
    "AOTV": { mana: 45, events: new Set(["itemStartUse", "itemStopUse"]), repeat: true, cooldown: 0, category: "utility" },
    "AOTD": { mana: 100, events: new Set(["itemUse"]), cooldown: 0, category: "sword" },
    "ROGUE_SWORD": { mana: 50, events: new Set(["itemUse"]), cooldown: 1000, category: "sword" },
    
    // New weapons
   // "LIVID_DAGGER": { mana: 80, events: new Set(["itemUse"]), cooldown: 3000, category: "dagger" },
    "FLOWER_OF_TRUTH": { mana: 120, events: new Set(["itemUse"]), cooldown: 2000, category: "sword" },
    "SHADOW_FURY": { mana: 150, events: new Set(["itemUse"]), cooldown: 5000, category: "sword" },
    "GIANTS_SWORD": { mana: 200, events: new Set(["itemUse"]), cooldown: 8000, category: "sword" },
    "TERMINATOR": { mana: 180, events: new Set(["itemUse"]), cooldown: 6000, category: "bow" },
    "JUJU_SHORTBOW": { mana: 100, events: new Set(["itemUse"]), cooldown: 2000, category: "bow" },
    "RUNAANS_BOW": { mana: 90, events: new Set(["itemUse"]), cooldown: 1500, category: "bow" },
    "HYPERION": { mana: 300, events: new Set(["itemUse"]), cooldown: 15000, category: "utility" },
    "VALKYRIE": { mana: 150, events: new Set(["itemUse"]), cooldown: 10000, category: "utility" },
    "NECRONS_BLADE": { mana: 250, events: new Set(["itemUse"]), cooldown: 12000, category: "sword" }
};
// Backward compatibility exports
export const manaReq = Object.fromEntries(
    Object.entries(ITEMS).map(([key, config]) => [key, config.mana])
);

export const itemEvents = Object.fromEntries(
    Object.entries(ITEMS).map(([key, config]) => [
        key, 
        [...config.events, ...(config.repeat ? ["repeat"] : [])]
    ])
);