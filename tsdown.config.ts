import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/node.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  platform: 'neutral',
  target: 'es2022',
  deps: {
    neverBundle: [
      /^node:/,
      'linkedom',
      'x-client-transaction-id',
      'undici',
    ],
  },
  // exports 由 package.json 手工维护，构建过程不得改写它。
  exports: false,
})
