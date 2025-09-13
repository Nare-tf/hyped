import { MenuRegister } from "./menu_register";
const shape = [
		'cyc',
        'ycy',
        ' u '
	]
MenuRegister.register("craft", "0", {
	name: "§l§4Looks GOOD no?",
	shape: shape,
	keys: {
		c: ["Named", ["this was supposed to be desc"], "minecraft:black_stained_glass_pane",1,0, true],
		y: ["Unnamed", ["couldnt be....", "bothered?"], "minecraft:netherite_sword"],
        u: ["",,"minecraft:dirt",,,true],
        result: ["Named It(Enchanted)", ["Lore Drops", "...sommetimes"], "minecraft:dirt", 1, 0, true]
	}
}, (res, plr) => {
	if (shape.join("").charAt(res.selection) ==='y') {
		//how do show another form to placer, like MenuRegister.show wont run unless new instance is created
		MenuRegister.show("p1", plr)
	}
})