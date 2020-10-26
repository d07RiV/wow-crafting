const fs = require('fs');

const profession = 'firstaid';

const items = JSON.parse(fs.readFileSync(`${profession}1.json`, {encoding: "utf-8"}));
const recipes = JSON.parse(fs.readFileSync(`${profession}2.json`, {encoding: "utf-8"}));
const vendor = JSON.parse(fs.readFileSync('vendor.json', {encoding: "utf-8"}));

const result = {};
recipes.forEach(recipe => {
  let name = recipe.name;
  const data = {};
  if (recipe.creates) {
    const item = items[recipe.creates[0]];
    if (!item) throw Error(`item not found: ${recipe.creates[0]} (in ${recipe.name})`);
    if (name !== item.name_enus) {
      console.error(`name mismatch: ${name} vs ${item.name_enus}`);
    } else {
      name = item.name_enus;
      data.id = recipe.creates[0];
      data.quality = item.quality;
      data.craftMin = recipe.creates[1];
      data.craftMax = recipe.creates[2];
    }
  }

  data.reagents = {};
  recipe.reagents.forEach(([id, count]) => {
    const item = items[id];
    if (!item) throw Error(`item not found: ${id} (in ${recipe.name})`);
    data.reagents[item.name_enus] = count;
    if (!result[item.name_enus]) {
      result[item.name_enus] = {id, quality: item.quality};
    }
  });

  result[name] = data;
});
Object.entries(result).forEach(([name, data]) => {
  if (vendor[name]) {
    data.vendor = vendor[name];
  }
})

fs.writeFileSync(`${profession}_out.json`, JSON.stringify(result, undefined, 2), {encoding: "utf-8"});
