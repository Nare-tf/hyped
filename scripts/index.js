// index.js - Complete integrated initialization
import { ItemStack, Player, system, world } from "@minecraft/server";
import "./APIs/mana.js";
import "./APIs/stats.js";
import "./APIs/progression.js";
import "./APIs/prestige.js";
import "./APIs/mastery.js";

import Registry from "./abilities/registry.js";
import { updateManaDisplay } from "./utils/utils.js";
import "./abilities/init.js";
import { RecipeRegister } from "./recipes/recipe_registry.js";
import { MenuRegister } from "./menu/menu_register.js";
import { craftingUi } from "./ui/crafting_table_ui.js";
import "./menu/init.js";
import { ITEMS } from "./itemsRegister.js";
import { chestDB } from "./ui/chest_ui.js";
import { GameTracker, AchievementSystem } from "./APIs/tracker.js";
import { EquipmentManager, createItemWithStats } from "./APIs/stats.js";
import { AdvancedRecipes } from "./recipes/advanced_recipes.js";

// Enhanced ItemEventHandler with stats integration
class ItemEventHandler {
    constructor() {
        this.activeRepeats = new Map();
        this.cooldowns = new Map();
    }

    isOnCooldown(player, itemName) {
        const key = `${player.id}:${itemName}`;
        const lastUse = this.cooldowns.get(key);
        if (!lastUse) return false;
        
        const config = ITEMS[itemName];
        if (!config) return false;

        // Apply attack speed reduction to cooldowns
        const attackSpeed = player.stats().getAttackSpeed();
        const cooldownReduction = Math.min(attackSpeed * 0.01, 0.8); // Max 80% reduction
        const adjustedCooldown = config.cooldown * (1 - cooldownReduction);
        
        return (Date.now() - lastUse) < adjustedCooldown;
    }

    setCooldown(player, itemName) {
        const key = `${player.id}:${itemName}`;
        this.cooldowns.set(key, Date.now());
    }

    handleItemUse(player, itemName, eventType) {
        const config = ITEMS[itemName];
        if (!config || !config.events.has(eventType)) return;

        if (this.isOnCooldown(player, itemName)) {
            const attackSpeed = player.stats().getAttackSpeed();
            const cooldownText = attackSpeed > 0 ? ` (${attackSpeed} Attack Speed)` : "";
            player.sendMessage(`§cAbility on cooldown!${cooldownText}`);
            return;
        }

        // Enhanced context with full stats
        const enhancedContext = {
            player,
            stats: player.stats().getAll(),
            masteryLevel: player.mastery().getLevel(itemName),
            masteryBonuses: player.mastery().getBonuses(itemName),
            equipmentStats: EquipmentManager.getEquipmentStats(player)
        };

        Registry.use(itemName, player, enhancedContext);
        this.setCooldown(player, itemName);
    }

