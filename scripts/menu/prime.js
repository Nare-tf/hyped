import { MenuRegister } from "./menu_register";
import { craftingUi } from "../ui/crafting_table_ui";
import { auctionHouse, enderChest, shopChest} from "../ui/chest_ui";
import { ItemStack } from "@minecraft/server";
const shape = [
		'__xxyxx__',
		'__x_y_x__',
		'_yxyzyxy_',
		'__x_l_x__',
		'__xxyxx__',
		'xnxxyxxkx'
	]
MenuRegister.register("prime_menu", "large", {
	name: "Prime Menu",
	shape: shape,
	keys: {
		x: ["Named", ["this was supposed to be desc"], "minecraft:black_stained_glass"],
		y: ["Unnamed", ["couldnt be....", "bothered?"], "minecraft:diamond"],
		z: ["Crafting Table", ["Yup Craft Your §lShits here."], "minecraft:crafting_table", 1,0, true],
		l: ["Ender Chest",,"minecraft:ender_chest",,,true],
		k: ["___",,"minecraft:dirt",,,true],
		n: [,,"minecraft:dirt",,,true]
	}
}, (res, plr) => {
	switch(shape.join("").charAt(res.selection)) {
		case "y":
			MenuRegister.show("prime2", plr)
			break
		case "z":
			craftingUi(plr)
			break
		case "x":
			MenuRegister.show("glassed", plr)
			break
		case "l":
			// auctionHouse(plr, new Map().set("19", {item: new ItemStack("minecraft:diamond"), seller: "File", price: "100"}))
			enderChest(plr)
			break
		case "k":
			let seller = "File"
			let price = 1000
			let items = new Map()
			items.set(0, {item: new ItemStack("minecraft:diamond"), seller, price})
			items.set(1, {item: new ItemStack("dirt"), seller, price})
			auctionHouse(plr, items)
			break
		case "n":
			let ites = new Map()
			ites.set(0, {item: new ItemStack("minecraft:diamond"), price: 100})
			ites.set(1, {item: new ItemStack("dirt"), price: 100})
			shopChest(plr, ites, "MyShop")
			break
		
	}
})