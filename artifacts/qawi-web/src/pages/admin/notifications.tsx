import { useState, type FormEvent } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Audience =
  | 'ALL_MEMBERS'
  | 'ACTIVE_MEMBERS'
  | 'EXPIRING_MEMBERS'
  | 'EXPIRED_MEMBERS'
  | 'SPECIFIC_MEMBER';

const AUDIENCES: Audience[] = [
  'ALL_MEMBERS',
  'ACTIVE_MEMBERS',
  'EXPIRING_MEMBERS',
  'EXPIRED_MEMBERS',
  'SPECIFIC_MEMBER',
];

export default function AdminNotifications() {
  const { t, lang } = useLanguage();

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [audience, setAudience] = useState<Audience>('ALL_MEMBERS');
  const [targetUserId, setTargetUserId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastDelivered, setLastDelivered] = useState<number | null>(null);

  const { data: members } = useQuery<any[]>({
    queryKey: ['admin', 'members'],
    queryFn: () => apiFetch('/admin/members'),
    enabled: audience === 'SPECIFIC_MEMBER',
  });

  // Only build the audience-count request when it is answerable
  // (a specific member must be chosen first).
  const countQuery =
    audience === 'SPECIFIC_MEMBER'
      ? targetUserId
        ? `?audience=SPECIFIC_MEMBER&targetUserId=${targetUserId}`
        : null
      : `?audience=${audience}`;

  const { data: audienceCount, isFetching: countLoading } = useQuery<{ count: number }>({
    queryKey: ['admin', 'audience-count', audience, targetUserId],
    queryFn: () => apiFetch(`/admin/notifications/audience-count${countQuery}`),
    enabled: !!countQuery,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch<{ delivered: number }>('/admin/notifications/send', { method: 'POST', data: payload }),
    onSuccess: (res) => {
      setLastDelivered(res.delivered);
      toast.success(t('adminNotify.successBody').replace('{count}', String(res.delivered)));
      setTitleEn('');
      setTitleAr('');
      setBodyEn('');
      setBodyAr('');
      setErrors({});
    },
    onError: (err: any) => {
      toast.error((lang === 'ar' ? err.messageAr : err.error) || t('adminNotify.errorGeneric'));
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!titleEn.trim()) e.titleEn = t('adminNotify.errors.titleEn');
    if (!titleAr.trim()) e.titleAr = t('adminNotify.errors.titleAr');
    if (!bodyEn.trim()) e.messageEn = t('adminNotify.errors.messageEn');
    if (!bodyAr.trim()) e.messageAr = t('adminNotify.errors.messageAr');
    if (audience === 'SPECIFIC_MEMBER' && !targetUserId) e.member = t('adminNotify.errors.member');
    return e;
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLastDelivered(null);
    const payload: any = {
      titleEn: titleEn.trim(),
      titleAr: titleAr.trim(),
      bodyEn: bodyEn.trim(),
      bodyAr: bodyAr.trim(),
      audience,
    };
    if (audience === 'SPECIFIC_MEMBER') payload.targetUserId = targetUserId;
    sendMutation.mutate(payload);
  };

  return (
    <PageWrapper>
      <PageHeader title={t('adminNotify.pageTitle')} />

      <div className="max-w-3xl">
        <p className="text-muted-foreground text-sm mb-6">{t('adminNotify.subtitle')}</p>

        {lastDelivered !== null && (
          <div className="glass-card border-green-500/30 bg-green-500/10 p-4 mb-6 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-400">{t('adminNotify.successTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('adminNotify.successBody').replace('{count}', String(lastDelivered))}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="glass-card border-white/5 p-5 sm:p-6 space-y-6">
          {/* Title */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{t('adminNotify.titleEn')}</Label>
              <Input
                value={titleEn}
                maxLength={140}
                dir="ltr"
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={t('adminNotify.titleEnPlaceholder')}
                className={`bg-black/20 ${errors.titleEn ? 'border-red-500' : ''}`}
              />
              {errors.titleEn && <p className="text-red-400 text-xs mt-1">{errors.titleEn}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">{t('adminNotify.titleAr')}</Label>
              <Input
                value={titleAr}
                maxLength={140}
                dir="rtl"
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={t('adminNotify.titleArPlaceholder')}
                className={`bg-black/20 ${errors.titleAr ? 'border-red-500' : ''}`}
              />
              {errors.titleAr && <p className="text-red-400 text-xs mt-1">{errors.titleAr}</p>}
            </div>
          </div>

          {/* Message */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{t('adminNotify.messageEn')}</Label>
              <Textarea
                value={bodyEn}
                maxLength={1000}
                dir="ltr"
                rows={4}
                onChange={(e) => setBodyEn(e.target.value)}
                placeholder={t('adminNotify.messageEnPlaceholder')}
                className={`bg-black/20 resize-none ${errors.messageEn ? 'border-red-500' : ''}`}
              />
              {errors.messageEn && <p className="text-red-400 text-xs mt-1">{errors.messageEn}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block">{t('adminNotify.messageAr')}</Label>
              <Textarea
                value={bodyAr}
                maxLength={1000}
                dir="rtl"
                rows={4}
                onChange={(e) => setBodyAr(e.target.value)}
                placeholder={t('adminNotify.messageArPlaceholder')}
                className={`bg-black/20 resize-none ${errors.messageAr ? 'border-red-500' : ''}`}
              />
              {errors.messageAr && <p className="text-red-400 text-xs mt-1">{errors.messageAr}</p>}
            </div>
          </div>

          {/* Recipients */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">{t('adminNotify.recipients')}</Label>
              <Select
                value={audience}
                onValueChange={(v) => {
                  setAudience(v as Audience);
                  setTargetUserId('');
                  setErrors((prev) => ({ ...prev, member: '' }));
                }}
              >
                <SelectTrigger className="bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {t(`adminNotify.audience.${a}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {audience === 'SPECIFIC_MEMBER' && (
              <div>
                <Label className="mb-1.5 block">{t('adminNotify.selectMember')}</Label>
                <Select value={targetUserId} onValueChange={(v) => setTargetUserId(v)}>
                  <SelectTrigger className={`bg-black/20 ${errors.member ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder={t('adminNotify.selectMember')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(members || []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} {m.email ? `· ${m.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.member && <p className="text-red-400 text-xs mt-1">{errors.member}</p>}
              </div>
            )}
          </div>

          {/* Audience size preview */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            {countLoading ? (
              <span>{t('adminNotify.reachLoading')}</span>
            ) : countQuery && audienceCount ? (
              <span>{t('adminNotify.willReach').replace('{count}', String(audienceCount.count))}</span>
            ) : (
              <span>{t('adminNotify.selectMember')}</span>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="glow-hover" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sendMutation.isPending ? t('adminNotify.sending') : t('adminNotify.send')}
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
