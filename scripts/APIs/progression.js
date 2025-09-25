import { Player, ItemStack } from "@minecraft/server";
Player.prototype.skills = function() {
    return {
        // Get skill level (0-50)
        getLevel: (skillType) => this.getDynamicProperty(`skill_${skillType}_level`) ?? 0,
        
        // Get skill XP
        getXP: (skillType) => this.getDynamicProperty(`skill_${skillType}_xp`) ?? 0,
        
        // Add XP and handle level ups
        addXP: (skillType, amount) => {
            const currentXP = this.skills().getXP(skillType);
            const currentLevel = this.skills().getLevel(skillType);
            const newXP = currentXP + amount;
            
            this.setDynamicProperty(`skill_${skillType}_xp`, newXP);
            
            // Check for level up (exponential scaling)
            const requiredXP = (currentLevel + 1) * 1000 * Math.pow(1.2, currentLevel);
            if (newXP >= requiredXP && currentLevel < 50) {
                this.setDynamicProperty(`skill_${skillType}_level`, currentLevel + 1);
                this.sendMessage(`§6§lSKILL LEVEL UP! §r§e${skillType} is now level ${currentLevel + 1}`);
                this.playSound("random.levelup");
                return true; // Leveled up
            }
            return false;
        },
        
        // Get unlocked nodes for skill tree
        getNodes: (skillType) => {
            const nodes = this.getDynamicProperty(`skill_${skillType}_nodes`);
            return nodes ? JSON.parse(nodes) : [];
        },
        
        // Unlock skill node
        unlockNode: (skillType, nodeId, cost = 1) => {
            const level = this.skills().getLevel(skillType);
            if (level < cost) return false;
            
            const nodes = this.skills().getNodes(skillType);
            if (!nodes.includes(nodeId)) {
                nodes.push(nodeId);
                this.setDynamicProperty(`skill_${skillType}_nodes`, JSON.stringify(nodes));
                return true;
            }
            return false;
        }
    };
};