    startRepeat(player, itemName) {
        const config = ITEMS[itemName];
        if (!config?.repeat) return;

        const playerId = player.id;
        if (this.activeRepeats.has(playerId)) return;

        this.handleItemUse(player, itemName, "itemStartUse");

        const intervalId = system.runInterval(() => {
            const currentPlayer = world.getPlayers().find(p => p.id === playerId);
            if (!currentPlayer) {
                this.stopRepeat(playerId);
                return;
            }
            
            const currentItem = currentPlayer.getComponent("inventory").container.getItem(currentPlayer.selectedSlotIndex);
            if (currentItem?.nameTag === itemName) {
                Registry.use(itemName, currentPlayer, {});
            }
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

// Enhanced event handlers
world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
    if (itemStack.nameTag === "craftingTable") return craftingUi(source);
    if (itemStack.nameTag === "menu") return primaryMenu(source);
    if (itemStack.nameTag === "stats") return showStatsMenu(source);
    
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

// Equipment change detection
world.afterEvents.itemCompleteUse.subscribe(({source: player}) => {
    EquipmentManager.updatePlayerStats(player);
});

// // Enhanced damage system
// world.afterEvents.entityHurt.subscribe((event) => {
//     const { damageSource, hurtEntity } = event;
    
//     // Player dealing damage - apply strength/crit bonuses
//     if (damageSource.damagingEntity?.typeId === "minecraft:player") {
//         const attacker = damageSource.damagingEntity;
//         const { damage, isCritical } = attacker.stats().calculateDamage(event.damage);
        
//         event.damage = damage;
        
//         if (isCritical) {
//             attacker.sendMessage("§c§lCRITICAL STRIKE!");
//             attacker.playSound("random.orb", { pitch: 1.5 });
            
//             // Visual effect for crit
//             system.runTimeout(() => {
//                 hurtEntity.dimension.spawnParticle("minecraft:crit_particle", hurtEntity.location);
//             }, 1);
//         }
//     }
    
//     // Player taking damage - apply defense
//     if (hurtEntity.typeId === "minecraft:player") {
//         const defender = hurtEntity;
//         const defenseResult = defender.stats().calculateDefense(event.damage);
        
//         event.damage = defenseResult.finalDamage;
        
//         if (defenseResult.damageBlocked > 0) {
//             defender.onScreenDisplay.setActionBar(
//                 `§7Blocked §c${defenseResult.damageBlocked} §7damage! (§a${defender.stats().getDefense()} §7Defense)`
//             );
//         }
//     }
// });


world.afterEvents.entityHurt.subscribe((event) => {
    const { damage, damageSource, hurtEntity } = event;

    // --- Player attacking ---
    if (damageSource?.damagingEntity?.typeId === "minecraft:player") {
        if (hurtEntity.getDynamicProperty("processingDamage")) return
        hurtEntity.setDynamicProperty("processingDamage", true);
        system.runTimeout(() => {
            hurtEntity.setDynamicProperty("processingDamage", false);
        }, 5)
        const attacker = damageSource.damagingEntity;
        const { damage: finalDamage, isCritical } = attacker.stats().calculateDamage(damage);
        console.warn(`Base Damage: ${damage}, Final Damage: ${finalDamage}, Critical: ${isCritical}`);
        // Apply extra damage (on top of vanilla)
        if (finalDamage > damage) {
            hurtEntity.applyDamage(finalDamage - damage, {
                cause: damageSource.cause,
                damagingEntity: attacker
            });
        }

        if (isCritical) {
            attacker.sendMessage("§c§lCRITICAL STRIKE!");
            attacker.playSound("random.orb", { pitch: 1.5 });

            system.runTimeout(() => {
                hurtEntity.dimension.spawnParticle("minecraft:basic_crit_particle", hurtEntity.location);
            }, 1);
        }
    }

    // --- Player defending ---
    if (hurtEntity.typeId === "minecraft:player") {
        const defender = hurtEntity;
        const defenseResult = defender.stats().calculateDefense(damage);

        if (defenseResult.damageBlocked > 0) {
            // Heal back the blocked amount
            system.run(() => {
                let hComp = defender.getComponent("health");
                const health = hComp.currentValue
                hComp.setCurrentValue(health + defenseResult.damageBlocked);
            });

            defender.onScreenDisplay.setActionBar(
                `§7Blocked §c${defenseResult.damageBlocked} §7damage! (§a${defender.stats().getDefense()} §7Defense)`
            );
        }
    }
});

// Comprehensive world load initialization
world.afterEvents.worldLoad.subscribe(() => {
    console.log("§6Initializing complete RPG system...");
    
    for (const player of world.getPlayers()) {
        initializePlayer(player);
    }
    
    // Start all systems
    GameTracker.init();
    AdvancedRecipes.init();
    
    // Core game loops
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            // Mana regeneration with intelligence bonus
            const intelligence = player.stats().getIntelligence();
            const manaRegenBonus = Math.floor(intelligence * 0.1);
            const totalRegen = player.mana().getRegen() + manaRegenBonus;
            
            player.mana().add(totalRegen);
            updateManaDisplay(player, "display");
            
            // Update equipment stats periodically
            EquipmentManager.updatePlayerStats(player);
        }
    }, 20);
    
    // XP and achievement checks
    system.runInterval(() => {
        for (const player of world.getPlayers()) {
            checkProgressionMilestones(player);
        }
    }, 100);
    
    console.log("§aRPG system initialized successfully!");
});

// Player spawn initialization
world.afterEvents.playerSpawn.subscribe(({player, initialSpawn}) => {
    if (initialSpawn) {
        initializePlayer(player);
    }
});

function initializePlayer(player) {
    console.log(`§eInitializing player: ${player.name}`);
    
    // Initialize mana system
    if (!player.getDynamicProperty("maxMana")) {
        player.mana().init(100, 6);
    }
    
    // Initialize stats system
    if (!player.getDynamicProperty("stats_initialized")) {
        player.stats().init({
            strength: 5,
            defense: 3,
            bonusHealth: 0,
            bonusSpeed: 0,
            critChance: 5,
            critDamage: 50,
            attackSpeed: 0,
            intelligence: 10
        });
        player.setDynamicProperty("stats_initialized", true);
    }
    
    // Initialize progression systems
    if (!player.getDynamicProperty("skills_initialized")) {
        ["combat", "magic", "mining", "foraging", "crafting"].forEach(skill => {
            if (!player.getDynamicProperty(`skill_${skill}_level`)) {
                player.setDynamicProperty(`skill_${skill}_level`, 0);
                player.setDynamicProperty(`skill_${skill}_xp`, 0);
                player.setDynamicProperty(`skill_${skill}_nodes`, JSON.stringify([]));
            }
        });
        
        Object.keys(ITEMS).forEach(weapon => {
            if (!player.getDynamicProperty(`mastery_${weapon}`)) {
                player.setDynamicProperty(`mastery_${weapon}`, 0);
                player.setDynamicProperty(`usage_${weapon}`, 0);
            }
        });
        
        if (!player.getDynamicProperty("prestige_level")) {
            player.setDynamicProperty("prestige_level", 0);
        }
        
        // Give starter items
        giveStarterItems(player);
        
        player.setDynamicProperty("skills_initialized", true);
        player.sendMessage("§aWelcome! Your RPG journey begins now!");
    }
}

function giveStarterItems(player) {
    const inv = player.getComponent("inventory").container;
    
    // Starter weapon with basic stats
    const starterSword = createItemWithStats(
        "minecraft:iron_sword",
        "§fTraining Sword",
        { strength: 5, critChance: 3 },
        ["§7Your first weapon", "§8Train with this to improve"]
    );
    
    // Starter armor
    const starterChest = createItemWithStats(
        "minecraft:leather_chestplate",
        "§fTraining Armor",
        { defense: 8, health: 10, intelligence: 50 },
        ["§7Basic protection", "§8Better than nothing"]
    );
    
    // Stats viewing item
    const statsBook = new ItemStack("minecraft:book", 1);
    statsBook.nameTag = "stats";
    statsBook.setLore(["§7Right-click to view", "§7your current stats"]);
    
    // Menu access
    const menuCompass = new ItemStack("minecraft:compass", 1);
    menuCompass.nameTag = "menu";
    menuCompass.setLore(["§7Right-click to open", "§7the main menu"]);
    
    // Try to give items
    [starterSword, starterChest, statsBook, menuCompass].forEach(item => {
        const leftover = inv.addItem(item);
        if (leftover) {
            player.dimension.spawnItem(leftover, player.location);
        }
    });
}

function checkProgressionMilestones(player) {
    const stats = player.stats().getAll();
    
    // Check stat-based achievements
    if (stats.strength >= 100 && !player.getDynamicProperty("achievement_strong")) {
        AchievementSystem.check(player, "strength_master");
    }
    
    if (stats.intelligence >= 50 && !player.getDynamicProperty("achievement_smart")) {
        AchievementSystem.check(player, "intelligence_master");
    }
    
    // Check skill milestones
    ["combat", "magic", "mining", "foraging", "crafting"].forEach(skill => {
        const level = player.skills().getLevel(skill);
        if (level >= 25 && !player.getDynamicProperty(`achievement_${skill}_master`)) {
            AchievementSystem.check(player, `${skill}_master`);
        }
    });
    
    // Check prestige eligibility
    if (player.prestige().canPrestige() && !player.getDynamicProperty("prestige_ready_notified")) {
        player.sendMessage("§6§lYou can now PRESTIGE! §r§eOpen the progression menu to prestige.");
        player.setDynamicProperty("prestige_ready_notified", true);
    }
}

// Stats menu implementation
function showStatsMenu(player) {
    const stats = player.stats().getAll();
    const equipStats = EquipmentManager.getEquipmentStats(player);
    
    const shape = [
        'ggggggggg',
        'g s d h g',
        'g c a i g', 
        'g       g',
        'g   e   g',
        'ggggggggg'
    ];
    
    MenuRegister.register("stats_menu", "large", {
        name: `§6${player.name}'s Stats`,
        shape: shape,
        keys: {
            g: ["", [], "minecraft:black_stained_glass_pane"],
            s: [`§cStrength: §f${stats.strength}`, [`§7Base damage multiplier`, `§7Equipment: §e+${equipStats.strength}`], "minecraft:iron_sword"],
            d: [`§aDefense: §f${stats.defense}`, [`§7Damage reduction`, `§7Equipment: §e+${equipStats.defense}`], "minecraft:iron_chestplate"],
            h: [`§cHealth: §f${stats.health}`, [`§7Bonus health points`, `§7Equipment: §e+${equipStats.health}`], "minecraft:golden_apple"],
            c: [`§9Crit Chance: §f${stats.critChance}%`, [`§7Critical hit chance`, `§7Equipment: §e+${equipStats.critChance}%`], "minecraft:diamond"],
            a: [`§eAttack Speed: §f${stats.attackSpeed}`, [`§7Reduces cooldowns`, `§7Equipment: §e+${equipStats.attackSpeed}`], "minecraft:golden_sword"],
            i: [`§bIntelligence: §f${stats.intelligence}`, [`§7Increases mana`, `§7Equipment: §e+${equipStats.intelligence}`], "minecraft:enchanted_book"],
            e: [`§6Equipment Stats`, [`§7Total bonuses from`, `§7your equipped items`], "minecraft:armor_stand"]
        }
    }, (response, player) => {
        // Could open detailed stat breakdowns
    });
    
    MenuRegister.show("stats_menu", player);
}

function primaryMenu(player) {
    MenuRegister.show("prime_menu", player);
}

// Enhanced ability registry with full stat integration
const originalRegister = Registry.register;
Registry.register = function(id, handler, cost, useMana = true) {
    const enhancedHandler = (player, ctx) => {
        // Apply mastery bonuses
        const masteryBonuses = ctx.masteryBonuses || player.mastery().getBonuses(id);
        const adjustedCost = Math.floor(cost * (1 - masteryBonuses.manaReduction));
        
        // Enhanced context
        const fullContext = {
            ...ctx,
            stats: player.stats().getAll(),
            damageMultiplier: 1 + (ctx.stats?.strength || 0) / 100 + masteryBonuses.damageBonus,
            intelligenceBonus: (ctx.stats?.intelligence || 0) * 0.25,
            masteryLevel: player.mastery().getLevel(id),
            adjustedCost
        };
        
        return handler(player, fullContext);
    };
    
    return originalRegister.call(this, id, enhancedHandler, cost, useMana);
};

// Chat commands for testing/debugging
world.beforeEvents.chatSend.subscribe((evd) => {
    let k;
    if ((k = evd.message.trim().split(" ")).shift() === "repl") {
        eval(k.join(" "));
        evd.cancel = true;
        console.warn(`repl: ${k.join(" ")}`);
    }
    
    // Debug commands
    if (evd.message === "stats") {
        const stats = evd.sender.stats().getAll();
        evd.sender.sendMessage(`§6Your Stats: ${JSON.stringify(stats)}`);
        evd.cancel = true;
    }
    
    if (evd.message === "give_test_gear") {
        system.run(() => {
        const testWeapon = createItemWithStats(
            "minecraft:diamond_sword",
            "§6Legendary Blade",
            { strength: 50, critChance: 15, critDamage: 30 },
            ["§7A weapon of legends"]
        );
        evd.sender.getComponent("inventory").container.addItem(testWeapon)});
        evd.cancel = true;
    }

    if (evd.message === "skills") {
        const skills = ["combat", "magic", "mining", "foraging", "crafting"];
        const skillLevels = skills.map(s => `${s}: ${evd.sender.skills().getLevel(s)}`).join(", ");
        evd.sender.sendMessage(`§6Your Skills: ${skillLevels}`);
        evd.cancel = true;
    }
    
    if (evd.message.startsWith("addstat ")) {
        const [_, stat, amount] = evd.message.split(" ");
        const methodName = `add${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
        if (evd.sender.stats()[methodName]) {
            evd.sender.stats()[methodName](parseInt(amount));
            evd.sender.sendMessage(`§aAdded ${amount} ${stat}!`);
        }
        evd.cancel = true;
    }
});