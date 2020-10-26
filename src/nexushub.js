export const serverList = fetch('https://api.nexushub.co/wow-classic/v1/servers/full/').then(r => r.json());

const dataCache = {};

function merge(a, h) {
  if (a && h) {
    return {quantity: a.quantity + h.quantity, marketValue: Math.min(a.marketValue, h.marketValue), faction: a.marketValue < h.marketValue ? "alliance" : "horde"};
  } else if (a) {
    return {...a, faction: "alliance"};
  } else if (h) {
    return {...h, faction: "horde"};
  }
}

export function loadData(server, faction) {
  const slug = `${server}-${faction}`;
  if (dataCache[slug]) return dataCache[slug];
  if (faction === "both") {
    return dataCache[slug] = Promise.all([loadData(server, "alliance"), loadData(server, "horde")]).then(([alliance, horde]) => {
      const keys = new Set([...Object.keys(alliance), ...Object.keys(horde)]);
      return Object.fromEntries([...keys].map(key => [key, merge(alliance[key], horde[key])]));
    });
  } else {
    return dataCache[slug] = fetch(`https://api.nexushub.co/wow-classic/v1/items/${slug}/`)
      .then(r => r.json())
      .then(r => Object.fromEntries(r.data.map(({itemId, quantity, marketValue}) => [itemId, {quantity, marketValue}])));
  }
}
