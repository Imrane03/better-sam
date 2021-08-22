const path = require('path');
const buble = require('@rollup/plugin-buble');
const replace = require('@rollup/plugin-replace');
const flow = require('rollup-plugin-flow-no-whitespace');
const version = process.env.VERSION || require('../package.json').version;

const banner =
  '/**\n' +
  ' * This is SamJs.js v' + version + '\n' +
  ' *\n' +
  ' * A Javascript port of "SAM Software Automatic Mouth".\n' +
  ' *\n' +
  ' * (c) 2017-' + new Date().getFullYear() + ' Christian Schiffler\n' +
  ' *\n' +
  ' * @link(https://github.com/discordier/sam)\n' +
  ' *\n' +
  ' * @author 2017 Christian Schiffler <c.schiffler@cyberspectrum.de>\n' +
  ' */';

const resolve = p => {
  return path.resolve(__dirname, '../', p)
};

const buildSrc = [
  {
    name: '',
    entry: 'src/index.es6',
    dest: 'samjs',
    moduleName: 'SamJs',
  },
  {
    name: 'guessnum-demo',
    entry: 'src/guessnum.es6',
    dest: 'guessnum',
    moduleName: 'GuessNum',
  },
]

const builds = {}

buildSrc.map((file) => {
  [
    // Browser build
    {
      name: '',
      suffix: '',
      format: 'umd',
    },
    // CommonJS. Used by bundlers e.g. Webpack & Browserify
    {
      name: 'cjs',
      suffix: '.common',
      format: 'cjs',
    },
    // ES Modules. Used by bundlers that support ES Modules, e.g. Rollup & Webpack 2
    {
      name: 'esm',
      suffix: '.esm',
      format: 'es',
    },
  ].map((build) => {
    const name = (build.name ? '-' + build.name : '') + (file.name ? '-' + file.name : '')
    builds['dev' + name] = {
      entry: resolve(file.entry),
      dest: resolve(`dist/${file.dest}${build.suffix}.js`),
      moduleName: file.moduleName,
      format: build.format,
      env: 'development',
      banner
    }
    builds['prod' + name] = {
      entry: resolve(file.entry),
      dest: resolve(`dist/${file.dest}${build.suffix}.min.js`),
      moduleName: file.moduleName,
      format: build.format,
      env: 'production',
      banner
    }
  })
})

function genConfig (opts) {
  let moduleName = opts.moduleName;
  const config = {
    input: opts.entry,
    output: {
      file: opts.dest,
      format: opts.format,
      name: moduleName,
      banner: opts.banner,
    },
    external: opts.external,
    plugins: [
      replace({
        __VERSION__: version
      }),
      flow(),
      buble()
    ].concat(opts.plugins || [])
  };

  if (opts.env) {
    config.plugins.push(replace({
      'process.env.NODE_ENV': JSON.stringify(opts.env),
      'process.env.DEBUG_SAM': JSON.stringify(opts.env === 'development'),
    }))
  }

  return config
}

if (process.env.TARGET) {
  module.exports = genConfig(builds[process.env.TARGET])
} else {
  exports.getBuild = name => genConfig(builds[name]);
  exports.getAllBuilds = () => Object.keys(builds).map(name => genConfig(builds[name]))
}
