const enabled = !!process.env.DEBUG;

function debug(msg) {
  if (enabled) console.debug(`[debug] ${msg}`);
}

module.exports = { debug };
