
function debugLog () {
  console.log.apply(console, arguments)
}

function debugError () {
  console.error.apply(console, arguments)
}

function debugWarn () {
  console.warn.apply(console, arguments)
}

const makeDebug = (debug) => {
  if (debug) {
    return {
      log: debugLog,
      error: debugError,
      warn: debugWarn
    };
  }
  return {
    log:  () => {},
    warn: () => {alert(arguments.join(', '))},
    error: () => {alert(arguments.join(', '))}
  };
};

export default makeDebug;
