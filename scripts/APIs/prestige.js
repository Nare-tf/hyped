import { Player } from "@minecraft/server";
Player.prototype.prestige = function() {
    return {
        getLevel: () => this.getDynamicProperty("prestige_level") ?? 0,
        
        canPrestige: () => {
            // Require all skills at level 25+
            const skills = ["combat", "magic", "utility"];
            return skills.every(skill => this.skills().getLevel(skill) >= 25);
        },
        
        doPrestige: () => {
            if (!this.prestige().canPrestige()) return false;
            
            const currentPrestige = this.prestige().getLevel();
            
            // Reset all skills and masteries
            ["combat", "magic", "utility"].forEach(skill => {
                this.setDynamicProperty(`skill_${skill}_level`, 0);
                this.setDynamicProperty(`skill_${skill}_xp`, 0);
                this.setDynamicProperty(`skill_${skill}_nodes`, JSON.stringify([]));
            });
            
            // Increase prestige
            this.setDynamicProperty("prestige_level", currentPrestige + 1);
            
            // Give prestige bonuses
            this.mana().addMax(50); // +50 max mana per prestige
            
            this.sendMessage(`§c§l§kii§r §6§lPRESTIGE ${currentPrestige + 1}! §r§c§l§kii`);
            this.playSound("ui.toast.challenge_complete");
            
            return true;
        },
        
        getBonuses: () => {
            const level = this.prestige().getLevel();
            return {
                xpMultiplier: 1 + (level * 0.1), // 10% more XP per prestige
                maxManaBonus: level * 50,
                rareFindChance: level * 0.02 // 2% better drops per prestige
            };
        }
    };
};