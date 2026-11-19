import { useId, useMemo, useState } from 'react';
import type { UnitId } from '../../types.ts';
import { formatOol, type OolOption } from './oolOptions.ts';

interface OolAutocompleteProps {
  label: string;
  value: UnitId[];
  options: OolOption[];
  onChange: (ool: UnitId[]) => void;
}

export function OolAutocomplete({ label, value, options, onChange }: OolAutocompleteProps) {
  const listId = useId();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');

  const displayed = editing ? draft : formatOol(value);
  const matches = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? options.filter((option) => option.label.toLowerCase().includes(query)) : options;
  }, [filter, options]);
  const visible = matches.slice(0, 100);

  const choose = (option: OolOption) => {
    onChange(option.ool);
    setEditing(false);
    setOpen(false);
    setFilter('');
  };

  return (
    <div className="ool-autocomplete">
      <div className={`field field--ool field--green${displayed ? ' field--filled' : ''}`}>
        <input
          className="field__input"
          value={displayed}
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={(event) => {
            setEditing(true);
            setDraft(formatOol(value));
            setFilter('');
            setOpen(true);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setEditing(true);
            setDraft(event.target.value);
            setFilter(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              setEditing(false);
            }, 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setEditing(false);
            } else if (event.key === 'Enter' && visible[0]) {
              event.preventDefault();
              choose(visible[0]);
            }
          }}
        />
        <label className="field__label">{label}</label>
      </div>
      {open ? (
        <div className="ool-dropdown" role="listbox" id={listId}>
          {visible.length ? (
            visible.map((option) => (
              <button
                key={option.label}
                type="button"
                className="ool-option"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="ool-dropdown__empty">No matching OOLs</div>
          )}
          {matches.length > visible.length ? (
            <div className="ool-dropdown__more">Type to narrow the list…</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
