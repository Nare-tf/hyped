import { MenuRegister } from "./menu_register";
import { craftingUi } from "../ui/crafting_table_ui";
const shape = [
		'__xxyxx__',
		'__x_y_x__',
		'_yxyzyxy_',
		'__x_y_x__',
		'__xxyxx__',
		'xxxxyxxxx'
	]
MenuRegister.register("prime_menu", "large", {
	name: "Prime Menu",
	shape: shape,
	keys: {
		x: ["Named", ["this was supposed to be desc"], "minecraft:black_stained_glass"],
		y: ["Unnamed", ["couldnt be....", "bothered?"], "minecraft:diamond"],
		z: ["Crafting Table", ["Yup Craft Your §lShits here."], "minecraft:crafting_table", 1,0, true]
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
	}
})