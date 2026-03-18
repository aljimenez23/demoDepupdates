const fetch = require('node-fetch');
const minimist = require('minimist');

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function parseArgs(argv) {
  return minimist(argv.slice(2));
}

module.exports = { fetchJSON, parseArgs };
