import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const impl = require("./saveValidator.js") as {
  validSave: (save: unknown) => boolean;
};

/** 与 cloudfunctions/shared/saveValidator.js 同一份实现。 */
export function validSave(save: unknown): boolean {
  return impl.validSave(save);
}
