import { RecipeRegister } from "../recipes/recipe_registry";
import { ItemStack } from "@minecraft/server";
export const AdvancedRecipes = {
    init() {
        // Combat skill recipes
        RecipeRegister.register(
            [
                [{ typeId: "minecraft:iron_sword" }, null , null],
                [{ typeId: "minecraft:ender_pearl" }, null, null],
                [{ typeId: "minecraft:blaze_powder" }, null, null]
            ],
            createNamedItem("minecraft:iron_sword", "AOTE", ["§7Ability: Instant Transmission", "§8Teleport 8 blocks forward"]),
            { shaped: true, requiredSkill: "combat", requiredLevel: 10 }
        );

        RecipeRegister.register(
            [
                [{ typeId: "minecraft:diamond_sword" }],
                [{ typeId: "minecraft:dragon_breath", amount: 3 }],
                [{ typeId: "minecraft:nether_star" }]
            ],
            createNamedItem("minecraft:diamond_sword", "AOTD", ["§7Ability: Dragon Rage", "§8Fire helix attack"]),
            { shaped: true, requiredSkill: "combat", requiredLevel: 25 }
        );

        // Magic skill recipes
        RecipeRegister.register(
            [
                [{ typeId: "minecraft:blaze_rod" }],
                [{ typeId: "minecraft:ender_eye", amount: 2 }],
                [{ typeId: "minecraft:ghast_tear" }]
            ],
            createNamedItem("minecraft:blaze_rod", "HYPERION", ["§7Ability: Wither Impact", "§8Heal + Mana orbs"]),
            { shaped: false, requiredSkill: "magic", requiredLevel: 30 }
        );

        // Bow recipes
        RecipeRegister.register(
            [
                [{ typeId: "minecraft:bow" }],
                [{ typeId: "minecraft:tnt", amount: 5 }],
                [{ typeId: "minecraft:redstone", amount: 10 }]
            ],
            createNamedItem("minecraft:bow", "TERMINATOR", ["§7Ability: Explosive Shot", "§8Multi-explosive arrows"]),
            { shaped: false, requiredSkill: "combat", requiredLevel: 20 }
        );
    }
};

function createNamedItem(typeId, name, lore = []) {
    const item = new ItemStack(typeId, 1);
    item.nameTag = name;
    item.setLore(lore);
    return item;
}

// Enhanced recipe system with skill requirements
const originalRecipeGet = RecipeRegister.get;
RecipeRegister.get = function(craftingTable, player = null) {
    const result = originalRecipeGet.call(this, craftingTable);
    
    if (result && player) {
        // Find the recipe to check requirements
        const recipe = this.recipes.find(r => r.output.typeId === result.typeId);
        
        if (recipe?.requiredSkill && recipe?.requiredLevel) {
            const playerLevel = player.skills().getLevel(recipe.requiredSkill);
            
            if (playerLevel < recipe.requiredLevel) {
                player.sendMessage(`§cRequires ${recipe.requiredSkill} level ${recipe.requiredLevel}! Current: ${playerLevel}`);
                return null;
            }
        }
    }
    
    return result;
};