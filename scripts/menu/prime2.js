import { MenuRegister } from "./menu_register";
const shape = [
		'__yycyy__',
		'__y_c_y__',
		'_cycccyc_',
		'__y_c_y__',
		'__yycyy__',
        'ccccccccc'
	]
MenuRegister.register("prime2", "large", {
	name: "Prime 2",
	shape: shape,
	keys: {
		c: ["Named", ["this was supposed to be desc"], "minecraft:stone",99,0, true],
		y: ["Unnamed", ["couldnt be....", "bothered?"], "minecraft:diamond"]
	}
}, (res, plr) => {
	if (shape.join("").charAt(res.selection) ==='y') {
		//how do show another form to placer, like MenuRegister.show wont run unless new instance is created
		MenuRegister.show("prime_menu", plr)
	}
})