const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'levels.json');

function load() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
