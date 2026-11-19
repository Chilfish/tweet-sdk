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
    // citty is used only by the CLI and has zero runtime dependencies: inlining it into
    // the output means it does not have to be installed as a dependency, so
    // `bunx @chilfish/tweet` / `npx @chilfish/tweet` also work out of the box.
    alwaysBundle: [
      'citty',
    ],
  },
  // exports is maintained by hand in package.json; the build must never rewrite it.
  exports: false,
})
