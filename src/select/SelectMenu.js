import React from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import scrollIntoView from 'scroll-into-view-if-needed';

function chainedRef(...refs) {
  return value => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    }
  };
}

const optionId = opt => typeof opt === "object" ? opt.id : opt;

function SelectOption({ id, depth, value, disabled, selected, setValue, setFocus, renderOption, search }) {
  const onSelect = React.useCallback(() => setValue(value), [value, setValue]);
  const onFocus = React.useCallback(() => setFocus(id), [id, setFocus]);
  return (
    <li className={classNames(`ui-Select-option depth-${depth}`, {"option-selected": selected, "option-disabled": disabled})} onClick={disabled ? null : onSelect} onMouseOver={disabled ? null : onFocus}>
      {renderOption(value, search)}
    </li>
  );
}

function SelectGroup({ depth, title, renderHeader }) {
  return (
    <li className={`ui-Select-group depth-${depth}`}>
      {renderHeader(title)}
    </li>
  );
}

const makeRegex = (str, middle) => {
  const prefix = (middle && !str.match(/^\s/) ? "" : "\\b") + "(";
  const suffix = ")" + (str.match(/\w\s+$/) ? "\\b" : "");
  str = str.trim().replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  if (!str) return;
  return new RegExp(prefix + str + suffix, "i");
};

function prevValid(options, index) {
  while (--index >= 0) {
    if (options[index].value != null && !options[index].disabled) {
      return index;
    }
  }
  return -1;
}
function nextValid(options, index) {
  while (++index < options.length) {
    if (options[index].value != null && !options[index].disabled) {
      return index;
    }
  }
  return -1;
}

const SelectSearch = React.forwardRef(({value, onChange}, ref) => {
  const onInputChanged = React.useCallback(e => onChange(e.target.value), [onChange]);
  return (
    <div className="ui-Select-search">
      <input type="text" value={value} onChange={onInputChanged} ref={ref} spellCheck={false}/>
      <FontAwesomeIcon icon={faSearch} className={"search-icon"}/>
    </div>
  );
});

const RENDER_BLOCK = 10;

