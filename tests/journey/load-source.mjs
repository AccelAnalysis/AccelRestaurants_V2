import ts from '../../node_modules/typescript/lib/typescript.js';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nativeRequire = createRequire(path.join(root, 'package.json'));
/** Execute the actual TypeScript service; replace only specified SDK/transport boundaries. */
export function sourceLoader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (filename in overrides) return overrides[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const require = name => {
      if (name in overrides) return overrides[name];
      if (!name.startsWith('.')) return nativeRequire(name);
      const target = path.resolve(path.dirname(filename), name);
      return load(existsSync(target) ? target : target + '.ts');
    };
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    return module.exports;
  }
  return load;
}
export function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), clear: () => data.clear(), data };
}
export { root };
