import { system, world } from "@minecraft/server";
import Registry from "../abilities/registry";
import { RecipeRegister } from "../recipes/recipe_registry";
import { ITEMS } from "../itemsRegister";

export class GameTracker {
    static init() {
        // Track block breaking for mining skills
        world.afterEvents.playerBreakBlock.subscribe((event) => {
            const { player, block } = event;
            const blockType = block.typeId;
            
            // Add XP based on block type
            let xpAmount = 1;
            let skillType = "mining";
            
            if (blockType.includes("ore")) xpAmount = 5;
            else if (blockType.includes("log")) {
                xpAmount = 2;
                skillType = "foraging";
            }
            
            player.skills().addXP(skillType, xpAmount);
            player.mastery().addUsage("mining");
        });

        // Track entity kills for combat skills
        world.afterEvents.entityDie.subscribe((event) => {
            const { deadEntity, damageSource } = event;
            if (damageSource?.damagingEntity?.typeId === "minecraft:player") {
                const player = damageSource.damagingEntity;
                
                let xpAmount = 3;
                if (deadEntity.typeId.includes("boss")) xpAmount = 50;
                else if (deadEntity.typeId.includes("hostile")) xpAmount = 5;
                
                player.skills().addXP("combat", xpAmount);
                
                // Track weapon mastery
                const heldItem = player.getComponent("inventory").container.getItem(player.selectedSlotIndex);
                if (heldItem?.nameTag && ITEMS[heldItem.nameTag]) {
                    player.mastery().addUsage(heldItem.nameTag);
                }
            }
        });

        // Track ability usage for magic skills
        const originalRegistryUse = Registry.use;
        Registry.use = function(id, player, ctx) {
            // Call original function
            const result = originalRegistryUse.call(this, id, player, ctx);
            
            // Track magic XP and mastery
            if (ITEMS[id]) {
                player.skills().addXP("magic", 2);
                player.mastery().addUsage(id);
            }
            
            return result;
        };

        // Track recipe crafting for crafting skills
        const originalConsumeIngredients = RecipeRegister.consumeIngredients;
        RecipeRegister.consumeIngredients = function(craftingTable, recipeOutput) {
            const result = originalConsumeIngredients.call(this, craftingTable, recipeOutput);
            
            // Find the player who crafted (would need context)
            world.getPlayers().forEach(player => {
                player.skills().addXP("crafting", 5);
                
                // Check for recipe unlocks
                GameTracker.checkRecipeUnlocks(player);
            });
            
            return result;
        };
    }

    static checkRecipeUnlocks(player) {
        const craftingLevel = player.skills().getLevel("crafting");
        const combatLevel = player.skills().getLevel("combat");
        
        // Example recipe unlock logic
        if (craftingLevel >= 10 && !player.recipes().has("iron_sword_advanced")) {
            player.recipes().unlock("iron_sword_advanced");
            player.sendMessage("§6New recipe unlocked: §eAdvanced Iron Sword");
        }
        
        if (combatLevel >= 15 && !player.recipes().has("enchanted_weapon")) {
            player.recipes().unlock("enchanted_weapon");
            player.sendMessage("§6New recipe unlocked: §eEnchanted Weapons");
        }
    }
}
export class AchievementSystem {
    static achievements = {
        "first_kill": {
            name: "First Blood",
            description: "Kill your first enemy",
            reward: { type: "xp", skill: "combat", amount: 100 }
        },
        "master_crafter": {
            name: "Master Crafter",
            description: "Reach crafting level 25",
            reward: { type: "recipe", id: "legendary_weapons" }
        },
        "weapon_master": {
            name: "Weapon Master",
            description: "Get mastery 5 on any weapon",
            reward: { type: "mana", amount: 50 }
        },
        "prestigious": {
            name: "Prestigious",
            description: "Reach prestige level 1",
            reward: { type: "title", title: "§6[Prestigious]" }
        }
    };

    static check(player, achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return;

        const completed = player.getDynamicProperty(`achievement_${achievementId}`);
        if (completed) return;

        // Mark as completed
        player.setDynamicProperty(`achievement_${achievementId}`, true);
        
        // Give reward
        this.giveReward(player, achievement.reward);
        
        // Notify player
        player.sendMessage(`§6§l★ ACHIEVEMENT UNLOCKED! §r§6${achievement.name}`);
        player.sendMessage(`§7${achievement.description}`);
        player.playSound("ui.toast.challenge_complete");
    }

    static giveReward(player, reward) {
        switch(reward.type) {
            case "xp":
                player.skills().addXP(reward.skill, reward.amount);
                break;
            case "mana":
                player.mana().addMax(reward.amount);
                break;
            case "recipe":
                player.recipes().unlock(reward.id);
                break;
            case "title":
                player.setDynamicProperty("title", reward.title);
                break;
        }
    }
}
