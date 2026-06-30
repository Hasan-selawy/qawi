import { useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Search, Dumbbell, User } from 'lucide-react';
import { content, type RoleId } from '@/locales/content';
import { GREEN, cn, CONTAINER, SectionHeading } from './shared';

type RolesContent = typeof content.en.roles;
type RoleData = RolesContent['content'][RoleId];

/* ── Per-role mock panels ─────────────────────────────────────────── */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      aria-hidden="true"
      style={{
        background: 'linear-gradient(160deg, rgba(20,27,46,0.95), rgba(10,15,30,0.95))',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.5), 0 0 50px rgba(34,197,94,0.08)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px]" style={{ background: GREEN, color: '#0A0F1E' }}>Q</span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AdminMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.admin.mockup;
  const bars = [45, 62, 50, 78, 60, 90];
  return (
    <Shell title={mm.title}>
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
        <div className="text-[11px] text-white/45">{mm.revenue}</div>
        <div className="text-xl font-bold text-white mb-2">$48,200</div>
        <div className="flex items-end gap-1.5 h-12">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 5 ? GREEN : 'rgba(34,197,94,0.35)' }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: mm.members, v: '1,284' },
          { l: mm.checkins, v: '312' },
          { l: mm.growth, v: '+12%' },
        ].map((k) => (
          <div key={k.l} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-base font-bold text-white">{k.v}</div>
            <div className="text-[10px] text-white/45 mt-0.5 leading-tight">{k.l}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function CoachMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.coach.mockup;
  const members = [
    { n: 'Sara A.', s: mm.onTrack, ok: true },
    { n: 'Omar K.', s: mm.attention, ok: false },
    { n: 'Lina H.', s: mm.onTrack, ok: true },
  ];
  return (
    <Shell title={mm.title}>
      <div className="space-y-2 mb-3">
        {members.map((x) => (
          <div key={x.n} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <User className="w-4 h-4" style={{ color: GREEN }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{x.n}</div>
              <div className="text-[10px]" style={{ color: x.ok ? GREEN : '#F59E0B' }}>{x.s}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
        <Dumbbell className="w-4 h-4" style={{ color: GREEN }} />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white">{mm.plan}</div>
          <div className="text-[10px] text-white/50">{mm.planMeta}</div>
        </div>
      </div>
    </Shell>
  );
}

function NutritionistMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.nutritionist.mockup;
  const macros = [
    { l: mm.protein, pct: 80, c: GREEN },
    { l: mm.carbs, pct: 60, c: '#3B82F6' },
    { l: mm.fat, pct: 42, c: '#F59E0B' },
  ];
  return (
    <Shell title={mm.title}>
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px] text-white/45">{mm.calories}</span>
          <span className="text-lg font-bold text-white">1,840 <span className="text-[10px] text-white/55">kcal</span></span>
        </div>
        <div className="space-y-2">
          {macros.map((x) => (
            <div key={x.l} className="flex items-center gap-2">
              <span className="text-[10px] text-white/55 w-16">{x.l}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/8">
                <div className="h-full rounded-full" style={{ width: `${x.pct}%`, background: x.c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-2.5 mb-2 text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {mm.meal}
      </div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: GREEN }}>
        {mm.library}
      </div>
    </Shell>
  );
}

function ReceptionistMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.receptionist.mockup;
  const feed = ['Sara A.', 'Omar K.', 'Lina H.'];
  return (
    <Shell title={mm.title}>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Search className="w-4 h-4 text-white/55" />
        <span className="text-xs text-white/55">{mm.searchPh}</span>
      </div>
      <div className="flex items-center justify-between rounded-xl p-3 mb-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
        <span className="text-[11px] text-white/55">{mm.inGym}</span>
        <span className="text-xl font-bold text-white">128</span>
      </div>
      <div className="text-[11px] text-white/45 mb-2">{mm.live}</div>
      <div className="space-y-2">
        {feed.map((n) => (
          <div key={n} className="flex items-center justify-between rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs text-white/80">{n}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: GREEN }}>
              <Check className="w-3 h-3" /> {mm.checkedIn}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function MemberMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.member.mockup;
  return (
    <Shell title={mm.title}>
      <div className="rounded-xl p-3.5 mb-3 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
        <Dumbbell className="w-5 h-5" style={{ color: GREEN }} />
        <div>
          <div className="text-xs font-semibold text-white">{mm.workout}</div>
          <div className="text-[10px] text-white/50">{mm.workoutMeta}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-lg font-bold text-white">620</div>
          <div className="text-[10px] text-white/45">{mm.caloriesLeft}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-lg font-bold" style={{ color: GREEN }}>14</div>
          <div className="text-[10px] text-white/45">{mm.streak}</div>
        </div>
      </div>
      <div className="rounded-xl py-2.5 text-center text-xs font-bold" style={{ background: GREEN, color: '#0A0F1E' }}>
        {mm.checkin}
      </div>
    </Shell>
  );
}

function StaffMock({ m }: { m: RoleData['mockup'] }) {
  const mm = m as typeof content.en.roles.content.staff.mockup;
  return (
    <Shell title={mm.title}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
          <div className="text-lg font-bold text-white">6</div>
          <div className="text-[10px] text-white/45">{mm.tasks}</div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-lg font-bold text-white">9 / 11</div>
          <div className="text-[10px] text-white/45">{mm.present}</div>
        </div>
      </div>
      <div className="rounded-xl p-3 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-[11px] text-white/45 mb-0.5">{mm.shift}</div>
        <div className="text-xs font-semibold text-white">08:00 — 16:00</div>
      </div>
      <div className="flex items-center gap-2 rounded-xl p-2.5 text-xs text-white/75" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
        {mm.note}
      </div>
    </Shell>
  );
}

const MOCKS: Record<RoleId, (p: { m: RoleData['mockup'] }) => ReactElement> = {
  admin: AdminMock,
  coach: CoachMock,
  nutritionist: NutritionistMock,
  receptionist: ReceptionistMock,
  member: MemberMock,
  staff: StaffMock,
};

/* ── Section ─────────────────────────────────────────────────────── */

export function Roles({ t, isAr }: { t: RolesContent; isAr: boolean }) {
  const [active, setActive] = useState<RoleId>('admin');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const data = t.content[active];
  const Mock = MOCKS[active];

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const last = t.tabs.length - 1;
    const fwd = isAr ? 'ArrowLeft' : 'ArrowRight';
    const back = isAr ? 'ArrowRight' : 'ArrowLeft';
    let next = -1;
    if (e.key === fwd) next = i === last ? 0 : i + 1;
    else if (e.key === back) next = i === 0 ? last : i - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next >= 0) {
      e.preventDefault();
      setActive(t.tabs[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section id="roles" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className={CONTAINER}>
        <SectionHeading eyebrow={isAr ? 'الأدوار' : 'Roles'} title={t.heading} sub={t.sub} isAr={isAr} />

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t.heading}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {t.tabs.map((tab, i) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[i] = el; }}
                role="tab"
                id={`role-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`role-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(e) => onKey(e, i)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                style={
                  selected
                    ? { background: GREEN, color: '#0A0F1E', boxShadow: '0 0 22px rgba(34,197,94,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          role="tabpanel"
          id={`role-panel-${active}`}
          aria-labelledby={`role-tab-${active}`}
          tabIndex={0}
          className="outline-none"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
            >
              {/* Copy + feature list */}
              <div className={cn(isAr && 'lg:text-right')}>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{data.title}</h3>
                <p className="text-white/55 leading-relaxed mb-6">{data.desc}</p>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/55 mb-3">{t.featuresLabel}</div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.features.map((f) => (
                    <li key={f} className={cn('flex items-center gap-2.5', isAr && 'flex-row-reverse text-right')}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                        <Check className="w-3 h-3" style={{ color: GREEN }} />
                      </span>
                      <span className="text-sm text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup */}
              <div className="flex justify-center lg:justify-end" dir="ltr">
                <div className="w-full max-w-[360px]">
                  <Mock m={data.mockup} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
