import { Player } from "@minecraft/server";
import { ChestFormData } from "../ui/base";
import { ActionFormResponse } from "@minecraft/server-ui";

declare type MenuItemTuple = [
  itemName: string,
  itemDesc: string[],
  texture: string,
  stackAmount?: number,
  durability?: number,
  enchanted?: boolean
];

declare interface MenuFormShape {
  name?: string;
  shape: string[];
  keys: Record<string, MenuItemTuple>;
}

declare class MenuRegister {
  static menus: Map<
    string,
    {
      form: ChestFormData;
      cb: (response: ActionFormResponse) => void;
    }
  >;


  static register(
    id: string,
    size: ConstructorParameters<typeof ChestFormData>[0],
    form: MenuFormShape,
    callback: (response: ActionFormResponse) => void
  ): void;

  static show(id: string, player: Player): Promise<ActionFormResponse>;
}
export {MenuRegister, MenuItemTuple, MenuFormShape}