import { manaReq } from "../itemsRegister";
for (let key in manaReq) import(`./${key.toLowerCase()}.js`);