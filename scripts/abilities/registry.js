import { Block, Entity, ItemStack, Player } from "@minecraft/server";
import { updateManaDisplay } from "../utils/utils";
export const Registry = {
    abilities: new Map(),
    /**
     * Register an ability
     * @param {string} id
     * @param {(player: Player, ctx: any) => void} handler
     * @param {number} cost
     * @param {boolean} [useMana=true]
     */
    register(id, handler, cost, useMana = true) {
        this.abilities.set(id, {handler, cost, useMana});
    },
    /**
     * Execute ability (if exists)
     * @param {string} id
     * @param {Player} player
     * @param {{targetblock?: Block, targetEntity?: Entity, itemStack?: ItemStack, targetBlocks?: Block[], targetEntities?: Entity[]}} ctx
     */
    use(id, player, ctx) {
        const entry = this.abilities.get(id);
        if (!entry) return;

        const { handler, cost , useMana } = entry;

        if (player.mana().has(cost) && useMana) {
            try {
                handler(player, ctx);
            } catch (e) {
                console.error(`Error using ability ${id}: ${e}`);
            }
            updateManaDisplay(player, "subtract", cost);
        } else if (!useMana) {
            try {
                handler(player, ctx);
            } catch (e) {
                console.error(`Error using ability ${id}: ${e}`);
            }
        } else if (player.mana().has(cost) === false && useMana) {
            updateManaDisplay(player, "insufficient", cost);
            player.playSound("random.pop", { volume: 0.5, pitch: 1 });
        }
    }
}
export default Registry; 