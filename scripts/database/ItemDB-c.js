import { world } from '@minecraft/server';
import { Database } from './database.js'; // Import your Database class

export class ItemDB {
    constructor(namespace = "") {
        if (!/^[A-Za-z0-9_-]*$/.test(namespace)) {
            throw new Error(`Invalid namespace: ${namespace}. Use only A-Z, a-z, 0-9, _`);
        }
        
        this.namespace = namespace;
        this.dimension = world.getDimension("overworld");
        this.cache = new Map();
        this.db = new Database('idb_meta'); // Using your Database class for metadata
        
        // Initialize storage location
        this.initStorage();
    }
    
    initStorage() {
        // Try to get existing storage location
        if (this.db.has('storage_x') && this.db.has('storage_z')) {
            this.storageLocation = {
                x: parseInt(this.db.get('storage_x')),
                y: 318,
                z: parseInt(this.db.get('storage_z'))
            };
        } else {
            // Set new storage location based on first player or default
            const player = world.getPlayers()[0];
            const loc = player ? player.location : { x: 0, z: 0 };
            
            this.storageLocation = { x: Math.floor(loc.x), y: 318, z: Math.floor(loc.z) };
            this.db.set('storage_x', this.storageLocation.x.toString());
            this.db.set('storage_z', this.storageLocation.z.toString());
            
            // Create ticking area
            this.dimension.runCommand(
                `/tickingarea add ${this.storageLocation.x} 319 ${this.storageLocation.z} ${this.storageLocation.x} 318 ${this.storageLocation.z} idb_storage`
            );
        }
    }
    
    getKey(key) {
        if (!/^[A-Za-z0-9_]*$/.test(key)) {
            throw new Error(`Invalid key: ${key}. Use only A-Z, a-z, 0-9, _`);
        }
        return this.namespace ? `${this.namespace}:${key}` : key;
    }
    
    loadEntities(key, count = 1) {
        try {
            world.structureManager.place(key, this.dimension, this.storageLocation, { includeEntities: true });
        } catch {
            // Structure doesn't exist, spawn new entities
            for (let i = 0; i < count; i++) {
                this.dimension.spawnEntity("file:folder", this.storageLocation);
            }
        }
        
        const entities = this.dimension.getEntities({ 
            location: this.storageLocation, 
            type: "file:folder" 
        });
        
        // Adjust entity count
        while (entities.length < count) {
            entities.push(this.dimension.spawnEntity("file:folder", this.storageLocation));
        }
        while (entities.length > count) {
            entities.pop().remove();
        }
        
        return entities.map(entity => entity.getComponent("inventory").container);
    }
    
    saveStructure(key) {
        try {
            world.structureManager.delete(key);
        } catch {}
        
        world.structureManager.createFromWorld(
            key, this.dimension, this.storageLocation, this.storageLocation,
            { saveMode: "World", includeEntities: true }
        );
        
        // Clean up entities
        const entities = this.dimension.getEntities({ 
            location: this.storageLocation, 
            type: "file:folder" 
        });
        entities.forEach(e => e.remove());
    }
    
    set(key, value) {
        const fullKey = this.getKey(key);
        
        if (value === undefined) {
            this.delete(key);
            return;
        }
        
        const isArray = Array.isArray(value);
        if (isArray && value.length > 1024) {
            throw new Error(`Array too large: ${value.length}. Max 1024 items.`);
        }
        
        const entityCount = isArray ? Math.ceil(value.length / 256) : 1;
        const containers = this.loadEntities(fullKey, entityCount);
        
        if (isArray) {
            containers.forEach((container, index) => {
                for (let i = 0; i < 256; i++) {
                    const itemIndex = index * 256 + i;
                    container.setItem(i, value[itemIndex] || undefined);
                }
            });
            world.setDynamicProperty(fullKey, entityCount);
        } else {
            containers[0].setItem(0, value);
            world.setDynamicProperty(fullKey, false);
        }
        
        this.cache.set(fullKey, value);
        this.saveStructure(fullKey);
    }
    
    get(key) {
        const fullKey = this.getKey(key);
        
        if (this.cache.has(fullKey)) {
            return this.cache.get(fullKey);
        }
        
        if (!world.structureManager.get(fullKey)) {
            throw new Error(`Key not found: ${key}`);
        }
        
        const isArray = world.getDynamicProperty(fullKey);
        const entityCount = isArray || 1;
        const containers = this.loadEntities(fullKey, entityCount);
        
        if (isArray) {
            const items = [];
            containers.forEach((container, index) => {
                for (let i = 0; i < 256; i++) {
                    const item = container.getItem(i);
                    if (item) items[index * 256 + i] = item;
                }
            });
            
            // Remove trailing undefined items
            while (items.length > 0 && items[items.length - 1] === undefined) {
                items.pop();
            }
            
            this.cache.set(fullKey, items);
            this.saveStructure(fullKey);
            return items;
        } else {
            const item = containers[0].getItem(0);
            this.cache.set(fullKey, item);
            this.saveStructure(fullKey);
            return item;
        }
    }
    
    has(key) {
        const fullKey = this.getKey(key);
        return this.cache.has(fullKey) || !!world.structureManager.get(fullKey);
    }
    
    delete(key) {
        const fullKey = this.getKey(key);
        
        if (!this.has(key)) {
            throw new Error(`Key not found: ${key}`);
        }
        
        this.cache.delete(fullKey);
        world.setDynamicProperty(fullKey, null);
        
        try {
            world.structureManager.delete(fullKey);
        } catch {}
    }
    
    keys() {
        const prefix = this.namespace ? `${this.namespace}:` : "";
        return world.getDynamicPropertyIds()
            .filter(id => id.startsWith(prefix))
            .map(id => id.replace(prefix, ""));
    }
    
    values() {
        return this.keys().map(key => this.get(key));
    }
    
    size() {
        return this.keys().length;
    }
    
    clear() {
        const keys = this.keys();
        keys.forEach(key => this.delete(key));
        this.cache.clear();
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    entries() {
        return this.keys().map(key => [key, this.get(key)]);
    }
    
    forEach(callback) {
        this.keys().forEach(key => {
            callback(this.get(key), key, this);
        });
    }
}