import { ChestFormData, AccessibleCraftingTableFormData } from "../ui/base";

export class MenuRegister {
  static menus = new Map();

  /**
   * @param {string} id
   * @param {'small' | 'single' | 'large' | 'double' | '5' | '9' | '18' | '27' | '36' | '45' | '54'} size
   * @param {{ name?: string, shape: string[], keys: Record<string, any[]> }} form
   * @param {(response: any) => void} callback
   */
  static register(id, size, form, callback) {
    const FORM = ["0", 0, "crafting", "craft"].includes(size)? new AccessibleCraftingTableFormData(): new ChestFormData(size);
    FORM.title(form.name ?? id);

    const key = {};
    for (const char in form.keys) {
      const [
        itemName,
        itemDesc,
        texture,
        stackAmount = 1,
        durability = 0,
        enchanted = false
      ] = form.keys[char];

      key[char] = {
        itemName,
        itemDesc,
        texture,
        stackAmount,
        durability,
        enchanted
      };
    }

    FORM.pattern(form.shape, key);
    MenuRegister.menus.set(id, { form: FORM, cb: callback });
  }

  static show(id, player) {
    const { form, cb } = MenuRegister.menus.get(id);
    return form.show(player).then(r => cb(r,player));
  }
}