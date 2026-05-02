import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");

export const compareSync = bcrypt.compareSync;
export const compare = bcrypt.compare;
export const genSaltSync = bcrypt.genSaltSync;
export const hashSync = bcrypt.hashSync;
export const hash = bcrypt.hash;
export default bcrypt;
