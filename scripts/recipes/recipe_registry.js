import { ItemStack } from "@minecraft/server";

export class RecipeRegister {
  static recipes = [];
/**
 * 
 * @param {ItemStack[]} pattern 
 * @param {ItemStack} output 
 * @param {{shaped: true | false}} param
 * @returns 
 */
  static register(pattern, output, { shaped = false } = {}) {
    const recipe = {
      id: this.recipes.length,
      pattern,
      output: output.clone(),
      shaped
    };
    this.recipes.push(recipe);
    return recipe.id;
  }

  static get(craftingTable) {
    const ingredients = this._toIngredients(craftingTable);

    for (const recipe of this.recipes) {
      const match = recipe.shaped
        ? this._matchShaped(ingredients, recipe.pattern)
        : this._matchShapeless(ingredients, recipe.pattern);

      if (match) return recipe.output.clone();
    }

    return null;
  }

  static consumeIngredients(craftingTable, recipeOutput) {
    const ingredients = this._toIngredients(craftingTable);

    for (const recipe of this.recipes) {
      if (recipe.output.typeId !== recipeOutput.typeId) continue;

      if (recipe.shaped) {
        const matchedSlots = this._matchShaped(ingredients, recipe.pattern);
        if (!matchedSlots) continue;

        const updatedTable = [...craftingTable];
        for (const { index, expected } of matchedSlots) {
          const item = updatedTable[index];
          const consumeAmount = expected.amount || 1;

          if (item.amount <= consumeAmount) {
            updatedTable[index] = null;
          } else {
            item.amount -= consumeAmount;
            updatedTable[index] = item;
          }
        }

        return updatedTable;
      }

      // fallback to shapeless logic
      const matchIndices = this._matchShapeless(ingredients, recipe.pattern, true);
      if (!matchIndices) continue;

      const updatedTable = [...craftingTable];
      for (const { typeId, amount } of matchIndices) {
        for (let i = 0; i < updatedTable.length; i++) {
          const item = updatedTable[i];
          if (item?.typeId === typeId) {
            item.amount -= amount;
            updatedTable[i] = item.amount > 0 ? item : null;
            break;
          }
        }
      }

      return updatedTable;
    }

    return craftingTable;
  }

  static clear() {
    this.recipes = [];
  }

  static getAllRecipes() {
    return [...this.recipes];
  }

  static unregister(id) {
    this.recipes = this.recipes.filter(r => r.id !== id);
  }

  // 🔽 Internal Helpers 🔽

  static _toIngredients(table) {
    return table.map(item => item ? { typeId: item.typeId, amount: item.amount } : null);
  }

  static _matchShapeless(ingredients, pattern, returnMatches = false) {
    const input = ingredients.filter(Boolean);
    const required = Array.isArray(pattern)
      ? pattern.filter(Boolean)
      : Object.values(pattern).filter(Boolean);

    if (input.length !== required.length) return false;

    const remaining = [...required];
    const matches = [];

    for (const ing of input) {
      const i = remaining.findIndex(p => p.typeId === ing.typeId && ing.amount >= (p.amount || 1));
      if (i === -1) return false;
      matches.push({ typeId: ing.typeId, amount: remaining[i].amount || 1 });
      remaining.splice(i, 1);
    }

    return returnMatches ? matches : remaining.length === 0;
  }

  static _matchShaped(ingredients, pattern) {
    const grid = this._normalizePattern(pattern);
    const ph = grid.length;
    const pw = grid[0].length;

    for (let ro = 0; ro <= 3 - ph; ro++) {
      for (let co = 0; co <= 3 - pw; co++) {
        let match = true;
        const matchedSlots = [];
        const usedIndices = new Set();

        for (let r = 0; r < ph; r++) {
          for (let c = 0; c < pw; c++) {
            const index = (r + ro) * 3 + (c + co);
            const slot = ingredients[index];
            const expected = grid[r][c];

            if (!this._matchSlot(slot, expected)) {
              match = false;
              break;
            }

            if (expected) {
              matchedSlots.push({ index, expected });
              usedIndices.add(index);
            }
          }
          if (!match) break;
        }

        // Check for unrelated items outside the matched region
        if (match) {
          for (let i = 0; i < 9; i++) {
            if (!usedIndices.has(i) && ingredients[i]) {
              match = false;
              break;
            }
          }
        }

        if (match) return matchedSlots;
      }
    }

    return null;
  }

  static _normalizePattern(pattern) {
    let grid = Array.isArray(pattern)
      ? pattern.length === 9
        ? Array.from({ length: 3 }, (_, i) => pattern.slice(i * 3, i * 3 + 3))
        : pattern.map(row => [...row])
      : Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: 3 }, (_, c) => pattern[r * 3 + c] || null)
        );

    // Trim empty rows
    while (grid.length && grid[0].every(x => !x)) grid.shift();
    while (grid.length && grid[grid.length - 1].every(x => !x)) grid.pop();

    // Trim empty columns
    while (grid.length && grid.every(row => !row[0])) grid.forEach(row => row.shift());
    while (grid.length && grid.every(row => !row[row.length - 1])) grid.forEach(row => row.pop());

    return grid;
  }

  static _matchSlot(ingredient, expected) {
    if (!expected) return !ingredient;
    if (!ingredient) return false;
    return ingredient.typeId === expected.typeId && ingredient.amount >= (expected.amount || 1);
  }
}
