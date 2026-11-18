import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

export type DrawerSide = 'left' | 'right';

export function Drawer({
  open,
  side,
  title,
  onClose,
  children,
  className = '',
  modal = false,
  footer,
}: {
  open: boolean;
  side: DrawerSide;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  modal?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div
      className={`drawer-root${open ? ' drawer-root--open' : ''}`}
      aria-hidden={open ? undefined : true}
    >
      {modal ? <div className="drawer-backdrop" onClick={onClose} role="presentation" /> : null}
      <aside
        className={`drawer-panel drawer-panel--${side} ${className}`.trim()}
        role="dialog"
        aria-label={title}
        aria-modal={modal || undefined}
      >
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="menu-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
