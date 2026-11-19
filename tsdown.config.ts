import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/node.ts',
    'src/cli.ts',
    'src/cli-bin.ts',
  ],
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
    // citty 只被 CLI 使用且零运行时依赖：内联进产物后不必作为依赖安装，
    // `bunx @chilfish/tweet` / `npx @chilfish/tweet` 也能直接跑。
    alwaysBundle: [
      'citty',
    ],
  },
  // exports 由 package.json 手工维护，构建过程不得改写它。
  exports: false,
})
