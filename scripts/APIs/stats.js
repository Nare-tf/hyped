// APIs/stats.js - Complete RPG stats system
import { Player, ItemStack } from "@minecraft/server";
import { clamp } from "../utils/utils.js";

/**
 * RPG Stats helper for players
 * @param {Player} player
 * @returns {Object}
 */
function StatsHelper(player) {
    return {
        // STRENGTH - increases damage
        getStrength: () => player.getDynamicProperty("strength") ?? 0,
        setStrength: (val = 0) => player.setDynamicProperty("strength", Math.max(0, val)),
        addStrength: (val) => {
            const current = player.stats().getStrength();
            player.setDynamicProperty("strength", Math.max(0, current + val));
        },
        removeStrength: (val) => {
            const current = player.stats().getStrength();
            player.setDynamicProperty("strength", Math.max(0, current - val));
        },

        // DEFENSE - reduces incoming damage
        getDefense: () => player.getDynamicProperty("defense") ?? 0,
        setDefense: (val = 0) => player.setDynamicProperty("defense", Math.max(0, val)),
        addDefense: (val) => {
            const current = player.stats().getDefense();
            player.setDynamicProperty("defense", Math.max(0, current + val));
        },
        removeDefense: (val) => {
            const current = player.stats().getDefense();
            player.setDynamicProperty("defense", Math.max(0, current - val));
        },

        // HEALTH - max health bonus
        getHealth: () => player.getDynamicProperty("bonusHealth") ?? 0,
        setHealth: (val = 0) => {
            player.setDynamicProperty("bonusHealth", Math.max(0, val));
            player.stats().updateHealthAttribute();
        },
        addHealth: (val) => {
            const current = player.stats().getHealth();
            player.setDynamicProperty("bonusHealth", Math.max(0, current + val));
            player.stats().updateHealthAttribute();
        },
        removeHealth: (val) => {
            const current = player.stats().getHealth();
            player.setDynamicProperty("bonusHealth", Math.max(0, current - val));
            player.stats().updateHealthAttribute();
        },

        // SPEED - movement speed bonus
        getSpeed: () => player.getDynamicProperty("bonusSpeed") ?? 0,
        setSpeed: (val = 0) => {
            player.setDynamicProperty("bonusSpeed", Math.max(0, val));
            player.stats().updateSpeedAttribute();
        },
        addSpeed: (val) => {
            const current = player.stats().getSpeed();
            player.setDynamicProperty("bonusSpeed", Math.max(0, current + val));
            player.stats().updateSpeedAttribute();
        },
        removeSpeed: (val) => {
            const current = player.stats().getSpeed();
            player.setDynamicProperty("bonusSpeed", Math.max(0, current - val));
            player.stats().updateSpeedAttribute();
        },

        // CRIT CHANCE - critical hit probability (0-100)
        getCritChance: () => player.getDynamicProperty("critChance") ?? 5,
        setCritChance: (val = 5) => player.setDynamicProperty("critChance", clamp(val, 0, 100)),
        addCritChance: (val) => {
            const current = player.stats().getCritChance();
            player.setDynamicProperty("critChance", clamp(current + val, 0, 100));
        },

        // CRIT DAMAGE - critical hit damage multiplier (50 = 1.5x damage)
        getCritDamage: () => player.getDynamicProperty("critDamage") ?? 50,
        setCritDamage: (val = 50) => player.setDynamicProperty("critDamage", Math.max(0, val)),
        addCritDamage: (val) => {
            const current = player.stats().getCritDamage();
            player.setDynamicProperty("critDamage", Math.max(0, current + val));
        },

        // ATTACK SPEED - reduces attack cooldown
        getAttackSpeed: () => player.getDynamicProperty("attackSpeed") ?? 0,
        setAttackSpeed: (val = 0) => player.setDynamicProperty("attackSpeed", Math.max(0, val)),
        addAttackSpeed: (val) => {
            const current = player.stats().getAttackSpeed();
            player.setDynamicProperty("attackSpeed", Math.max(0, current + val));
        },

        // INTELLIGENCE - increases mana and ability damage
        getIntelligence: () => player.getDynamicProperty("intelligence") ?? 0,
        setIntelligence: (val = 0) => {
            player.setDynamicProperty("intelligence", Math.max(0, val));
            player.stats().updateManaFromIntelligence();
        },
        addIntelligence: (val) => {
            const current = player.stats().getIntelligence();
            player.setDynamicProperty("intelligence", Math.max(0, current + val));
            player.stats().updateManaFromIntelligence();
        },

        // UTILITY FUNCTIONS
        updateHealthAttribute: () => {
            const bonusHealth = player.stats().getHealth();
            const baseHealth = 20; // Minecraft default
            const newMaxHealth = baseHealth + Math.floor(bonusHealth / 2); // 2 bonus health = 1 heart
            
            try {
                const healthComponent = player.getComponent("minecraft:health");
                if (healthComponent) {
                    healthComponent.setCurrentValue(Math.min(healthComponent.currentValue, newMaxHealth));
                }
            } catch (e) {
                // Health component modification might not be available
            }
        },

        updateSpeedAttribute: () => {
            const bonusSpeed = player.stats().getSpeed();
            const speedBonus = Math.floor(bonusSpeed / 100); // 100 speed = +1 speed level
            
            if (speedBonus > 0) {
                player.addEffect("speed", 999999, { amplifier: Math.min(speedBonus, 5), showParticles: false });
            } else {
                player.removeEffect("speed");
            }
        },

        updateManaFromIntelligence: () => {
            const intelligence = player.stats().getIntelligence();
            const bonusMana = Math.floor(intelligence * 2); // 1 int = 2 mana
            
            // Update max mana based on intelligence
            const baseMana = 100;
            player.mana().setMax(baseMana + bonusMana);
        },

        // CALCULATE TOTAL DAMAGE with all modifiers
        calculateDamage: (baseDamage) => {
            const strength = player.stats().getStrength();
            const intelligence = player.stats().getIntelligence();
            const critChance = player.stats().getCritChance();
            const critDamage = player.stats().getCritDamage();

            // Base damage calculation: damage * (1 + strength/100)
            let totalDamage = baseDamage * (1 + strength / 100);

            // Add intelligence bonus for magic damage
            totalDamage += intelligence * 0.25;

            // Check for critical hit
            const isCritical = Math.random() * 100 < critChance;
            if (isCritical) {
                totalDamage *= (1 + critDamage / 100);
                return { damage: Math.floor(totalDamage), isCritical: true };
            }

            return { damage: Math.floor(totalDamage), isCritical: false };
        },

        // CALCULATE DAMAGE REDUCTION from defense
        calculateDefense: (incomingDamage) => {
            const defense = player.stats().getDefense();
            // Defense formula: damage * (1 - defense/(defense + 100))
            const damageReduction = defense / (defense + 100);
            const finalDamage = incomingDamage * (1 - damageReduction);
            
            return {
                originalDamage: incomingDamage,
                finalDamage: Math.max(1, Math.floor(finalDamage)), // Minimum 1 damage
                damageBlocked: Math.floor(incomingDamage - finalDamage)
            };
        },

        // GET ALL STATS as object
        getAll: () => {
            return {
                strength: player.stats().getStrength(),
                defense: player.stats().getDefense(),
                health: player.stats().getHealth(),
                speed: player.stats().getSpeed(),
                critChance: player.stats().getCritChance(),
                critDamage: player.stats().getCritDamage(),
                attackSpeed: player.stats().getAttackSpeed(),
                intelligence: player.stats().getIntelligence()
            };
        },

        // INIT with default values
        init: (stats = {}) => {
            const defaults = {
                strength: 0,
                defense: 0,
                bonusHealth: 0,
                bonusSpeed: 0,
                critChance: 5,
                critDamage: 50,
                attackSpeed: 0,
                intelligence: 0
            };

            Object.assign(defaults, stats);

            Object.entries(defaults).forEach(([stat, value]) => {
                    player.setDynamicProperty(stat, value);
            });

            // Update attributes
            player.stats().updateHealthAttribute();
            player.stats().updateSpeedAttribute();
            player.stats().updateManaFromIntelligence();
        }
    };
}

