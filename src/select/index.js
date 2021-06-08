import React from 'react';
import classNames from 'classnames';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons'

import './Select.scss';

import SelectMenu from './SelectMenu';

const optionName = opt => typeof opt === "object" ? opt.name : opt;

export const underlinerFunc = (value, regex) => {
  let found = false;
  return value.split(regex).map((str, index) => {
    if (!found && str.match(regex)) {
      found = true;
      return <em key={index}>{str}</em>;
    } else {
      return str;
    }
  });
};

const defaultCallbacks = {
  renderOption: (opt, search) => <span>{search ? underlinerFunc(optionName(opt), search) : optionName(opt)}</span>,
  renderValue: opt => <span>{optionName(opt)}</span>,
  renderHeader: name => <span>{name}</span>,
  searchFunc: (opt, search) => optionName(opt).match(search),
  placeholder: "Select option...",
  noResultsText: term => term ? `No results match "${term}"` : "No results",
  isDisabled: opt => (typeof opt === "object" ? !!opt.disabled : false),
};

const Select = React.memo(React.forwardRef(function Select(props, ref) {
  const {
    options,
    width,
    renderOption = defaultCallbacks.renderOption,
    renderValue = defaultCallbacks.renderValue,
    isDisabled = defaultCallbacks.isDisabled,
    renderHeader = defaultCallbacks.renderHeader,
    placeholder = defaultCallbacks.placeholder,
    value,
    onChange,
    className,
    menuClass,
    searchLimit = -1,
    searchMiddle = false,
    searchFunc = defaultCallbacks.searchFunc,
    tabIndex = "-1",
    maxHeight = 300,
    noResultsText = defaultCallbacks.noResultsText,
    virtualScroll = false,
    allowEmpty = false,
    disabled = false,
    ...otherProps
  } = props;

  const [isOpen, setOpen] = React.useState(null);
  const onToggle = React.useCallback(() => setOpen(open => {
    if (open || disabled) {
      return null;
    } else {
      return "ui-drop-bottom ui-drop-test";
    }
  }), [disabled]);
  const onClose = React.useCallback(() => setOpen(null), []);
  const valueRef = React.useRef();

  const menuRef = React.useRef();
  React.useLayoutEffect(() => {
    if (isOpen && isOpen.includes("ui-drop-test") && menuRef.current) {
      let overflowParent = valueRef.current.parentNode;
      let parentStyle = window.getComputedStyle(overflowParent);
      while (overflowParent !== document.documentElement && parentStyle.overflow === "visible") {
        overflowParent = overflowParent.parentElement;
        parentStyle = window.getComputedStyle(overflowParent);
      }
      const parentBox = overflowParent.getBoundingClientRect();
      const parentTop = parentBox.top + (parseFloat(parentStyle.paddingTop) || 0) + (parseFloat(parentStyle.borderTopWidth) || 0);
      const parentBottom = parentBox.bottom - (parseFloat(parentStyle.paddingBottom) || 0) - (parseFloat(parentStyle.borderBottomWidth) || 0);
      const valueBox = valueRef.current.getBoundingClientRect();
      const height = menuRef.current.offsetHeight;
      if (valueBox.bottom + height > parentBottom && valueBox.bottom - height - parentBottom > parentTop - valueBox.top - height) {
        setOpen("ui-drop-top");
      } else {
        setOpen("ui-drop-bottom");
      }
    }
  }, [isOpen]);

  React.useImperativeHandle(ref, () => ({
    focus() {
      if (!isOpen) {
        onToggle();
      }
    }
  }), [isOpen, onToggle]);

  const onSetValue = React.useCallback(value => {
    setOpen(false);
    onChange(value);
    valueRef.current.focus();
  }, [onChange]);

  const onClear = React.useCallback(e => {
    onSetValue(null);
    e.stopPropagation();
  }, [onSetValue]);

  const onKeyDown = React.useCallback(e => {
    if (disabled) return;
    switch (e.key) {
    case "Enter":
      onToggle();
      break;
    case "Del":
    case "Delete":
      if (allowEmpty && value != null) {
        onSetValue(null);
      }
      break;
    // no default
    }
  }, [onToggle, onSetValue, allowEmpty, value, disabled]);

  let menu = null;
  if (isOpen) {
    menu = <SelectMenu
      options={options}
      className={menuClass}
      renderOption={renderOption}
      isDisabled={isDisabled}
      renderHeader={renderHeader}
      value={value}
      setValue={onSetValue}
      searchLimit={searchLimit}
      searchMiddle={searchMiddle}
      searchFunc={searchFunc}
      onClose={onClose}
      valueDiv={valueRef}
      align={isOpen}
      maxHeight={maxHeight}
      virtualScroll={virtualScroll}
      noResultsText={noResultsText}
      menuRef={menuRef}
    />;
  }

  return (
    <div className={classNames("ui-Select", className, isOpen)} style={{width}} {...otherProps}>
      <div className={classNames("ui-Select-value", {"ui-select-empty": value == null, "ui-has-clear": allowEmpty && value != null, "ui-select-disabled": disabled})}
           ref={valueRef} onClick={onToggle} onKeyDown={onKeyDown} tabIndex={disabled ? null : tabIndex}>
        {value != null ? renderValue(value) : placeholder}
        <FontAwesomeIcon icon={disabled ? faLock : faChevronDown} className={"ui-Select-arrow"}/>
        {!!(allowEmpty && value != null && !disabled) && <FontAwesomeIcon icon={faTimes} className={"ui-Select-clear"} onClick={onClear}/>}
      </div>
      {menu}
    </div>
  );
}));

Select.defaultCallbacks = defaultCallbacks;

export default Select;
