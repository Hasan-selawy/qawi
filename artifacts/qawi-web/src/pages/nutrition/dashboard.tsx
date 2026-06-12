import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { UtensilsCrossed } from 'lucide-react';

export default function NutritionDashboard() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
        <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
          <UtensilsCrossed size={36} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isAr ? 'لوحة التغذية' : 'Nutrition Dashboard'}
          </h2>
          <p className="text-muted-foreground max-w-sm">
            {isAr
              ? 'يتم حاليًا تطوير لوحة تحكم التغذية. ستتمكن قريبًا من إدارة خطط التغذية وأهداف الأعضاء وتتبع التقدم الغذائي.'
              : 'The nutrition dashboard is under development. Soon you\'ll be able to manage nutrition plans, member targets, and track dietary progress.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm font-medium">
            {isAr ? 'قادم قريباً' : 'Coming Soon'}
          </span>
        </div>
      </div>
    </PageWrapper>
  );
}
