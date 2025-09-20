export const ITEMS = {
    "AOTE": {
        mana: 50,
        events: new Set(["itemUse"]),
        cooldown: 0
    },
    "AOTV": {
        mana: 45,
        events: new Set(["itemStartUse", "itemStopUse"]),
        repeat: true,
        cooldown: 0
    },
    "AOTD": {
        mana: 100,
        events: new Set(["itemUse"]),
        cooldown: 0 // 2 second cooldown
    },
    "ROGUE_SWORD": {
        mana: 50,
        events: new Set(["itemUse"]),
        cooldown: 1000
    }
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