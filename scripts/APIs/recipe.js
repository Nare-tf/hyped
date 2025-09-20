import { Player } from "@minecraft/server";
Player.prototype.recipes = function() {
    return {
        unlock: (recipeId) => this.setDynamicProperty(`recipe_${recipeId}`, true),
        lock: (recipeId) => this.setDynamicProperty(`recipe_${recipeId}`, false),
        has: (recipeId) => this.getDynamicProperty(`recipe_${recipeId}`) ?? false,
        getUnlocked: () => this.getDynamicPropertyIds().filter(id => id.startsWith("recipe_") && this.getDynamicProperty(id)).map(id => id.replace("recipe_", ""))
    };
};