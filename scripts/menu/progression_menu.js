import { MenuRegister } from "./menu_register.js";

const progressionMenuShape = [
    'ggggggggg',
    'g s m p g',
    'g       g',
    'g c r a g',
    'g       g',
    'g   h   g',
    'ggggggggg'
];

MenuRegister.register("progression_menu", "large", {
    name: "§6§lProgression Menu",
    shape: progressionMenuShape,
    keys: {
        g: ["", [], "minecraft:black_stained_glass_pane"],
        s: ["Skills", ["View skill levels", "and unlock nodes"], "minecraft:experience_bottle"],
        m: ["Mastery", ["Weapon mastery", "and bonuses"], "minecraft:diamond_sword"],
        p: ["Prestige", ["Reset for", "permanent bonuses"], "minecraft:nether_star"],
        c: ["Crafting", ["View unlocked", "recipes"], "minecraft:crafting_table"],
        r: ["Records", ["View your", "achievements"], "minecraft:book"],
        a: ["Achievements", ["Complete goals", "for rewards"], "minecraft:gold_ingot"],
        h: ["Help", ["Learn about", "progression"], "minecraft:written_book"]
    }
}, (response, player) => {
    const selection = progressionMenuShape.join("").charAt(response.selection);
    
    switch(selection) {
        case 's':
            showSkillsMenu(player);
            break;
        case 'm':
            showMasteryMenu(player);
            break;
        case 'p':
            showPrestigeMenu(player);
            break;
        case 'c':
            showCraftingRecipes(player);
            break;
        case 'r':
            showRecordsMenu(player);
            break;
        case 'a':
            showAchievements(player);
            break;
        case 'h':
            showHelpMenu(player);
            break;
    }
});

// Skills submenu
function showSkillsMenu(player) {
    const skills = ["combat", "magic", "mining", "foraging", "crafting"];
    const shape = ['gsgsgsgsg'];
    const keys = { g: ["", [], "minecraft:gray_stained_glass_pane"] };
    
    skills.forEach((skill, index) => {
        const level = player.skills().getLevel(skill);
        const xp = player.skills().getXP(skill);
        const nextLevelXP = (level + 1) * 1000 * Math.pow(1.2, level);
        
        keys['s'] = [
            `§6${skill.charAt(0).toUpperCase() + skill.slice(1)}`,
            [
                `§7Level: §a${level}`,
                `§7XP: §b${xp}§7/§b${nextLevelXP}`,
                `§7Progress: §e${Math.floor((xp/nextLevelXP)*100)}%`,
                "",
                "§eClick to view skill tree"
            ],
            getSkillIcon(skill),
            1, 0, level >= 10
        ];
    });
    
    MenuRegister.register("skills_menu", "9", {
        name: "§6Skills Overview",
        shape,
        keys
    }, (response, player) => {
        // Open specific skill tree
        const skillIndex = Math.floor(response.selection / 2);
        if (skillIndex < skills.length) {
            showSkillTree(player, skills[skillIndex]);
        }
    });
    
    MenuRegister.show("skills_menu", player);
}

function getSkillIcon(skill) {
    const icons = {
        combat: "minecraft:iron_sword",
        magic: "minecraft:blaze_rod",
        mining: "minecraft:iron_pickaxe",
        foraging: "minecraft:iron_axe",
        crafting: "minecraft:crafting_table"
    };
    return icons[skill] || "minecraft:book";
}
