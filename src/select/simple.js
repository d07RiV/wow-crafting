import React from 'react';

export default function SimpleSelect({ options, value, onChange, props }) {
  const onSelect = React.useCallback(e => {
    onChange(e.target.value);
  }, [onChange]);
  return (
    <select value={value} onChange={onSelect} {...props}>
      {options.map(({id, name, disabled}) => <option key={id} value={id} disabled={disabled}>{name}</option>)}
    </select>
  );
}
