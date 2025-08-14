module.exports = function (api) {
  api.cache(true)
  const isTestEnv = process.env.NODE_ENV === 'test'
    const enableReactCompiler = process.env.REACT_COMPILER === '1'
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          lazyImports: true,
          native: {
            // Disable ESM -> CJS compilation because Metro takes care of it.
            // However, we need it in Jest tests since those run without Metro.
            disableImportExportTransform: !isTestEnv,
          },
        },
      ],
    ],
    plugins: [
      'macros',
      [
        'module:react-native-dotenv',
        {
          envName: 'APP_ENV',
          moduleName: '@env',
          path: '.env',
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: true,
          verbose: false,
        },
      ],
      [
        'module-resolver',
        {
          alias: {
            // This needs to be mirrored in tsconfig.json
            '#': './src',
            crypto: './src/platform/crypto.ts',
            // Shimmed atproto modules for Sonet migration (regex aliases catch deep imports)
            '^@atproto/api$': './src/shims/atproto-runtime.ts',
            '^@atproto/api/dist/.*$': './src/shims/atproto-api-dist.ts',
            '^@atproto/common-web$': './src/shims/atproto-common-web.ts',
            '^@atproto/lexicon$': './src/shims/atproto-lexicon.ts',
            // Fix typos introduced in migration
            'react-native-gesture-usernamer': './src/shims/react-native-gesture-usernamer',
            'react-native-keyboard-controller': './src/shims/react-native-keyboard-controller',
            'react-native-draggable-flatlist': './src/shims/react-native-draggable-flatlist',
          },
        },
      ],
      'react-native-reanimated/plugin', // NOTE: this plugin MUST be last
    ],
    // Only run React Compiler on our application source to avoid issues with some libraries
    overrides: [
      {
        test: ['./src/**/*.{js,jsx,ts,tsx}'],
    plugins: enableReactCompiler ? [['babel-plugin-react-compiler', {target: '19'}]] : [],
      },
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  }
}
