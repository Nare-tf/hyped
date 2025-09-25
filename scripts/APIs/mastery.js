import { Player } from "@minecraft/server";

Player.prototype.mastery = function() {
    return {
        // Get weapon mastery level
        getLevel: (weaponType) => this.getDynamicProperty(`mastery_${weaponType}`) ?? 0,
        
        // Get usage count
        getUsage: (weaponType) => this.getDynamicProperty(`usage_${weaponType}`) ?? 0,
        
        // Add usage and check for mastery increase
        addUsage: (weaponType) => {
            const usage = this.mastery().getUsage(weaponType) + 1;
            const currentMastery = this.mastery().getLevel(weaponType);
            
            this.setDynamicProperty(`usage_${weaponType}`, usage);
            
            // Mastery thresholds: 10, 50, 150, 500, 1000+ uses
            const thresholds = [10, 50, 150, 500, 1000];
            const newMastery = thresholds.findIndex(t => usage < t);
            const masteryLevel = newMastery === -1 ? 5 : newMastery;
            
            if (masteryLevel > currentMastery) {
                this.setDynamicProperty(`mastery_${weaponType}`, masteryLevel);
                this.sendMessage(`§d§lMASTERY UP! §r§5${weaponType} Mastery ${masteryLevel}`);
                return true;
            }
            return false;
        },
        
        // Get mastery bonuses (damage, cooldown reduction, etc.)
        getBonuses: (weaponType) => {
            const level = this.mastery().getLevel(weaponType);
            return {
                damageBonus: level * 0.05, // 5% per level
                cooldownReduction: level * 0.1, // 10% per level
                manaReduction: level * 0.02 // 2% per level
            };
        }
    };
};