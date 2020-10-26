const fs = require('fs');

const names = ['alchemy', 'blacksmithing', 'cooking', 'enchanting', 'engineering', 'firstaid', 'leatherworking', 'tailoring'];

const results = {};
names.forEach(prof => {
  const data = JSON.parse(fs.readFileSync(`${prof}_out.json`, {encoding: "utf-8"}));
  Object.entries(data).forEach(([name, info]) => {
    if (info.craftMin === 1 && info.craftMax === 1) {
      delete info.craftMin;
      delete info.craftMax;
    }
    if (info.reagents) {
      info.category = prof;
    }
    results[name] = Object.assign(results[name] || {}, info);
  });
});

fs.writeFileSync('crafting.json', JSON.stringify(results), {encoding: "utf-8"});
