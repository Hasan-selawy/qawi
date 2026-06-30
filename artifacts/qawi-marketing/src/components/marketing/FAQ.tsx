import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, SectionHeading } from './shared';

function FaqItem({
  q,
  a,
  open,
  onToggle,
  isAr,
  id,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  isAr: boolean;
  id: number;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${open ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}` }}
    >
      <h3>
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`faq-answer-${id}`}
          id={`faq-question-${id}`}
          className={cn(
            'w-full flex items-center justify-between gap-4 px-5 py-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-green-500',
            isAr && 'flex-row-reverse text-right',
          )}
        >
          <span className="text-base font-semibold text-white">{q}</span>
          <ChevronDown
            className={cn('w-5 h-5 flex-shrink-0 transition-transform duration-300', open && 'rotate-180')}
            style={{ color: open ? GREEN : 'rgba(255,255,255,0.4)' }}
            aria-hidden="true"
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-answer-${id}`}
            role="region"
            aria-labelledby={`faq-question-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className={cn('px-5 pb-4 text-sm text-white/55 leading-relaxed', isAr && 'text-right')}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ({ t, isAr }: { t: typeof content.en.faq; isAr: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className={cn(CONTAINER, 'max-w-3xl')}>
        <SectionHeading eyebrow={isAr ? 'الأسئلة الشائعة' : 'FAQ'} title={t.heading} sub={t.sub} isAr={isAr} />
        <div className="space-y-3">
          {t.items.map((item, i) => (
            <FaqItem
              key={item.q}
              id={i}
              q={item.q}
              a={item.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              isAr={isAr}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
