import { world, system } from '@minecraft/server';
import { Database } from './database.js'; // For metadata storage

export class ItemDB {
  constructor(namespace = "", cacheSize = 50, saveRate = 1) {
    if (!/^[A-Za-z0-9_]*$/.test(namespace)) {
      throw new Error(`Invalid namespace: ${namespace}. Use only A-Z, a-z, 0-9, _`);
    }

    this.namespace = namespace;
    this.dimension = world.getDimension("overworld");
    this.cache = new Map();
    this.db = new Database('idb_meta');

    this.queue = []; // save queue
    this.cacheSize = cacheSize;
    this.saveRate = saveRate; // how many keys per tick
    this.saving = false;

    this.initStorage();
    this.startSaveLoop();
  }

  initStorage() {
    if (this.db.has('storage_x') && this.db.has('storage_z')) {
      this.storageLocation = {
        x: parseInt(this.db.get('storage_x')),
        y: 318,
        z: parseInt(this.db.get('storage_z'))
      };
    } else {
      const player = world.getPlayers()[0];
      const loc = player ? player.location : { x: 0, z: 0 };

      this.storageLocation = { x: Math.floor(loc.x), y: 318, z: Math.floor(loc.z) };
      this.db.set('storage_x', this.storageLocation.x.toString());
      this.db.set('storage_z', this.storageLocation.z.toString());

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
      for (let i = 0; i < count; i++) {
        this.dimension.spawnEntity("file:folder", this.storageLocation);
      }
    }

    const entities = this.dimension.getEntities({
      location: this.storageLocation,
      type: "file:folder"
    });

    while (entities.length < count) {
      entities.push(this.dimension.spawnEntity("file:folder", this.storageLocation));
    }
    while (entities.length > count) {
      entities.pop().remove();
    }

    return entities.map(entity => entity.getComponent("inventory").container);
  }

  saveStructure(key) {
    try { world.structureManager.delete(key); } catch {}
    world.structureManager.createFromWorld(
      key, this.dimension, this.storageLocation, this.storageLocation,
      { saveMode: "World", includeEntities: true }
    );

    const entities = this.dimension.getEntities({
      location: this.storageLocation,
      type: "file:folder"
    });
    entities.forEach(e => e.remove());
  }

  // --- QUEUE SYSTEM ---
  startSaveLoop() {
    system.runInterval(() => this.doSave(), 1);
  }

  doSave() {
    if (!this.queue.length) return;

    const batch = this.queue.splice(0, this.saveRate);
    batch.forEach(({ key, value, containers }) => {
      // tick 1 → write items
      system.runTimeout(() => {
        if (Array.isArray(value)) {
          containers.forEach((container, index) => {
            for (let i = 0; i < 256; i++) {
              const itemIndex = index * 256 + i;
              container.setItem(i, value[itemIndex] || undefined);
            }
          });
          world.setDynamicProperty(key, containers.length);
        } else {
          containers[0].setItem(0, value);
          world.setDynamicProperty(key, false);
        }

        // tick 2 → save structure & cleanup
        system.runTimeout(() => {
          this.saveStructure(key);
          console.log(`[ItemDB] Saved <${key}>`);
        }, 1);
      }, 1);
    });
  }

  // --- API ---
  set(key, value) {
    const fullKey = this.getKey(key);

    if (value === undefined) {
      this.delete(key);
      return;
    }

    const entityCount = Array.isArray(value) ? Math.ceil(value.length / 256) : 1;
    const containers = this.loadEntities(fullKey, entityCount);

    this.cache.set(fullKey, value);
    this.queue.push({ key: fullKey, value, containers });
    console.log(`[ItemDB] Queued <${fullKey}>`);
  }

  get(key) {
    const fullKey = this.getKey(key);

    if (this.cache.has(fullKey)) return this.cache.get(fullKey);
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
      while (items.length > 0 && items[items.length - 1] === undefined) items.pop();

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
    if (!this.has(key)) throw new Error(`Key not found: ${key}`);

    this.cache.delete(fullKey);
    world.setDynamicProperty(fullKey, null);

    try { world.structureManager.delete(fullKey); } catch {}
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
    this.keys().forEach(key => this.delete(key));
    this.cache.clear();
  }

  clearCache() {
    this.cache.clear();
  }

  entries() {
    return this.keys().map(key => [key, this.get(key)]);
  }

  forEach(callback) {
    this.keys().forEach(key => callback(this.get(key), key, this));
  }
}
