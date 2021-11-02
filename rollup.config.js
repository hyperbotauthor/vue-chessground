import vue from 'rollup-plugin-vue';
import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import resolve from 'rollup-plugin-node-resolve';
import css from 'rollup-plugin-css-only';
import minimist from 'minimist';
import pkg from './package.json';

const argv = minimist(process.argv.slice(2));

const baseConfig = {
  input: 'src/index.js',  
  external: [
    "@publishvue/fetchclient",
    "@publishvue/chessops",
    "@publishvue/vuecomps",
    "chessground",
  ],  
  plugins: {
    preVue: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      commonjs(),
    ],
    vue: {
      css: true,
      template: {
        isProduction: true,
      },
    },
    postVue: [
      buble({
        transforms: {
          dangerousForOf: true,
        },
        objectAssign: 'Object.assign',
      }),
    ],
  },
};

// Customize configs for individual targets
const buildFormats = [];
if (!argv.format || argv.format === 'es') {
  const esConfig = {
    ...baseConfig,
    output: {
      file: pkg.module,
      format: 'esm',
      exports: 'named',
      sourcemap: true,
    },
    plugins: [
      ...baseConfig.plugins.preVue,
      css({
        output: pkg.style,
      }),
      vue({
        ...baseConfig.plugins.vue,
        css: false,
      }),
      ...baseConfig.plugins.postVue,
      terser({
        output: {
          ecma: 6,
        },
      }),
      resolve(),
    ],
  };
  buildFormats.push(esConfig);
}

if (!argv.format || argv.format === 'cjs') {
  const umdConfig = {
    ...baseConfig,
    output: {
      compact: true,
      file: pkg.cjs,
      format: 'cjs',
      name: 'Vuechessground',
      exports: 'named',
      sourcemap: true,      
    },
    plugins: [
      ...baseConfig.plugins.preVue,
      css({
        output: pkg.style,
      }),
      vue({
        ...baseConfig.plugins.vue,
        template: {
          ...baseConfig.plugins.vue.template,
          optimizeSSR: true,
        },
        css: false,
      }),
      ...baseConfig.plugins.postVue,
      resolve(),
    ],
  };
  buildFormats.push(umdConfig);
}

if (!argv.format || argv.format === 'iife') {
  const unpkgConfig = {
    ...baseConfig,
    output: {
      compact: true,
      file: pkg.unpkg,
      format: 'iife',
      name: 'Vuechessground',
      exports: 'named',
      sourcemap: true,
      globals: {
        "@publishvue/chessops": "chessops",
        "@publishvue/fetchclient": "fetchclient",
        "@publishvue/vuecomps": "vuecomps",
        "chessground": "chessground",
      }
    },
    plugins: [
      ...baseConfig.plugins.preVue,
      vue(baseConfig.plugins.vue),
      ...baseConfig.plugins.postVue,
      terser({
        output: {
          ecma: 5,
        },
      }),
      resolve(),
    ],
  };
  buildFormats.push(unpkgConfig);
}

// Export config
export default buildFormats;