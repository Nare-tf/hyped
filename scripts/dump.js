function craftingUi(player, old, data = { onToggle: false, toggleSlot: -1, cOld: -1, old: -1, oldPres: undefined, table: Array.from({ length: 9 }) }) {
	const craftingUIx = new AccessibleCraftingTableFormData();
	craftingUIx.title("Crafting Table");
	for (let i in data.table) {
		data.table[i] && craftingUIx.put(i, data.table[i])
	}
	craftingUIx.show(player).then(response => {
		if (response.canceled) {
			for (let i in data.table) {
				data.table[i] && player.getComponent("inventory").container.addItem(data.table[i])
	        }
			return
		}

		const res = response;
		const pres = craftingUIx.parseSelection(res.selection);
		if (pres.type == "inventory") {

			let slot = pres.slot;
			const inv = player.getComponent("inventory").container;

			let fromItem, toItem, cD = false
			if (data.oldPres == "inventory") {
				fromItem = old != undefined ? inv.getItem(old) : null;
			} else {
				fromItem = data.table[data.cOld]
				cD = true
			}
			toItem = inv.getItem(slot);
			// --- Toggle handling ---
			if (slot === data.toggleSlot) {
				data.onToggle = false;
				data.toggleSlot = -1;
			} else if ((old === slot) && fromItem?.isStackable && !data.onToggle) {
				data.onToggle = true;
				data.toggleSlot = slot;
			}

			// --- Normal move logic ---
			if (!data.onToggle && fromItem) {
				const diff = stackNum(fromItem, toItem);

				if (diff && (old !== slot) && (old != data.old)) {
					// Move partial stack
					if (fromItem.amount - diff <= 0) cD ? (data.table[data.cOld] = null) : inv.setItem(old, null);
					else (fromItem.amount -= diff, cD ? (data.table[data.cOld] = fromItem) : inv.setItem(old, fromItem));

					toItem.amount += diff;
					inv.setItem(slot, toItem);

					slot = undefined;
				} else if (!diff && (old !== slot)) {
					// Swap items
					cD ? (((data.table[data.cOld] = toItem), inv.setItem(slot, fromItem))) : inv.swapItems(old, slot, inv);
					slot = undefined;
				}
			}

			// --- Toggle transfer ---
			if (data.onToggle && (slot !== data.toggleSlot)) {
				let toggleItem = inv.getItem(data.toggleSlot);
				if (!toggleItem) {
					data.onToggle = false;
					data.toggleSlot = -1;
					return
				}

				// remove 1 from toggle stack
				if (toggleItem.amount - 1 <= 0) {
					cD ? (data.table[data.toggleSlot] = null) : inv.setItem(data.toggleSlot, null);
				} else {
					toggleItem.amount -= 1;
					cD ? (data.table[data.toggleSlot] = toggleItem) : inv.setItem(data.toggleSlot, toggleItem);
				}

				if (isSameItem(toItem, toggleItem)) {
					toItem.amount += 1;
					inv.setItem(slot, toItem);
					data.old = slot;
				} else if (!toItem) {
					toggleItem.amount = 1;
					inv.setItem(slot, toggleItem);
					data.old = slot
				} else {
					toggleItem.amount += 1
					cD ? (data.table[data.toggleSlot] = toggleItem) : inv.setItem(data.toggleSlot, toggleItem)
					data.old = slot
				}

			}

			data.oldPres = "inventory"

			console.warn(JSON.stringify(data), old, slot);
			craftingUi(player, slot, { ...data }); // restart UI loop
		} else if (pres.type == "crafting_input") {
			let slot = pres.slot;
			const inv = player.getComponent("inventory").container;
			let fromItem = (old != undefined) ? inv.getItem(old) : null;
			let toItem = data.table[slot];
			let cD = true;

			// --- Toggle handling ---
			if (slot === data.toggleSlot) {
				data.onToggle = false;
				data.toggleSlot = -1;
			} else if ((old === slot) && fromItem?.isStackable && !data.onToggle) {
				data.onToggle = true;
				data.toggleSlot = slot;
			}

			// --- Normal move logic ---
			if (!data.onToggle && fromItem) {
				const diff = stackNum(fromItem, toItem);

				if (diff && (old !== slot) && (old != data.old)) {
					// Move partial stack
					if (fromItem.amount - diff <= 0) inv.setItem(old, null);
					else {
						fromItem.amount -= diff;
						inv.setItem(old, fromItem);
					}

					if (toItem) {
						toItem.amount += diff;
						data.table[slot] = toItem;
					} else {
						fromItem.amount = diff;
						data.table[slot] = fromItem;
					}

					slot = undefined;
				} else if (!diff && (old !== slot)) {
					// Swap items
					data.table[slot] = fromItem;
					inv.setItem(old, toItem);
					slot = undefined;
				}
			}

			// --- Toggle transfer ---
			if (data.onToggle && (slot !== data.toggleSlot)) {
				let toggleItem = inv.getItem(data.toggleSlot);
				if (!toggleItem) {
					data.onToggle = false;
					data.toggleSlot = -1;
					return;
				}

				// remove 1 from toggle stack
				if (toggleItem.amount - 1 <= 0) {
					inv.setItem(data.toggleSlot, null);
				} else {
					toggleItem.amount -= 1;
					inv.setItem(data.toggleSlot, toggleItem);
				}

				if (isSameItem(toItem, toggleItem)) {
					toItem.amount += 1;
					data.table[slot] = toItem;
					data.old = slot;
				} else if (!toItem) {
					toggleItem.amount = 1;
					data.table[slot] = toggleItem;
					data.old = slot;
				} else {
					toggleItem.amount += 1;
					inv.setItem(data.toggleSlot, toggleItem);
					data.old = slot;
				}
			}

			data.oldPres = "crafting_input";
			data.cOld = slot;

			console.warn(JSON.stringify(data), old, slot);
			craftingUi(player, slot, { ...data }); // restart UI loop
		}

	});
}
const parseIndex = i => i < 9? {type:"slot.hotbar", slot: i}: {type: "slot.inventory", slot: i - 9}
import {system} from "@minecraft/server"
system.beforeEvents.startup.subscribe((init) => {
	init.customCommandRegistry.registerEnum()
})