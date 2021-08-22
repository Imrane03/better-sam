const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const rollup = require('rollup');
const uglify = require('uglify-js');
const uglifyEs = require('uglify-es');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

let builds = require('./config').getAllBuilds();

// filter builds via command line arg
if (process.argv[2]) {
  const filters = process.argv[2].split(',');
  builds = builds.filter(b => {
    return filters.some(f => b.dest.indexOf(f) > -1)
  })
}

build(builds);

function build (builds) {
  let built = 0;
  const total = builds.length;
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++;
      if (built < total) {
        next()
      }
    }).catch(logError)
  };

  next()
}

function buildEntry (config) {
  const outConfig = config.output
  delete config.output
  const isProd = /min\.js$/.test(outConfig.file);
  const build = async () => {
    const bundle = await rollup.rollup(config)
    const {output} = await bundle.generate(outConfig)
    const code = output[0].code
    if (isProd) {
      let result = (/esm\.min$/.test(outConfig.file) ? uglify : uglifyEs).minify(code, {
        mangle: {
          // keep_classnames: true,
        },
        warnings: true,
        toplevel: true,
        output: {
          ascii_only: true
        },
        compress: {
          properties: true,
          dead_code: true,
          conditionals: true,
          reduce_vars: true,
          keep_fnames: true
        },
        sourceMap: {
          filename: path.basename(outConfig.file),
          url: path.basename(outConfig.file) + '.map'
        }
      });
      let minimized = (outConfig.banner ? outConfig.banner + '\n' : '') + result.code;
      if (result.error) console.error(result.error.message);
      if (result.warnings) console.warn(result.warnings);

      await Promise.all([
        write(outConfig.file, minimized, true),
        write(outConfig.file + '.map', result.map || '', true)
      ]);
    } else {
      await write(outConfig.file, code)
    }
  }
  return new Promise((resolve, reject) => {
    build().then(() => resolve()).catch(reason => reject(reason))
  })
}

function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''));
      resolve()
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err);
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err);
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}

function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
