import { AccessibleCraftingTableFormData } from "./base";
import { Container } from "@minecraft/server";
import { giveItem, isSameItem, stackNum } from "../utils/utils";
import { RecipeRegister } from "../recipes/recipe_registry";

export function craftingUi(player, old, data = {
    onToggle: false,
    toggleSlot: null,
    cOld: null,
    old: null,
    oldPres: undefined,
    output: undefined,
    table: Array.from({ length: 9 })
}) {
    /**
     * @type {Container} inv
     */
    const inv = player.getComponent("inventory").container;
    const craftingUIx = new AccessibleCraftingTableFormData().title("Crafting Table");

    data.table.forEach((item, i) => item && craftingUIx.put(i, item));
    const result = RecipeRegister.get(data.table, player);
    if (result) {
        craftingUIx.put(9, result);
        data.output = result;
    }

    craftingUIx.show(player).then(response => {
        if (response.canceled) {
            // data.table.forEach(item => item && give(player, item, item.amount));
            giveItem(player, data.table)
            return;
        }

        const pres = craftingUIx.parseSelection(response.selection);
        let slot = pres.slot;

        const getItem = (type, index) => type === "inventory" ? inv.getItem(Number(index)) : data.table[index];
        const setItem = (type, index, item) => type === "inventory" ? inv.setItem(Number(index), item) : data.table[index] = item;

        const handleToggle = (targetType, targetSlot, toItem) => {
            const toggleItem = getItem(...data.toggleSlot.split(":"));
            if (!toggleItem) return resetToggle();

            if (toggleItem.amount - 1 <= 0) setItem(...data.toggleSlot.split(":"), null);
            else ((toggleItem.amount -= 1), setItem(...data.toggleSlot.split(":"), toggleItem));

            if (!toItem) {
                const newItem = toggleItem.clone();
                newItem.amount = 1;
                setItem(targetType, targetSlot, newItem);
            } else if (isSameItem(toItem, toggleItem)) {
                toItem.amount += 1;
                setItem(targetType, targetSlot, toItem);
            } else {
                toggleItem.amount += 1;
                setItem(...data.toggleSlot.split(":"), toggleItem);
                data.onToggle = false;
                data.toggleSlot = null;
                slot = undefined
            }
        };

        const resetToggle = () => {
            data.onToggle = false;
            data.toggleSlot = null;
            slot = undefined
        };

        const handleMove = (fromItem, toItem, fromType, fromSlot, toType, toSlot) => {
            const diff = stackNum(fromItem, toItem);
            if (diff) {

                if (fromItem.amount - diff <= 0) setItem(fromType, fromSlot, null);
                else (fromItem.amount -= diff, setItem(fromType, fromSlot, fromItem));

                if (toItem) {
                    toItem.amount += diff;
                    setItem(toType, toSlot, toItem);
                } else {
                    const newItem = fromItem.clone();
                    newItem.amount = diff;
                    setItem(toType, toSlot, newItem);
                }
            } else {
                setItem(toType, toSlot, fromItem);
                setItem(fromType, fromSlot, toItem);
            }
        };

        const processSelection = (type) => {
            const fromType = data.oldPres;
            const fromSlot = fromType === "inventory" ? old : data.cOld;
            const fromItem = (old != undefined) ? getItem(fromType, fromSlot) : null;
            const toItem = getItem(type, slot);

            if (data.toggleSlot === `${type}:${slot}`) resetToggle();
            else if (fromItem?.isStackable && !data.onToggle && fromSlot === slot) {
                data.onToggle = true;
                data.toggleSlot = `${type}:${slot}`;
            }

            if (data.onToggle && (data.toggleSlot !== `${type}:${slot}`)) {
                handleToggle(type, slot, toItem);
                data.old = slot;
                if (type === "crafting_input") data.cOld = slot;
                slot = undefined

            } else if (fromItem && fromSlot !== slot) {
                handleMove(fromItem, toItem, fromType, fromSlot, type, slot);
                slot = undefined
            } else {
                data.old = slot;
                if (type === "crafting_input") data.cOld = slot;
            }

            data.oldPres = type;


            craftingUi(player, slot, { ...data });
        };

        if (pres.type === "inventory" || pres.type === "crafting_input") {
            processSelection(pres.type);
        } else if (pres.type === "crafting_result") {
            if (data.output) {
                data.table = RecipeRegister.consumeIngredients(data.table, data.output);
                giveItem(player, data.output);
                craftingUi(player, undefined, { ...data });
            }
        }
    });
}