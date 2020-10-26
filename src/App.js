import React from 'react';
import './App.scss';

import Select from 'react-select';
import AsyncSelect from 'react-select/async';

import { serverList } from './nexushub';

import Data from './data';
import calculate from './logic';

function usePersistentState(key, initialValue) {
  const [value, setValue] = React.useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item != null ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }, [key, value]);
  return [value, setValue];
}

const serverOptions = serverList.then(servers => {
  const regions = {};
  servers.forEach(({slug, name, region}) => {
    if (!regions[region]) regions[region] = [];
    regions[region].push({value: slug, label: name});
  });
  return Object.entries(regions).map(([region, list]) => {
    list.sort(({label: name1}, {label: name2}) => name1.localeCompare(name2));
    return {label: region, options: list};
  });
});

const factionOptions = [
  {value: "alliance", label: "Alliance"},
  {value: "horde", label: "Horde"},
  {value: "both", label: "Both"},
];

const profNames = {alchemy: "Alchemy", blacksmithing: "Blacksmithing", cooking: "Cooking", enchanting: "Enchanting", engineering: "Engineering", firstaid: "First Aid", leatherworking: "Leatherworking", tailoring: "Tailoring"};
const categoryNames = {...profNames, quest: "Quests", tierset: "Tier Sets", "": "Misc"};

const itemOptions = (term, callback) => {
  if (term.length < 3) callback([]);
  term = term.toLowerCase();
  const categories = {};
  Object.entries(Data).filter(([name, data]) => data.reagents && name.toLowerCase().includes(term)).forEach(([name, data]) => {
    categories[data.category || ""] = (categories[data.category || ""] || []);
    categories[data.category || ""].push({value: name, label: name});
  });
  callback(Object.entries(categories).map(([cat, list]) => ({label: categoryNames[cat], options: list})));
}

function Money({value}) {
  if (!isFinite(value)) {
    return "Not available";
  }
  if (!value) {
    return "0";
  }
  const gold = Math.floor(value / 10000);
  const silver = Math.floor(value / 100) % 100;
  const copper = Math.floor(value) % 100;
  return (
    <span>
      {gold !== 0 && <span className="money-gold">{gold}</span>}{gold !== 0 && (silver + copper) !== 0 && " "}
      {silver !== 0 && <span className="money-silver">{silver}</span>}{silver !== 0 && copper !== 0 && " "}
      {copper !== 0 && <span className="money-copper">{copper}</span>}
    </span>
  );
}

function itemDefault(results, item) {
  const data = results[item];
  if (!data) {
    debugger;
  }
  if (!isNaN(data.craftingPrice) && (!data.marketValue || data.craftingPrice < data.marketValue)) {
    return "crafting";
  } else {
    return "market";
  }
}

function itemPrice(results, item, overrides) {
  const data = results[item];
  if (data.vendorPrice) {
    return data.vendorPrice;
  }
  const mode = overrides[item] || itemDefault(results, item);
  if (mode === "crafting" && data.crafting) {
    return craftingPrice(results, item, overrides) / data.amountCrafted;
  } else if (data.bindOnPickup) {
    return 0;
  } else {
    return data.marketValue || Infinity;
  }
}

function craftingPrice(results, item, overrides) {
  return Object.entries(results[item].crafting).reduce((total, [name, quantity]) => total + itemPrice(results, name, overrides) * quantity, results[item].requiredMoney);
}

function profLabel(data) {
  if (profNames[data.category]) {
    if (data.amountCrafted !== 1) {
      return <span><span className={"trade-icon trade-" + data.category}/>{profNames[data.category]} (per {data.amountCrafted}): </span>;
    } else {
      return <span><span className={"trade-icon trade-" + data.category}/>{profNames[data.category]}: </span>;
    }
  } else {
    return "";
  }
}

