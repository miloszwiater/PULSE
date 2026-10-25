import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { dismissToast, useToasts } from './toast';
import { back } from '../app/router';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';

export function Button({ variant = 'secondary', icon, size = 'md', block, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: IconName; size?: 'sm' | 'md' | 'lg'; block?: boolean }) {
  return (
    <button className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon, label, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function ScreenHeader({ title, sub, onBack, actions }: { title: string; sub?: ReactNode; onBack?: (() => void) | true; actions?: ReactNode }) {
  return (
    <header className="screen-head">
      <div className="screen-head__row">
        {onBack && <IconButton icon="back" label="Wróć" className="screen-head__back" onClick={onBack === true ? () => back() : onBack} />}
        <h1 className="screen-head__title">{title}</h1>
        <div className="screen-head__actions">{actions}</div>
      </div>
      {sub && <div className="screen-head__sub">{sub}</div>}
    </header>
  );
}

export function Section({ title, aside, children, id }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="section" aria-labelledby={id}>
      {(title || aside) && (
        <div className="section__head">
          {title && <h2 className="section__title" id={id}>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Sheet({ open, onClose, title, children, footer, tall }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    // Focus the dialog itself (or an explicit [data-autofocus]) — avoids a stray focus ring on the close button.
    const t = setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current)?.focus({ preventScroll: true }), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);
  useEffect(() => { if (open) setClosing(false); }, [open]);
  if (!open) return null;
  const close = () => { setClosing(true); setTimeout(onClose, 160); };
  return createPortal(
    <div className={`sheet-layer${closing ? ' is-closing' : ''}`}>
      <div className="sheet-backdrop" onClick={close} />
      <div className={`sheet${tall ? ' sheet--tall' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="sheet__grip" aria-hidden="true" />
        <div className="sheet__head">
          <h2 className="sheet__title" id={titleId}>{title}</h2>
          <IconButton icon="close" label="Zamknij" className="sheet__close" onClick={close} />
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={`segmented__opt${value === o.value ? ' is-on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, children, onClick, tone, icon, disabled }: { on?: boolean; children: ReactNode; onClick?: () => void; tone?: 'violet' | 'blue' | 'ok' | 'warn' | 'danger'; icon?: IconName; disabled?: boolean }) {
  return (
    <button type="button" className={`chip${on ? ' is-on' : ''}${tone ? ` chip--${tone}` : ''}`} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, error }: { label: string; hint?: ReactNode; children: ReactNode; error?: string | null }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error" role="alert">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle">
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true"><span className="toggle__thumb" /></span>
    </label>
  );
}

export function Empty({ icon, title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="empty__icon"><Icon name={icon} size={26} /></span>}
      <p className="empty__title">{title}</p>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}

export function Meter({ value, max, tone = 'violet', label }: { value: number; max: number; tone?: 'violet' | 'blue' | 'ok'; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`meter meter--${tone}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span className="meter__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Row({ title, sub, leading, trailing, onClick, tone }: { title: ReactNode; sub?: ReactNode; leading?: ReactNode; trailing?: ReactNode; onClick?: () => void; tone?: string }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`row${onClick ? ' row--action' : ''}`} onClick={onClick} style={tone ? ({ '--row-tone': tone } as React.CSSProperties) : undefined}>
      {leading && <span className="row__lead">{leading}</span>}
      <span className="row__main">
        <span className="row__title">{title}</span>
        {sub && <span className="row__sub">{sub}</span>}
      </span>
      {trailing !== undefined ? <span className="row__trail">{trailing}</span> : onClick ? <span className="row__trail"><Icon name="chevron" size={18} /></span> : null}
    </Tag>
  );
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <span>{t.text}</span>
          {t.action && <button className="toast__action" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

export function Confirm({ open, title, text, confirmLabel, danger, onConfirm, onClose }: { open: boolean; title: string; text: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Anuluj</Button><Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p className="muted">{text}</p>
    </Sheet>
  );
}
