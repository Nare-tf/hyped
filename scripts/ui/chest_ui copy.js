import { AccessibleChestFormData } from "./base.js";
import { giveItem, isSameItem, stackNum } from "../utils/utils.js";
import { ItemDB } from "../database/ItemDB-c.js";
import { system, world } from "@minecraft/server";

// Global ItemDB instance for chest storage
const ChestFormData = AccessibleChestFormData
let chestDB = null;

// Initialize when first used
function getChestDB() {
    if (!chestDB) {
        try {
            chestDB = new ItemDB("chest_storage");
        } catch (error) {
            throw new Error("World not loaded yet. Cannot access chest storage.");
        }
    }
    return chestDB;
}
world.afterEvents.worldLoad.subscribe(getChestDB)

/**
 * Enhanced interactive chest UI with ItemDB integration
 * @param {Player} player 
 * @param {number|undefined} old - Previously selected slot
 * @param {Object} data - Persistent data object
 * @param {Object} chestConfig - Chest configuration
 */
export function chestUi(player, old, data = {
    onToggle: false,
    toggleSlot: null,
    cOld: null,
    old: null,
    oldPres: undefined,
    chestItems: new Map(),
    chestId: null,
    autoSave: true
}, chestConfig = {
    title: "Chest",
    size: "large", 
    pattern: [],
    keys: {},
    chestId: null, // Database key for persistent storage
    onItemChange: null,
    allowPlayerItems: true,
    allowChestItems: true,
    readOnly: false,
    autoSave: true, // Auto-save to database on changes
    saveInterval: 100 // Auto-save every 100 ticks if dirty
}) {
    const inv = player.getComponent("inventory").container;
    const chestUI = new ChestFormData(chestConfig.size).title(chestConfig.title);

    // Initialize chest ID and load from database
    if (!data.chestId && chestConfig.chestId) {
        data.chestId = chestConfig.chestId;
        loadChestFromDB(data);
    }

    // Apply pattern if provided
    if (chestConfig?.pattern?.length > 0) {
        chestUI.pattern(chestConfig.pattern, chestConfig.keys);
    }

    // Place chest items
    data.chestItems.forEach((item, slot) => {
        if (item && slot < chestUI.slotCount) {
            const typeId = item.typeId;
            const durability = item.getComponent('durability');
            const durDamage = durability ? Math.round((durability.maxDurability - durability.damage) / durability.maxDurability * 99) : 0;
            const formattedName = item.nameTag || typeId.replace(/.*:/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
            
            chestUI.button(slot, formattedName, item.getLore(), typeId, item.amount, durDamage, false);
        }
    });

    chestUI.show(player).then(response => {
        if (response.canceled) {
            // Save to database before closing
            if (data.chestId && chestConfig.autoSave) {
                saveChestToDB(data);
            } else if (chestConfig.allowPlayerItems) {
                // Return items if not persistent
                const itemsToGive = Array.from(data.chestItems.values()).filter(Boolean);
                giveItem(player, itemsToGive);
                data.chestItems.clear();
            }
            return;
        }

        const selection = response.selection;
        let slot = selection;

        const getSelectionType = (sel) => {
            if (sel < chestUI.slotCount) return { type: "chest", slot: sel };
            return { type: "inventory", slot: sel - chestUI.slotCount };
        };

        const pres = getSelectionType(selection);
        slot = pres.slot;

        const getItem = (type, index) => {
            return type === "inventory" ? inv.getItem(Number(index)) : data.chestItems.get(index);
        };

        const setItem = (type, index, item) => {
            if (type === "inventory") {
                inv.setItem(Number(index), item);
            } else {
                if (item) {
                    data.chestItems.set(index, item);
                } else {
                    data.chestItems.delete(index);
                }
                
                // Mark as dirty for auto-save
                data.isDirty = true;
                
                // Trigger callback
                chestConfig.onItemChange?.(index, item, data.chestItems);
                
                // Immediate save if enabled
                if (data.chestId && chestConfig.autoSave) {
                    saveChestToDB(data);
                }
            }
        };

        const handleToggle = (targetType, targetSlot, toItem) => {
            const toggleItem = getItem(...data.toggleSlot.split(":"));
            if (!toggleItem) return resetToggle();

            if (toggleItem.amount - 1 <= 0) {
                setItem(...data.toggleSlot.split(":"), null);
            } else {
                toggleItem.amount -= 1;
                setItem(...data.toggleSlot.split(":"), toggleItem);
            }

            if (!toItem) {
                const newItem = toggleItem.clone();
                newItem.amount = 1;
                setItem(targetType, targetSlot, newItem);
            } else if (isSameItem(toItem, toggleItem)) {
                toItem.amount += 1;
                setItem(targetType, targetSlot, toItem);
            } else {
                toggleItem.amount += 1;
                setItem(...data.toggleSlot.split(":"), toggleItem);
                resetToggle();
            }
        };

        const resetToggle = () => {
            data.onToggle = false;
            data.toggleSlot = null;
            slot = undefined;
        };

        const handleMove = (fromItem, toItem, fromType, fromSlot, toType, toSlot) => {
            if (chestConfig.readOnly && toType === "chest") return;
            if (!chestConfig.allowPlayerItems && fromType === "inventory" && toType === "chest") return;
            if (!chestConfig.allowChestItems && fromType === "chest" && toType === "chest") return;

            const diff = stackNum(fromItem, toItem);
            if (diff) {
                if (fromItem.amount - diff <= 0) {
                    setItem(fromType, fromSlot, null);
                } else {
                    fromItem.amount -= diff;
                    setItem(fromType, fromSlot, fromItem);
                }

                if (toItem) {
                    toItem.amount += diff;
                    setItem(toType, toSlot, toItem);
                } else {
                    const newItem = fromItem.clone();
                    newItem.amount = diff;
                    setItem(toType, toSlot, newItem);
                }
            } else {
                setItem(toType, toSlot, fromItem);
                setItem(fromType, fromSlot, toItem);
            }
        };

        const processSelection = (type) => {
            const fromType = data.oldPres;
            const fromSlot = fromType === "inventory" ? old : data.cOld;
            const fromItem = (old !== undefined) ? getItem(fromType, fromSlot) : null;
            const toItem = getItem(type, slot);

            if (data.toggleSlot === `${type}:${slot}`) {
                resetToggle();
            } else if (fromItem?.isStackable && !data.onToggle && fromSlot === slot) {
                data.onToggle = true;
                data.toggleSlot = `${type}:${slot}`;
            }

            if (data.onToggle && (data.toggleSlot !== `${type}:${slot}`)) {
                handleToggle(type, slot, toItem);
                data.old = slot;
                if (type === "chest") data.cOld = slot;
                slot = undefined;
            } else if (fromItem && fromSlot !== slot) {
                handleMove(fromItem, toItem, fromType, fromSlot, type, slot);
                slot = undefined;
            } else {
                data.old = slot;
                if (type === "chest") data.cOld = slot;
            }

            data.oldPres = type;
            chestUi(player, slot, data, chestConfig);
        };

        if (pres.type === "inventory" || pres.type === "chest") {
            processSelection(pres.type);
        }
    });
}

/**
 * Load chest contents from ItemDB
 * @param {Object} data 
 */
function loadChestFromDB(data) {
    if (!data.chestId) return;
    
    try {
        if (chestDB.has(data.chestId)) {
            const items = chestDB.get(data.chestId);
            if (Array.isArray(items)) {
                data.chestItems.clear();
                items.forEach((item, index) => {
                    if (item) data.chestItems.set(index, item);
                });
            }
        }
    } catch (error) {
        console.error(`Failed to load chest ${data.chestId}:`, error.message);
    }
}

/**
 * Save chest contents to ItemDB
 * @param {Object} data 
 */
function saveChestToDB(data) {
    if (!data.chestId) return;
    
    try {
        const itemArray = [];
        const maxSlot = Math.max(...data.chestItems.keys(), -1);
        
        for (let i = 0; i <= maxSlot; i++) {
            itemArray[i] = data.chestItems.get(i) || undefined;
        }
        
        if (itemArray.length > 0) {
            chestDB.set(data.chestId, itemArray);
        } else {
            // Delete empty chest
            if (chestDB.has(data.chestId)) {
                chestDB.delete(data.chestId);
            }
        }
        
        data.isDirty = false;
    } catch (error) {
        console.error(`Failed to save chest ${data.chestId}:`, error.message);
    }
}

// ========== SPECIALIZED CHEST TYPES ==========

/**
 * Player's personal ender chest (persistent storage)
 * @param {Player} player 
 */
export function enderChest(player) {
    const chestId = `ender_${player.name}`;
    
    chestUi(player, undefined, {
        onToggle: false,
        toggleSlot: null,
        cOld: null,
        old: null,
        oldPres: undefined,
        chestItems: new Map(),
        autoSave: true
    }, {
        title: "§5Ender Chest",
        size: "large",
        chestId,
        autoSave: true,
        allowPlayerItems: true,
        allowChestItems: true,
        readOnly: false
    });
}

/**
 * Shared storage chest at specific location
 * @param {Player} player 
 * @param {Vector3} location 
 * @param {string} title 
 */
export function storageChest(player, location, title = "Storage Chest") {
    const chestId = `storage_${Math.floor(location.x)}_${Math.floor(location.y)}_${Math.floor(location.z)}`;
    
    chestUi(player, undefined, {
        onToggle: false,
        toggleSlot: null,
        cOld: null,
        old: null,
        oldPres: undefined,
        chestItems: new Map(),
        chestId,
        autoSave: true
    }, {
        title,
        size: "large",
        chestId,
        autoSave: true,
        allowPlayerItems: true,
        allowChestItems: true,
        readOnly: false
    });
}

/**
 * Guild/team shared storage
 * @param {Player} player 
 * @param {string} guildId 
 * @param {string} tier - "small", "large", etc.
 */
export function guildChest(player, guildId, tier = "large") {
    const chestId = `guild_${guildId}_storage`;
    
    chestUi(player, undefined, {
        onToggle: false,
        toggleSlot: null,
        cOld: null,
        old: null,
        oldPres: undefined,
        chestItems: new Map(),
        autoSave: true
    }, {
        title: `§6Guild Storage`,
        size: tier,
        chestId,
        autoSave: true,
        allowPlayerItems: true,
        allowChestItems: true,
        readOnly: false,
        onItemChange: (slot, item, allItems) => {
            // Could log guild activity
            // console.log(`Guild ${guildId}: Item changed at slot ${slot}`);
        }
    });
}

/**
 * Auction house interface (browse-only)
 * @param {Player} player 
 * @param {Map<number, {item: ItemStack, price: number, seller: string}>} auctions 
 */
export function auctionHouse(player, auctions = new Map()) {
    const data = {
        onToggle: false,
        toggleSlot: null,
        cOld: null,
        old: null,
        oldPres: undefined,
        chestItems: new Map()
    };

    // Convert auctions to display items with price lore
    auctions.forEach((auction, slot) => {
        const displayItem = auction.item.clone();
        const currentLore = displayItem.getLore() || [];
        displayItem.setLore([
            ...currentLore,
            `§6Price: §e${auction.price} coins`,
            `§7Seller: §f${auction.seller}`,
            `§aClick to purchase!`
        ]);
        data.chestItems.set(slot, displayItem);
    });

    chestUi(player, undefined, data, {
        title: "§6Auction House",
        size: "large",
        pattern: [
            'ggggggggg',
            'g       g',
            'g       g',
            'g       g',
            'g       g',
            'ggggggggg'
        ],
        keys: {
            g: ["", [], "minecraft:yellow_glass_pane", 1, 0, false]
        },
        allowPlayerItems: false,
        allowChestItems: false,
        readOnly: true,
        onItemChange: (slot, item, allItems) => {
            if (!item && auctions.has(slot)) {
                // Handle purchase
                const auction = auctions.get(slot);
                handleAuctionPurchase(player, auction);
            }
        }
    });
}

/**
 * Handle auction purchase logic
 * @param {Player} player 
 * @param {Object} auction 
 */
function handleAuctionPurchase(player, auction) {
    // Check if player has enough money (would need economy system)
    // if (getPlayerMoney(player) >= auction.price) {
    //     giveItem(player, auction.item);
    //     deductMoney(player, auction.price);
    //     addMoney(auction.seller, auction.price);
    //     player.sendMessage(`§aPurchased ${auction.item.nameTag} for ${auction.price} coins!`);
    // } else {
    //     player.sendMessage(`§cNot enough coins! Need ${auction.price} coins.`);
    // }
    
    player.sendMessage(`§cPurchase system not implemented yet!`);
}

/**
 * Shop interface with preset items
 * @param {Player} player 
 * @param {Map<number, {item: ItemStack, price: number}>} shopItems 
 * @param {string} shopName 
 */
export function shopChest(player, shopItems = new Map(), shopName = "Shop") {
    const data = {
        onToggle: false,
        toggleSlot: null,
        cOld: null,
        old: null,
        oldPres: undefined,
        chestItems: new Map()
    };

    // Setup shop items with price lore
    shopItems.forEach((shop, slot) => {
        const displayItem = shop.item.clone();
        const currentLore = displayItem.getLore() || [];
        displayItem.setLore([
            ...currentLore,
            `§6Price: §e${shop.price} coins`,
            `§aClick to buy!`
        ]);
        data.chestItems.set(slot, displayItem);
    });

    chestUi(player, undefined, data, {
        title: `§6${shopName}`,
        size: "large",
        allowPlayerItems: false,
        allowChestItems: false,
        readOnly: true,
        onItemChange: (slot, item, allItems) => {
            if (!item && shopItems.has(slot)) {
                const shopItem = shopItems.get(slot);
                // Handle purchase logic here
                player.sendMessage(`§aTrying to buy ${shopItem.item.nameTag} for ${shopItem.price} coins!`);
                // Restore the item (it's a shop, items don't disappear)
                setTimeout(() => {
                    data.chestItems.set(slot, shopItem.item.clone());
                }, 50);
            }
        }
    });
}

// Export the ItemDB instance for external access
export { chestDB };
