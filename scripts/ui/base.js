import { Container } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { custom_content, custom_content_keys, inventory_enabled, number_of_custom_items, CHEST_UI_SIZES } from './consts.js';
import { typeIdToDataId, typeIdToID } from './numids.js';

class ChestFormData {
	#titleText;
	#buttonArray;
	#invBtnArray

	constructor(size = 'small') {
		const sizing = CHEST_UI_SIZES.get(size) ?? ['§c§h§e§s§t§2§7§r', 27];
		this.#titleText = { rawtext: [{ text: sizing[0] }] };
		this.#buttonArray = Array(sizing[1]).fill(['', undefined]);
		this.#invBtnArray = Array(36).fill(["", undefined])
		this.slotCount = sizing[1];
	}

	title(text) {
		if (typeof text === 'string') this.#titleText.rawtext.push({ text });
		else if (text?.rawtext) this.#titleText.rawtext.push(...text.rawtext);
		return this;
	}

	#makeButton(itemName, itemDesc, texture, stackSize = 1, durability = 0, enchanted = false) {
		const targetTexture = custom_content_keys.has(texture) ? custom_content[texture]?.texture : texture;
		const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);

		const rawtext = [{ text: `stack#${String(Math.min(Math.max(stackSize, 1), 99)).padStart(2, '0')}dur#${String(Math.min(Math.max(durability, 0), 99)).padStart(2, '0')}§r` }];

		if (itemName) {
			if (typeof itemName === 'string') rawtext.push({ text: `${itemName}§r` });
			else if (itemName?.rawtext) rawtext.push(...itemName.rawtext, { text: '§r' });
		}

		if (Array.isArray(itemDesc)) {
			itemDesc.forEach(line => {
				if (typeof line === 'string') rawtext.push({ text: `\n${line}` });
				else if (line?.rawtext) rawtext.push({ text: `\n` }, ...line.rawtext);
			});
		}

		return [
			{ rawtext },
			ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536) + (enchanted ? 32768 : 0)
		];
	}

	button(slot, itemName, itemDesc, texture, stackSize = 1, durability = 0, enchanted = false) {
		if (slot < 0 || slot >= this.slotCount) return this;
		this.#buttonArray[slot] = this.#makeButton(itemName, itemDesc, texture, stackSize, durability, enchanted);
		return this;
	}

	put(slot, item) {
		if (!item) {
			this.#invBtnArray[slot] = ["", ""]
		} else {
			const typeId = item.typeId;
			const targetTexture = custom_content_keys.has(typeId) ? custom_content[typeId]?.texture : typeId;
			const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);
			const durability = item.getComponent('durability');
			const durDamage = durability ? Math.round((durability.maxDurability - durability.damage) / durability.maxDurability * 99) : 0;
			const formattedItemName = item.nameTag
				? item.nameTag
				: typeId.replace(/.*(?<=:)/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
			
			let rawtext = [{ text: `stack#${String(item.amount).padStart(2, '0')}dur#${String(durDamage === 99 ? 0 : durDamage).padStart(2, '0')}§r${formattedItemName}` }];
			const lore = item.getLore().join('\n');
			if (lore) rawtext.push({ text: `\n${lore}` });

			this.#invBtnArray[slot] = [
				{ rawtext },
				ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536)
			];
		}
	}

	pattern(pattern, key) {
		for (let i = 0; i < pattern.length; i++) {
			for (let j = 0; j < pattern[i].length; j++) {
				const letter = pattern[i][j];
				if (letter !== ' ' && key[letter]) {
					const slot = j + i * 9;
					const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = key[letter];
					this.button(slot, itemName, itemDesc, texture, stackAmount, durability, enchanted);
				}
			}
		}
		return this;
	}

	show(player) {
		const form = new ActionFormData().title(this.#titleText);

		// Pre-defined chest slots
		for (let i = 0; i < this.slotCount; i++) {
			form.button(this.#buttonArray[i][0] || '', this.#buttonArray[i][1]?.toString() || undefined);
		}

		// If inventory is enabled, overlay items in inventory slots
		if (inventory_enabled) {
			const container = player.getComponent('inventory').container;
			for (let i = 0; i < 36; i++) {

				this.put(i, container.getItem(i));
				form.button(this.#invBtnArray[i][0], this.#invBtnArray[i][1]?.toString());
			}
		}

		return form.show(player);
	}
}

class AccessibleChestFormData {
	#titleText;
	#buttonArray;
	#invBtnArray

	constructor(size = 'small') {
		const sizing = CHEST_UI_SIZES.get(size) ?? ['§c§h§e§s§t§2§7§r', 27];
		this.#titleText = { rawtext: [{ text: sizing[0].replace('§c§h§e§s§t', '§c§h§e§t') }] };
		let rawtext = [{ text: `stack#${String(1).padStart(2, '0')}dur#${String(0).padStart(2, '0')}§r${""}` }];
		this.#buttonArray = Array(sizing[1]).fill([{rawtext}, undefined]);
		this.#invBtnArray = Array(36).fill([" ", undefined])
		this.slotCount = sizing[1];
	}

	title(text) {
		if (typeof text === 'string') this.#titleText.rawtext.push({ text });
		else if (text?.rawtext) this.#titleText.rawtext.push(...text.rawtext);
		return this;
	}

	#makeButton(itemName, itemDesc, texture, stackSize = 1, durability = undefined, enchanted = false) {
		const targetTexture = custom_content_keys.has(texture) ? custom_content[texture]?.texture : texture;
		const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);

		const rawtext = [{ text: `stack#${String(Math.min(Math.max(stackSize, 1), 99)).padStart(2, '0')}dur#${String(Math.min(Math.max(durability, 0), 99)).padStart(2, '0')}§r` }];

		if (itemName) {
			if (typeof itemName === 'string') rawtext.push({ text: `${itemName}§r` });
			else if (itemName?.rawtext) rawtext.push(...itemName.rawtext, { text: '§r' });
		}

		if (Array.isArray(itemDesc)) {
			itemDesc.forEach(line => {
				if (typeof line === 'string') rawtext.push({ text: `\n${line}` });
				else if (line?.rawtext) rawtext.push({ text: `\n` }, ...line.rawtext);
			});
		}

		return [
			{ rawtext },
			ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536) + (enchanted ? 32768 : 0)
		];
	}

	button(slot, itemName, itemDesc, texture, stackSize = 1, durability = 0, enchanted = false) {
		if (slot < 0 || slot >= this.slotCount) return this;
		this.#buttonArray[slot] = this.#makeButton(itemName, itemDesc, texture, stackSize, durability, enchanted);
		return this;
	}

	put(slot, item) {
		if (!item) {
			let rawtext = [{ text: `stack#${String(1).padStart(2, '0')}dur#${String(0).padStart(2, '0')}§r${""}` }];
			this.#invBtnArray[slot] = [{rawtext}, ""]
		} else {
			const typeId = item.typeId;
			const targetTexture = custom_content_keys.has(typeId) ? custom_content[typeId]?.texture : typeId;
			const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);
			const durability = item.getComponent('durability');
			const durDamage = durability ? Math.round((durability.maxDurability - durability.damage) / durability.maxDurability * 99) : 0;
			const formattedItemName = item.nameTag
				? item.nameTag
				: typeId.replace(/.*(?<=:)/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
			
			let rawtext = [{ text: `stack#${String(item.amount).padStart(2, '0')}dur#${String(durDamage === 99 ? 0 : durDamage).padStart(2, '0')}§r${formattedItemName}` }];
			const lore = item.getLore().join('\n');
			if (lore) rawtext.push({ text: `\n${lore}` });

			this.#invBtnArray[slot] = [
				{ rawtext },
				ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536)
			];
		}
	}

	pattern(pattern, key) {
		for (let i = 0; i < pattern.length; i++) {
			for (let j = 0; j < pattern[i].length; j++) {
				const letter = pattern[i][j];
				if (letter !== ' ' && key[letter]) {
					const slot = j + i * 9;
					const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = key[letter];
					this.button(slot, itemName, itemDesc, texture, stackAmount, durability, enchanted);
				}
			}
		}
		return this;
	}

	show(player) {
		const form = new ActionFormData().title(this.#titleText);

		// Pre-defined chest slots
		for (let i = 0; i < this.slotCount; i++) {
			form.button(this.#buttonArray[i][0] || ' ', this.#buttonArray[i][1]?.toString() || undefined);
		}

		// If inventory is enabled, overlay items in inventory slots
		if (inventory_enabled) {
			const container = player.getComponent('inventory').container;
			for (let i = 0; i < 36; i++) {

				this.put(i, container.getItem(i));
				form.button(this.#invBtnArray[i][0], this.#invBtnArray[i][1]?.toString());
			}
		}

		return form.show(player);
	}
}


class AccessibleCraftingTableFormData {
	#titleText; #buttonArray;
	constructor() {
		this.#titleText = { rawtext: [{ text: '§c§r§a§f§t§i§n§g§r' }] };
		// 9 crafting grid + 1 result + 36 inventory = 46
		this.#buttonArray = Array(46).fill(['', undefined]);
		this.slotCount = 46;
	}

	title(text) {
		if (typeof text === 'string') {
			this.#titleText.rawtext.push({ text });
		} else if (text?.rawtext) {
			this.#titleText.rawtext.push(...text.rawtext);
		}
		return this;
	}

	#makeButton(itemName, itemDesc, texture, stackSize, durability, enchanted) {
		const targetTexture = custom_content_keys.has(texture) ? custom_content[texture]?.texture : texture;
		const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);
		const rawtext = [{ text: `stack#${String(stackSize).padStart(2, '0')}dur#${String(durability).padStart(2, '0')}§r` }];
		
		if (itemName) rawtext.push({ text: `${itemName}§r` });
		if (Array.isArray(itemDesc)) itemDesc.forEach(line => {
			rawtext.push(typeof line === 'string' ? { text: `\n${line}` } : { text: `\n`, ...line.rawtext });
		});

		return [
			{ rawtext },
			ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536) + (enchanted ? 32768 : 0)
		];
	}

	button(slot, itemName, itemDesc, texture, stackSize = 1, durability = 0, enchanted = false) {
		if (slot < 0 || slot >= this.slotCount) return this;
		this.#buttonArray[slot] = this.#makeButton(itemName, itemDesc, texture, stackSize, durability, enchanted);
		return this;
	}

	put(slot, item) {
		if (!item) {
				this.button(slot, undefined, undefined, undefined, undefined, 0, false);
			} else {
				const typeId = item.typeId;
				const targetTexture = custom_content_keys.has(typeId) ? custom_content[typeId]?.texture : typeId;
				const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);
				const durability = item.getComponent('durability');
				const durDamage = durability ? Math.round((durability.maxDurability - durability.damage) / durability.maxDurability * 99) : 0;
				const formattedItemName = item.nameTag? item.nameTag: typeId.replace(/.*(?<=:)/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
				let rawtext = [{ text: `stack#${String(item.amount).padStart(2, '0')}dur#${String(durDamage == 99? 0: durDamage).padStart(2, '0')}§r${formattedItemName}` }];
				const lore = item.getLore().join('\n');
				if (lore) rawtext.push({ text: `\n${lore}` });
				this.#buttonArray[slot] = [
					{ rawtext },
					ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536)
				];
			}
	}

	recipe(pattern, key, result) {
		// Crafting grid (0–8)
		for (let i = 0; i < 9; i++) this.#buttonArray[i] = ['', undefined];
		for (let i = 0; i < Math.min(pattern.length, 3); i++) {
			for (let j = 0; j < Math.min(pattern[i].length, 3); j++) {
				const letter = pattern[i][j];
				if (letter !== ' ' && key[letter]) {
					const slot = j + i * 3;
					const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = key[letter];
					this.button(slot, itemName, itemDesc, texture, stackAmount, durability, enchanted);
				}
			}
		}
		// Result slot (9)
		if (result) {
			const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = result;
			this.button(9, itemName, itemDesc, texture, stackAmount, durability, enchanted);
		}
		return this;
	}

	pattern(pattern, key) {
		// Crafting grid (0–8)
		for (let i = 0; i < 9; i++) this.#buttonArray[i] = ['', undefined];
		for (let i = 0; i < Math.min(pattern.length, 3); i++) {
			for (let j = 0; j < Math.min(pattern[i].length, 3); j++) {
				const letter = pattern[i][j];
				if (letter !== ' ' && key[letter]) {
					const slot = j + i * 3;
					const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = key[letter];
					this.button(slot, itemName, itemDesc, texture, stackAmount, durability, enchanted);
				}
			}
		}
		// Result slot (9)
		if (key.result) {
			const { itemName, itemDesc, texture, stackAmount = 1, durability = 0, enchanted = false } = key.result;
			this.button(9, itemName, itemDesc, texture, stackAmount, durability, enchanted);
		}
		return this;
	}

	show(player) {
		const form = new ActionFormData().title(this.#titleText);

		// Fill crafting grid + result (slots 0–9)
		for (let i = 0; i < 10; i++) {
			form.button(this.#buttonArray[i][0] || this.#makeButton(undefined, undefined, undefined, 1, 0, false)[0], this.#buttonArray[i][1]?.toString() || this.#makeButton(undefined, undefined, undefined, 1, 0, false)[1]?.toString());
		}

		// Fill inventory (slots 10–45)
		const container = player.getComponent('inventory').container;
		for (let i = 0; i < 36; i++) {
			const item = container.getItem(i);
			if (!item) {
				this.button(i + 10, undefined, undefined, undefined, undefined, 0, false);
			} else {
				const typeId = item.typeId;
				const targetTexture = custom_content_keys.has(typeId) ? custom_content[typeId]?.texture : typeId;
				const ID = typeIdToDataId.get(targetTexture) ?? typeIdToID.get(targetTexture);
				const durability = item.getComponent('durability');
				const durDamage = durability ? Math.round((durability.maxDurability - durability.damage) / durability.maxDurability * 99) : 0;
				const formattedItemName = item.nameTag? item.nameTag: typeId.replace(/.*(?<=:)/, '').replace(/_/g, ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
				let rawtext = [{ text: `stack#${String(item.amount).padStart(2, '0')}dur#${String(durDamage == 99? 0: durDamage).padStart(2, '0')}§r${formattedItemName}` }];
				const lore = item.getLore().join('\n');
				if (lore) rawtext.push({ text: `\n${lore}` });
				this.#buttonArray[i + 10] = [
					{ rawtext },
					ID === undefined ? targetTexture : ((ID + (ID < 256 ? 0 : number_of_custom_items)) * 65536)
				];
			}
			form.button(this.#buttonArray[i + 10][0], this.#buttonArray[i + 10][1]?.toString());
		}
		return form.show(player);
	}

	parseSelection(selection) {
		if (selection < 9) return { type: 'crafting_input', slot: selection };
		if (selection === 9) return { type: 'crafting_result', slot: 9 };
		return { type: 'inventory', slot: selection - 10 };
	}
}


export { ChestFormData, AccessibleChestFormData, AccessibleCraftingTableFormData };