export default function SelectMenu(props) {
  const {
    options: getOptions,
    className,
    renderOption,
    isDisabled,
    renderHeader,
    value,
    setValue,
    searchMiddle,
    searchLimit,
    searchFunc,
    onClose,
    valueDiv,
    align,
    maxHeight,
    noResultsText,
    virtualScroll,
    menuRef
  } = props;

  const [searchTerm, setSearch] = React.useState("");
  const [firstBlock, setFirstBlock] = React.useState(0);

  const optionsRaw = React.useMemo(() => typeof getOptions === "function" ? getOptions() : getOptions, [getOptions]);

  const { options, enableSearch, search } = React.useMemo(() => {
    const countOptions = list => list.reduce((total, opt) => total + (opt.options ? countOptions(opt.options) : 1), 0);
    const enableSearch = searchLimit >= 0 && countOptions(optionsRaw) >= searchLimit;
    const search = (searchTerm && enableSearch ? makeRegex(searchTerm, searchMiddle) : null);
    const flattenOptions = (list, groups = []) => {
      const result = [];
      list.forEach(opt => {
        if (opt.options) {
          const ngroups = [...groups, opt.title];
          const sub = flattenOptions(opt.options, ngroups);
          if (sub.length) {
            result.push({id: ngroups.join("."), depth: groups.length, title: opt.title}, ...sub);
          }
        } else if (!search || searchFunc(opt, search)) {
          result.push({id: optionId(opt), depth: groups.length, disabled: isDisabled(opt), value: opt});
        }
      });
      return result;
    };
    return { options: flattenOptions(optionsRaw), enableSearch, search };
  }, [optionsRaw, searchLimit, searchTerm, searchMiddle, searchFunc, isDisabled]);

  const [focusedId, setFocus] = React.useState(value != null ? optionId(value) : null);
  const focusedIndex = React.useMemo(() => {
    const idx = options.findIndex(opt => opt.id === focusedId && !opt.disabled);
    return idx >= 0 ? idx : options.findIndex(opt => opt.value != null && !opt.disabled);
  }, [focusedId, options]);

  const ref = React.useRef();
  const scrollRef = React.useRef();
  const searchRef = React.useRef();
  const scrolledIndexRef = React.useRef(-1);

  const lineHeight = React.useRef(18);
  React.useEffect(() => {
    const line = scrollRef.current.querySelector("li");
    if (line) {
      lineHeight.current = line.offsetHeight;
    }
  }, [options]);

  const onScroll = React.useCallback(() => {
    setFirstBlock(Math.max(Math.floor(scrollRef.current.scrollTop / lineHeight.current / RENDER_BLOCK) - 1, 0));
  }, []);

  React.useLayoutEffect(() => {
    if (!scrollRef.current) return;
    if (virtualScroll && scrolledIndexRef.current === focusedIndex) {
      // little hack to prevent scroll being stuck when using virtual scroll
      // this ensures we only scroll to selected element once
      return;
    }
    const node = scrollRef.current.querySelector("li.option-selected");
    if (node) {
      const mode = scrolledIndexRef.current < 0 ? "center" : "nearest";
      scrollIntoView(node, {scrollMode: "if-needed", block: mode, inline: mode, boundary: scrollRef.current});
      scrolledIndexRef.current = focusedIndex;
      onScroll();
    } else {
      setFirstBlock(Math.max(Math.floor(focusedIndex / RENDER_BLOCK), 0));
    }
  }, [focusedIndex, virtualScroll, firstBlock, onScroll]);

  React.useEffect(() => {
    if (align.includes("ui-drop-test")) return;
    if (searchRef.current) {
      searchRef.current.focus();
    } else if (ref.current) {
      ref.current.focus();
    }
  }, [align]);

  const onBlur = React.useCallback(e => {
    if (!e.relatedTarget || !(valueDiv.current.contains(e.relatedTarget) || ref.current.contains(e.relatedTarget))) {
      onClose();
    }
  }, [valueDiv, onClose]);

  const onKeyDown = React.useCallback(e => {
    switch (e.key) {
    case "Up":
    case "ArrowUp":
      if (focusedIndex >= 0) {
        const prev = prevValid(options, focusedIndex);
        if (prev >= 0) {
          setFocus(options[prev].id);
        }
      }
      break;
    case "Down":
    case "ArrowDown":
      if (focusedIndex >= 0) {
        const next = nextValid(options, focusedIndex);
        if (next >= 0) {
          setFocus(options[next].id);
        }
      }
      break;
    case "Esc":
    case "Escape":
      onClose();
      valueDiv.current.focus();
      break;
    case "Enter":
      if (focusedIndex >= 0) {
        setValue(options[focusedIndex].value);
      }
      break;
      // no default
    }
  }, [focusedIndex, options, onClose, setValue, valueDiv]);

  let visibleOptions = options;
  let renderFirst = 0, renderLast = options.length;
  if (virtualScroll) {
    renderFirst = firstBlock * RENDER_BLOCK;
    renderLast = Math.min(renderFirst + (Math.ceil(maxHeight / lineHeight.current / RENDER_BLOCK) + 4) * RENDER_BLOCK, options.length);
    visibleOptions = options.slice(renderFirst, renderLast);
  }

  const mergedRef = React.useMemo(() => chainedRef(ref, menuRef), [menuRef]);

  return (
    <div ref={mergedRef} className={classNames("ui-Select-menu", align, className)} tabIndex="-1" onBlur={onBlur} onKeyDown={onKeyDown} style={{maxHeight}}>
      {!!enableSearch && <SelectSearch value={searchTerm} onChange={setSearch} ref={searchRef}/>}
      <div ref={scrollRef} className="ui-menu-scroll" onScroll={virtualScroll ? onScroll : null}>
        {options.length ? (
          <ul style={{marginTop: renderFirst * lineHeight.current, marginBottom: (options.length - renderLast) * lineHeight.current}}>
            {visibleOptions.map((opt, idx) => (opt.value != null
              ? <SelectOption key={opt.id} selected={focusedIndex === idx + renderFirst} {...opt} setValue={setValue} setFocus={setFocus} renderOption={renderOption} search={search}/>
              : <SelectGroup key={opt.id} depth={opt.depth} title={opt.title} renderHeader={renderHeader}/>
            ))}
          </ul>
        ) : <div className="no-results">{noResultsText(searchTerm)}</div>}
      </div>
    </div>
  );
}