/**
 * Add stats API to Player prototype
 */
Player.prototype.stats = function() {
    return StatsHelper(this);
};

/**
 * Item stats helper for equipment
 * @param {ItemStack} item
 * @returns {Object}
 */
function ItemStatsHelper(item) {
    return {
        // GET stat bonuses from item
        getStrength: () => item.getDynamicProperty("itemStrength") ?? 0,
        getDefense: () => item.getDynamicProperty("itemDefense") ?? 0,
        getHealth: () => item.getDynamicProperty("itemHealth") ?? 0,
        getSpeed: () => item.getDynamicProperty("itemSpeed") ?? 0,
        getCritChance: () => item.getDynamicProperty("itemCritChance") ?? 0,
        getCritDamage: () => item.getDynamicProperty("itemCritDamage") ?? 0,
        getAttackSpeed: () => item.getDynamicProperty("itemAttackSpeed") ?? 0,
        getIntelligence: () => item.getDynamicProperty("itemIntelligence") ?? 0,

        // SET stat bonuses on item
        setStrength: (val = 0) => {
            item.setDynamicProperty("itemStrength", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setDefense: (val = 0) => {
            item.setDynamicProperty("itemDefense", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setHealth: (val = 0) => {
            item.setDynamicProperty("itemHealth", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setSpeed: (val = 0) => {
            item.setDynamicProperty("itemSpeed", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setCritChance: (val = 0) => {
            item.setDynamicProperty("itemCritChance", clamp(val, 0, 100));
            item.itemStats().updateLore();
        },
        setCritDamage: (val = 0) => {
            item.setDynamicProperty("itemCritDamage", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setAttackSpeed: (val = 0) => {
            item.setDynamicProperty("itemAttackSpeed", Math.max(0, val));
            item.itemStats().updateLore();
        },
        setIntelligence: (val = 0) => {
            item.setDynamicProperty("itemIntelligence", Math.max(0, val));
            item.itemStats().updateLore();
        },

        // UPDATE item lore with stats
        updateLore: () => {
            const stats = item.itemStats();
            const currentLore = item.getLore() || [];
            
            // Remove existing stat lines (those starting with §7)
            const nonStatLore = currentLore.filter(line => !line.startsWith("§7"));
            
            // Add stat lines
            const statLines = [];
            if (stats.getStrength() > 0) statLines.push(`§7Strength: §c+${stats.getStrength()}`);
            if (stats.getDefense() > 0) statLines.push(`§7Defense: §a+${stats.getDefense()}`);
            if (stats.getHealth() > 0) statLines.push(`§7Health: §c+${stats.getHealth()}`);
            if (stats.getSpeed() > 0) statLines.push(`§7Speed: §f+${stats.getSpeed()}`);
            if (stats.getCritChance() > 0) statLines.push(`§7Crit Chance: §9+${stats.getCritChance()}%`);
            if (stats.getCritDamage() > 0) statLines.push(`§7Crit Damage: §9+${stats.getCritDamage()}%`);
            if (stats.getAttackSpeed() > 0) statLines.push(`§7Attack Speed: §e+${stats.getAttackSpeed()}`);
            if (stats.getIntelligence() > 0) statLines.push(`§7Intelligence: §b+${stats.getIntelligence()}`);

            // Combine lore
            const newLore = [...nonStatLore, ...statLines];
            item.setLore(newLore);
        },

        // GET all item stats
        getAll: () => {
            return {
                strength: item.itemStats().getStrength(),
                defense: item.itemStats().getDefense(),
                health: item.itemStats().getHealth(),
                speed: item.itemStats().getSpeed(),
                critChance: item.itemStats().getCritChance(),
                critDamage: item.itemStats().getCritDamage(),
                attackSpeed: item.itemStats().getAttackSpeed(),
                intelligence: item.itemStats().getIntelligence()
            };
        }
    };
}

/**
 * Add item stats API to ItemStack prototype
 */
ItemStack.prototype.itemStats = function() {
    return ItemStatsHelper(this);
};

// Equipment Manager - handles stat bonuses from worn items
export class EquipmentManager {
    /**
     * Calculate total stats from all equipment
     * @param {Player} player 
     * @returns {Object}
     */
    static getEquipmentStats(player) {
        const inv = player.getComponent("inventory").container;
        const totalStats = {
            strength: 0,
            defense: 0,
            health: 0,
            speed: 0,
            critChance: 0,
            critDamage: 0,
            attackSpeed: 0,
            intelligence: 0
        };

        // Check all inventory slots for equipment
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item && item.getDynamicProperty("equipment")) {
                const itemStats = item.itemStats().getAll();
                
                Object.keys(totalStats).forEach(stat => {
                    totalStats[stat] += itemStats[stat] || 0;
                });
            }
        }

        return totalStats;
    }

    /**
     * Update player stats from equipment
     * @param {Player} player 
     */
    static updatePlayerStats(player) {
        const equipStats = this.getEquipmentStats(player);
        
        // Reset equipment bonuses (would need to track base vs equipment stats)
        // This is a simplified version - in practice you'd want to track base stats separately
        Object.entries(equipStats).forEach(([stat, value]) => {
            const currentValue = player.stats()[`get${stat.charAt(0).toUpperCase() + stat.slice(1)}`]();
            player.setDynamicProperty(stat, currentValue + value);
        });

        // Update attributes
        player.stats().updateHealthAttribute();
        player.stats().updateSpeedAttribute();
        player.stats().updateManaFromIntelligence();
    }
}

// Utility function to create items with stats
export function createItemWithStats(typeId, name, stats = {}, lore = []) {
    const item = new ItemStack(typeId, 1);
    item.nameTag = name;
    
    // Set stats
    Object.entries(stats).forEach(([stat, value]) => {
        const methodName = `set${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
        if (item.itemStats()[methodName]) {
            item.itemStats()[methodName](value);
        }
    });
    
    // Add equipment tag
    item.setDynamicProperty("equipment", true);
    
    // Set additional lore
    if (lore.length > 0) {
        const currentLore = item.getLore() || [];
        item.setLore([...lore, ...currentLore]);
    }
    
    return item;
}

export { StatsHelper, ItemStatsHelper };