function shoppingList(list, results, item, count, overrides) {
  const mode = overrides[item] || itemDefault(results, item);
  const data = results[item];
  if (data.vendorPrice || !data.crafting || mode !== "crafting") {
    list[item] = (list[item] || 0) + count;
  } else {
    const numCraft = Math.ceil(count / data.craftMin);
    Object.entries(data.crafting).forEach(([name, quantity]) => shoppingList(list, results, name, quantity * numCraft, overrides));
    if (data.requiredMoney) {
      list.money = (list.money || 0) + data.requiredMoney;
    }
  }
  return list;
}

function ItemLink({name, data}) {
  if (data.id) {
    return <a className={"quality-" + data.quality} href={`https://classic.wowhead.com/item=${data.id}`} target="_blank" rel="noreferrer">{name}</a>;
  } else {
    return <span className={"quality-" + data.quality}>{name}</span>;
  }
}

function ResultView({item, count, ...props}) {
  const {results, overrides, setOverrides, setShopping} = props;
  const setMarket = React.useCallback(() => setOverrides(ov => ({...ov, [item]: "market"})), [setOverrides, item]);
  const setCrafting = React.useCallback(() => setOverrides(ov => ({...ov, [item]: "crafting"})), [setOverrides, item]);

  const addShopping = React.useCallback(() => setShopping(s => ({...s, [item]: (s[item] || 0) + 1})), [setShopping, item]);

  const data = results[item];
  if (!data) return null;

  let price = null;
  const mode = overrides[item] || itemDefault(results, item);

  if (data.vendorPrice) {
    price = <React.Fragment>Vendor: <Money value={data.vendorPrice}/></React.Fragment>;
  } else if (!data.marketValue && !data.crafting) {
    price = data.bindOnPickup ? "Bind on Pickup" : "Not available";
  } else if (data.marketValue || data.craftingPrice != null) {
    const cprice = data.crafting ? craftingPrice(results, item, overrides) : 0;
    if (data.marketValue || cprice) {
      price = (
        <React.Fragment>
          {!!data.marketValue && <span onClick={setMarket} className={mode === "market" ? "active" : "inactive"}>Market{data.faction ? ` (${data.faction})` : ""}: <Money value={data.marketValue}/> (quantity: {data.quantity})</span>}
          {!!(data.marketValue && data.crafting) && " / "}
          {cprice > 0 && <span onClick={setCrafting} className={mode === "crafting" ? "active" : "inactive"}>{profLabel(data)}<Money value={cprice}/></span>}
        </React.Fragment>
      );
    }
  }
  return (
    <div className="item">
      <div className="header">{!!count && <span className="count">{count}x</span>}<ItemLink name={item} data={data}/>{!!price && " "}{!!price && <span className="add-list" onClick={addShopping}>(add)</span>}{!!price && " - "}{price}</div>
      {!!(!data.vendorPrice && mode === "crafting" && data.crafting) && (
        <div className="crafting">
          {Object.entries(data.crafting).map(([name, quantity]) => <ResultView key={name} item={name} count={quantity} {...props}/>)}
          {!!data.requiredMoney && (
            <div className="item">
              <div className="header">Required Money: <Money value={data.requiredMoney}/></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingItem({results, item, count, setShopping}) {
  const onChange = React.useCallback(e => setShopping(list => {
    list = {...list};
    const value = parseInt(e.target.value);
    if (value && !isNaN(value)) {
      list[item] = value;
    } else {
      delete list[item];
    }
    return list;
  }), [item, setShopping]);

  return <li><input type="number" className="task-counter" value={count} onChange={onChange}/> <ItemLink name={item} data={results[item]}/></li>;
}

function ShoppingList({results, overrides, shopping, setShopping}) {
  const [list, total] = React.useMemo(() => {
    const list = Object.entries(Object.entries(shopping).reduce((list, [item, count]) => shoppingList(list, results, item, count, overrides), {}))
      .filter(([name, count]) => count > 0)
      .map(([name, count]) => {
        if (name === "money") {
          return [name, count, count, 4];
        } else {
          const data = results[name];
          if (data.vendorPrice) {
            return [name, count, data.vendorPrice * count, 3];
          } else if (data.bindOnPickup) {
            return [name, count, 0, 0];
          } else if (!data.marketValue) {
            return [name, count, Infinity, 1];
          } else {
            return [name, count, data.marketValue * count, 2];
          }
        }
      });
    const total = list.reduce((cur, [n, c, p, s]) => cur + p, 0);
    list.sort(([n1, c1, p1, s1], [n2, c2, p2, s2]) => (s1 === s2 ? p2 - p1 : s1 - s2));
    return [list, total];
  }, [results, overrides, shopping]);
  const clearList = React.useCallback(() => setShopping({}), [setShopping]);
  if (!Object.keys(shopping).length) {
    return null;
  }
  return (
    <div className="shopping-list">
      <div className="header">Shopping for <span className="add-list" onClick={clearList}>(clear)</span></div>
      <ul>
        {Object.entries(shopping).map(([item, count]) => <ShoppingItem key={item} results={results} item={item} count={shopping[item]} setShopping={setShopping}/>)}
      </ul>
      <div className="header">Items to buy - <Money value={total}/></div>
      <ul>
        {list.map(([name, count]) => {
          if (name === "money") {
            return <li>Money: <Money value={count}/></li>
          }
          const data = results[name];
          let price = null;
          if (data.vendorPrice) {
            price = <span>Vendor: <Money value={data.vendorPrice * count}/></span>;
          } else if (!data.marketValue) {
            price = data.bindOnPickup ? "Bind on Pickup" : "Not available";
          } else {
            price = <span>Market{data.faction ? ` (${data.faction})` : ""}: <Money value={data.marketValue * count}/></span>;
          }
          return <li><span className="count">{count}x</span><ItemLink name={name} data={results[name]}/> - {price}</li>;
        })}
      </ul>
    </div>
  );
}

export default function App() {
  const [serverList, setServerList] = React.useState([]);
  React.useEffect(() => {
    serverOptions.then(opt => setServerList(opt));
  }, []);

  const [server, setServer] = usePersistentState("wowcrafting-server");
  const [faction, setFaction] = usePersistentState("wowcrafting-faction", factionOptions[0]);
  const [item, setItem] = React.useState();
  const [results, setResults] = React.useState();
  const [overrides, setOverrides] = React.useState({});
  const [shopping, setShopping] = React.useState({});

  const onServerChange = React.useCallback(v => {
    setResults(null);
    setOverrides({});
    setServer(v);
  }, [setServer]);
  const onFactionChange = React.useCallback(v => {
    setResults(null);
    setOverrides({});
    setFaction(v);
  }, [setFaction]);
  const onItemChange = React.useCallback(v => {
    setItem(v);
  }, []);

  const toCalc = React.useRef();
  React.useEffect(() => {
    if (!server || !faction) return;
    const slug = `${server.value}-${faction.value}`;
    toCalc.current = slug;
    setResults(true);
    calculate(server.value, faction.value).then(data => {
      if (toCalc.current === slug) {
        setResults(data);
      }
    });
  }, [server, faction]);

  return (
    <div className="App">
      <div className="config">
        <Select className="select-server" value={server} onChange={onServerChange} options={serverList} placeholder="Select server..."/>
        <Select className="select-faction" value={faction} onChange={onFactionChange} options={factionOptions}/>
        {!!(server && faction) && <AsyncSelect className="select-item" value={item} onChange={onItemChange} loadOptions={itemOptions} noOptionsMessage={() => null} placeholder="Select item..."/>}
      </div>
      {!!(results && item) && (
        <div className="Results">
          {results === true ? (
            <div className="calculating">Calculating...</div>
          ) : (
            <div className="results-main">
              <ResultView results={results} item={item.value} overrides={overrides} setOverrides={setOverrides} shopping={shopping} setShopping={setShopping}/>
            </div>
          )}
          {results !== true && <ShoppingList results={results} overrides={overrides} shopping={shopping} setShopping={setShopping}/>}
        </div>
      )}
    </div>
  );
}
