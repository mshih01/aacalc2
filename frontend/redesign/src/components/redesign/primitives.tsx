import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon.tsx';

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number | string;
  disabled?: boolean;
  green?: boolean;
  outlined?: boolean;
  className?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  ariaLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  disabled = false,
  green = false,
  outlined = false,
  className = '',
  placeholder,
  inputMode,
  ariaLabel,
  onFocus,
  onBlur,
  autoFocus,
}: FieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const filled = value !== '' && value !== undefined && value !== null;
  return (
    <div
      className={[
        'field',
        outlined ? 'field--outlined' : '',
        green ? 'field--green' : '',
        filled ? 'field--filled' : '',
        focused ? 'field--focused' : '',
        disabled ? 'field--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={id}
        className="field__input"
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-label={ariaLabel ?? label}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
      />
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  green?: boolean;
  outlined?: boolean;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  green = false,
  outlined = false,
  compact = false,
  className = '',
  ariaLabel,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div
      className={[
        'field',
        'field--select',
        'field--filled',
        compact ? 'field--compact' : '',
        outlined ? 'field--outlined' : '',
        green ? 'field--green' : '',
        disabled ? 'field--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <select
        id={id}
        className="field__select"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {compact ? null : (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <Icon name="chevron" className="field__chevron" />
    </div>
  );
}

export function CheckboxControl({
  label,
  checked,
  onChange,
  large = false,
  disabled = false,
  className = '',
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  large?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={[
        'checkbox',
        large ? 'checkbox--large' : '',
        disabled ? 'checkbox--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox__box" aria-hidden="true">
        <Icon name="check" />
      </span>
      <span className="checkbox__label-text">{label}</span>
    </label>
  );
}

export function SwitchControl({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="switch" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__track" />
      <span className="switch__thumb" />
    </label>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-button${primary ? ' icon-button--primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </button>
  );
}
