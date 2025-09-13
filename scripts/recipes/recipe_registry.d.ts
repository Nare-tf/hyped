import { ItemStack } from "@minecraft/server";

declare interface Recipe {
  id: number;
  pattern: ItemStack[];
  output: ItemStack;
  shaped: boolean;
}

declare class RecipeRegister {
  static recipes: Recipe[];

  /**
   * Registers a recipe.
   * @param pattern Array of ItemStacks representing the input pattern.
   * @param output The resulting ItemStack.
   * @param param Options for shaping.
   * @returns The recipe ID.
   */
  static register(
    pattern: ItemStack[],
    output: ItemStack,
    param?: { shaped?: boolean }
  ): number;

  /**
   * Gets the output for a given crafting table input.
   * @param craftingTable Array of ItemStacks representing the crafting grid.
   * @returns A cloned ItemStack if matched, or null.
   */
  static get(craftingTable: (ItemStack | null)[]): ItemStack | null;

  /**
   * Consumes ingredients from the crafting table based on the recipe output.
   * @param craftingTable Array of ItemStacks representing the crafting grid.
   * @param recipeOutput The output ItemStack to match against.
   * @returns Updated crafting table after consumption.
   */
  static consumeIngredients(
    craftingTable: (ItemStack | null)[],
    recipeOutput: ItemStack
  ): (ItemStack | null)[];

  /** Clears all registered recipes. */
  static clear(): void;

  /** Returns a copy of all registered recipes. */
  static getAllRecipes(): Recipe[];

  /** Removes a recipe by ID. */
  static unregister(id: number): void;
}
export {RecipeRegister}