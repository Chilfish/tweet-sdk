import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  platform: 'neutral',
  target: 'es2022',
  deps: {
    neverBundle: [/^node:/],
  },
  // exports 由 package.json 手工维护，构建过程不得改写它。
  exports: false,
})
