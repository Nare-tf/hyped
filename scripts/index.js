import { ItemStack, Player, system , world } from "@minecraft/server";
import "./APIs/mana.js"
import Registry from "./abilities/registry.js";
import { updateManaDisplay } from "./utils/utils.js";
import "./abilities/init.js"
import { RecipeRegister } from "./recipes/recipe_registry.js";
import { MenuRegister } from "./menu/menu_register.js";
import { craftingUi } from "./ui/crafting_table_ui.js";
import "./menu/init.js";
import { ITEMS } from "./itemsRegister.js";
import { chestDB } from "./ui/chest_ui.js";

// let i;
// world.afterEvents.itemUse.subscribe(({itemStack: item, source: player}) => {
// 	if (item.nameTag === "craftingTable") craftingUi(player);
// 	if (item.nameTag === "menu") primaryMenu(player);
//     (itemEvents[item.nameTag]?.includes("itemUse")) && Registry.use(item.nameTag, player, {});
// })

// world.afterEvents.itemStartUse.subscribe((evd) => {
//     if (itemEvents[evd.itemStack.nameTag]?.includes("itemStartUse")) {
//         if (itemEvents[evd.itemStack.nameTag].includes("repeat")) {
//             Registry.use(evd.itemStack.nameTag,evd.source, {})
//             i = (() => { Registry.use(evd.itemStack.nameTag,evd.source, {})})
//         } 
//         else Registry.use(evd.itemStack.nameTag, evd.source, {});
//     }
// })

// world.afterEvents.itemStopUse.subscribe((evd) => {
//     if (itemEvents[evd.itemStack.nameTag]?.includes("itemStopUse")) {
//         if (itemEvents[evd.itemStack.nameTag].includes("repeat") && i) {
//             i = undefined
//         } 
//         else if (!i) Registry.use(evd.itemStack.nameTag, evd.source, {});
//     }
// })









class ItemEventHandler {
    constructor() {
        this.activeRepeats = new Map(); // player.id -> intervalId
        this.cooldowns = new Map(); // `${player.id}:${itemName}` -> timestamp
    }

    isOnCooldown(player, itemName) {
        const key = `${player.id}:${itemName}`;
        const lastUse = this.cooldowns.get(key);
        if (!lastUse) return false;
        
        const cooldownTime = ITEMS[itemName]?.cooldown || 0;
        return (Date.now() - lastUse) < cooldownTime;
    }

    setCooldown(player, itemName) {
        const key = `${player.id}:${itemName}`;
        this.cooldowns.set(key, Date.now());
    }

    handleItemUse(player, itemName, eventType) {
        const config = ITEMS[itemName];
        if (!config || !config.events.has(eventType)) return;

        if (this.isOnCooldown(player, itemName)) {
            player.sendMessage(`§cAbility on cooldown!`);
            return;
        }

        Registry.use(itemName, player, {});
        this.setCooldown(player, itemName);
    }

    startRepeat(player, itemName) {
        const config = ITEMS[itemName];
        if (!config?.repeat) return;

        const playerId = player.id;
        if (this.activeRepeats.has(playerId)) return;

        // Initial use
        this.handleItemUse(player, itemName, "itemStartUse");

        // Start repeat
        const intervalId = system.runInterval(() => {
            if (!world.getPlayers().find(p => p.id === playerId)) {
                // Player left, cleanup
                this.stopRepeat(playerId);
                return;
            }
            Registry.use(itemName, player, {});
        }, 10);

        this.activeRepeats.set(playerId, intervalId);
    }

    stopRepeat(playerId) {
        const intervalId = this.activeRepeats.get(playerId);
        if (intervalId) {
            system.clearRun(intervalId);
            this.activeRepeats.delete(playerId);
        }
    }
}

const itemHandler = new ItemEventHandler();

// Single event handler with routing
world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
    if (itemStack.nameTag === "craftingTable") return craftingUi(source);
    if (itemStack.nameTag === "menu") return primaryMenu(source);
    
    itemHandler.handleItemUse(source, itemStack.nameTag, "itemUse");
});

world.afterEvents.itemStartUse.subscribe(({itemStack, source}) => {
    const config = ITEMS[itemStack.nameTag];
    if (!config) return;

    if (config.repeat) {
        itemHandler.startRepeat(source, itemStack.nameTag);
    } else if (config.events.has("itemStartUse")) {
        itemHandler.handleItemUse(source, itemStack.nameTag, "itemStartUse");
    }
});

world.afterEvents.itemStopUse.subscribe(({itemStack, source}) => {
    const config = ITEMS[itemStack.nameTag];
    if (!config) return;

    if (config.repeat) {
        itemHandler.stopRepeat(source.id);
    } else if (config.events.has("itemStopUse")) {
        itemHandler.handleItemUse(source, itemStack.nameTag, "itemStopUse");
    }
});








world.afterEvents.worldLoad.subscribe(() => {
    for (const player of world.getPlayers()) {
        if (!player.getDynamicProperty("maxMana")) player.mana().init(100, 6);
    }
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            player.mana().regen();
            updateManaDisplay(player, "display");}
    }, 20);
    // RecipeRegister.register(
    //     [
    //         [{ typeId: "minecraft:iron_ingot", amount: 2 }, null, null],
    //         [{ typeId: "minecraft:stick" }, null, null]
    //     ],
    //     new ItemStack("minecraft:iron_sword", 1),
    //     { shaped: true }
    // );
    RecipeRegister.register(
        [
            { typeId: "minecraft:iron_ingot", amount: 2 },
            { typeId: "minecraft:stick" }
        ],
        new ItemStack("minecraft:iron_sword", 1),
        { shaped: false }
    );
    //system.runInterval(() => i && i(), 10)


})


// basic ingame script tester
world.beforeEvents.chatSend.subscribe((evd) => {
    let k;
    if ((k = evd.message.trim().split(" ")).shift() === "repl") {
        eval(k.join(" "));
        evd.cancel = true;
        console.warn(`repl: ${k.join(" ")}`); // log it to console too
    }
    if (evd.message  == "log") system.run(() => console.warn(...chestDB.keys()))
}) 
function primaryMenu(player) {
	MenuRegister.show("prime_menu", player)
}
