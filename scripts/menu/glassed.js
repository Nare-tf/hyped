import { MenuRegister } from "./menu_register";
const shape = [
		'__yycyy__',
		'__y_c_y__',
		'_cycccyc_',
		'__y_c_y__',
		'__yycyy__',
        'ccccccccc'
	]
MenuRegister.register("glassed", "large", {
	name: "§l§4Looks GOOD no?",
	shape: shape,
	keys: {
		c: ["Named", ["this was supposed to be desc"], "minecraft:black_stained_glass_pane",0,,0, true],
		y: ["Unnamed", ["couldnt be....", "bothered?"], "minecraft:netherite_sword"]
	}
}, (res, plr) => {
	if (shape.join("").charAt(res.selection) ==='y') {
		MenuRegister.show("craft", plr)
	}
})