export interface ManaAPI {
    get(): number;
    set(val?: number): void;
    add(val: number): void;
    remove(val: number): void;
    has(val?: number): boolean;
    getMax(): number;
    setMax(val?: number): void;
    addMax(val: number): void;
    removeMax(val: number): void;
    getRegen(): number;
    setRegen(val?: number): void;
    addRegen(val: number): void;
    removeRegen(val: number): void;
    regen(): void;
    init(max?: number, regen?: number): void;
}
export interface ItemManaCostAPI {
    get(): number;
    set(val?: number): void;
    add(val: number): void;
    remove(val: number): void;
    has(val: number): boolean;
}