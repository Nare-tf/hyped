import { ItemStack, Player, system , world } from "@minecraft/server";
import "./ManaAPI/core.js"
import Registry from "./abilities/registry.js";
import { updateManaDisplay } from "./utils/utils.js";
import "./abilities/init.js"
import { RecipeRegister } from "./recipes/recipe_registry.js";
import { MenuRegister } from "./menu/menu_register.js";
import { craftingUi } from "./ui/crafting_table_ui.js";
import "./menu/init.js";
import { itemEvents } from "./itemsRegister.js";

let i;
world.afterEvents.itemUse.subscribe(({itemStack: item, source: player}) => {
	if (item.nameTag === "craftingTable") craftingUi(player);
	if (item.nameTag === "menu") primaryMenu(player);
    (itemEvents[item.nameTag]?.includes("itemUse")) && Registry.use(item.nameTag, player, {});
})

world.afterEvents.itemStartUse.subscribe((evd) => {
    if (itemEvents[evd.itemStack.nameTag]?.includes("itemStartUse")) {
        if (itemEvents[evd.itemStack.nameTag].includes("repeat")) {
            Registry.use(evd.itemStack.nameTag,evd.source, {})
            i = (() => { Registry.use(evd.itemStack.nameTag,evd.source, {})})
        } 
        else Registry.use(evd.itemStack.nameTag, evd.source, {});
    }
})

world.afterEvents.itemStopUse.subscribe((evd) => {
    if (itemEvents[evd.itemStack.nameTag]?.includes("itemStopUse")) {
        if (itemEvents[evd.itemStack.nameTag].includes("repeat") && i) {
            i = undefined
        } 
        else if (!i) Registry.use(evd.itemStack.nameTag, evd.source, {});
    }
})

world.afterEvents.worldLoad.subscribe(() => {
    for (const player of world.getPlayers()) {
        if (!player.getDynamicProperty("maxMana")) player.mana().init(100, 6);
    }
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            player.mana().regen();
            updateManaDisplay(player, "display");}
    }, 20);
    RecipeRegister.register(
        [
            [{ typeId: "minecraft:iron_ingot" }, null, null],
            [{ typeId: "minecraft:stick" }, null, null]
        ],
        new ItemStack("minecraft:iron_sword", 1),
        { shaped: true }
    );
    system.runInterval(() => i && i(), 10)


})


// basic ingame script tester
world.beforeEvents.chatSend.subscribe((evd) => {
    let k;
    if ((k = evd.message.trim().split(" ")).shift() === "repl") {
        eval(k.join(" "));
        evd.cancel = true;
        console.warn(`repl: ${k.join(" ")}`); // log it to console too
    }
}) 
function primaryMenu(player) {
	MenuRegister.show("prime_menu", player)
}
