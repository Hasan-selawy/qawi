import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, ArrowRight } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, BG, cn } from './shared';

type Field = 'name' | 'email' | 'phone' | 'gym' | 'city';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function GetAccessModal({
  open,
  onClose,
  t,
  isAr,
}: {
  open: boolean;
  onClose: () => void;
  t: typeof content.en.modal;
  isAr: boolean;
}) {
  const [form, setForm] = useState<Record<Field, string>>({ name: '', email: '', phone: '', gym: '', city: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Reset state + capture the element that opened the modal (to restore focus on close)
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      setDone(false);
      setSubmitting(false);
      setForm({ name: '', email: '', phone: '', gym: '', city: '' });
      setErrors({});
    }
  }, [open]);

  // Escape to close, lock body scroll, focus first input, restore focus on close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null,
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const f = window.setTimeout(() => firstInputRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(f);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const set = (k: Field, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: false }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<Field, boolean>> = {};
    if (form.name.trim().length < 2) next.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = true;
    if (form.gym.trim().length < 2) next.gym = true;
    if (Object.keys(next).length) {
      setErrors(next);
      const firstError = (['name', 'email', 'gym'] as Field[]).find((k) => next[k]);
      if (firstError) document.getElementById(`field-${firstError}`)?.focus();
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 900);
  };

  const errorMsg: Partial<Record<Field, string>> = {
    name: t.errors.name,
    email: t.errors.email,
    gym: t.errors.gym,
  };

  const fields: { key: Field; label: string; ph: string; type: string; required: boolean }[] = [
    { key: 'name', label: t.name, ph: t.namePh, type: 'text', required: true },
    { key: 'email', label: t.email, ph: t.emailPh, type: 'email', required: true },
    { key: 'gym', label: t.gym, ph: t.gymPh, type: 'text', required: true },
    { key: 'phone', label: t.phone, ph: t.phonePh, type: 'tel', required: false },
    { key: 'city', label: t.city, ph: t.cityPh, type: 'text', required: false },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            style={{ background: '#0E1426', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 90px rgba(0,0,0,0.6)' }}
          >
            <button
              onClick={onClose}
              aria-label={t.close}
              className={cn(
                'absolute top-4 w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                isAr ? 'left-4' : 'right-4',
              )}
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {done ? (
              <div className="py-8 text-center space-y-4">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <Check className="w-8 h-8" style={{ color: GREEN }} />
                </div>
                <h2 id="access-modal-title" className="text-xl font-bold text-white">
                  {t.success}
                </h2>
                <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto">{t.successSub}</p>
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  style={{ background: GREEN, color: BG }}
                >
                  {t.close}
                </button>
              </div>
            ) : (
              <>
                <div className={cn('mb-6 space-y-1.5', isAr && 'text-right')}>
                  <h2 id="access-modal-title" className="text-xl font-bold text-white">
                    {t.title}
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">{t.sub}</p>
                </div>

                <form onSubmit={submit} className="space-y-4" noValidate>
                  {fields.map((f) => {
                    const hasError = !!errors[f.key];
                    const msg = errorMsg[f.key];
                    return (
                      <div key={f.key} className={cn('space-y-1.5', isAr && 'text-right')}>
                        <label htmlFor={`field-${f.key}`} className="block text-xs font-semibold text-white/70">
                          {f.label}
                          {f.required && <span style={{ color: GREEN }}> *</span>}
                        </label>
                        <input
                          id={`field-${f.key}`}
                          ref={f.key === 'name' ? firstInputRef : undefined}
                          type={f.type}
                          value={form[f.key]}
                          onChange={(e) => set(f.key, e.target.value)}
                          placeholder={f.ph}
                          aria-invalid={hasError}
                          aria-required={f.required}
                          aria-describedby={hasError && msg ? `field-${f.key}-error` : undefined}
                          dir={isAr ? 'rtl' : 'ltr'}
                          className={cn(
                            'w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-green-500',
                            isAr && 'text-right',
                          )}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${hasError ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.1)'}`,
                          }}
                        />
                        {hasError && msg && (
                          <p id={`field-${f.key}-error`} className="text-xs text-red-400">
                            {msg}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    style={{ background: GREEN, color: BG, boxShadow: '0 0 30px rgba(34,197,94,0.32)' }}
                  >
                    {submitting ? t.submitting : t.submit}
                    {!submitting && <ArrowRight className={cn('w-4 h-4', isAr && 'rotate-180')} />}
                  </button>
                  <p className="text-[11px] text-white/55 text-center">{t.privacy}</p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
