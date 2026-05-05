import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ResetPasswordModalProps {
  userId: string;
  userName: string;
  endpoint: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ResetPasswordModal({
  userId, userName, endpoint, open, onOpenChange,
}: ResetPasswordModalProps) {
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ newPass?: string; confirmPass?: string }>({});

  const reset = useMutation({
    mutationFn: () =>
      apiFetch(endpoint, { method: 'PUT', data: { newPassword: newPass } }),
    onSuccess: () => {
      toast.success(isRTL ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully');
      onOpenChange(false);
      setNewPass('');
      setConfirmPass('');
      setErrors({});
    },
    onError: (err: any) =>
      toast.error(isRTL ? err.messageAr : err.error || (isRTL ? 'فشل تحديث كلمة المرور' : 'Failed to update password')),
  });

  const validate = () => {
    const e: typeof errors = {};
    if (newPass.length < 8)
      e.newPass = isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters';
    if (newPass !== confirmPass)
      e.confirmPass = isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) reset.mutate();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) { setNewPass(''); setConfirmPass(''); setErrors({}); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-card border-white/10 sm:max-w-[400px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary" />
            {isRTL ? `إعادة تعيين كلمة مرور ${userName}` : `Reset Password — ${userName}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className={`bg-black/20 pr-10 ${errors.newPass ? 'border-red-500' : ''}`}
                placeholder={isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPass && <p className="text-red-400 text-xs mt-1">{errors.newPass}</p>}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={`bg-black/20 pr-10 ${errors.confirmPass ? 'border-red-500' : ''}`}
                placeholder={isRTL ? 'أكد كلمة المرور' : 'Confirm new password'}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPass && <p className="text-red-400 text-xs mt-1">{errors.confirmPass}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" className="flex-1 glow-hover" disabled={reset.isPending}>
              {reset.isPending
                ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…')
                : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
