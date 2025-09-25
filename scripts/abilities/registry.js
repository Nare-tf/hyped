import { Block, Entity, ItemStack, Player } from "@minecraft/server";
import { updateManaDisplay } from "../utils/utils";
export const Registry = {
    abilities: new Map(),
    
    register(id, handler, cost, useMana = true) {
        this.abilities.set(id, {handler, cost, useMana});
    },
    
    use(id, player, ctx) {
        const entry = this.abilities.get(id);
        if (!entry) return;

        const { handler, cost, useMana } = entry;

        // Apply mastery bonuses
        const masteryBonuses = player.mastery().getBonuses(id);
        const adjustedCost = Math.floor(cost * (1 - masteryBonuses.manaReduction));

        if (player.mana().has(adjustedCost) && useMana) {
            try {
                // Enhanced context with mastery info
                const enhancedCtx = {
                    ...ctx,
                    masteryLevel: player.mastery().getLevel(id),
                    masteryBonuses,
                    damageMultiplier: 1 + masteryBonuses.damageBonus
                };
                
                handler(player, enhancedCtx);
            } catch (e) {
                console.error(`Error using ability ${id}: ${e}`);
            }
            updateManaDisplay(player, "subtract", adjustedCost);
        } else if (!useMana) {
            try {
                handler(player, ctx);
            } catch (e) {
                console.error(`Error using ability ${id}: ${e}`);
            }
        } else {
            updateManaDisplay(player, "insufficient", adjustedCost);
        }
    }
};
export default Registry; 