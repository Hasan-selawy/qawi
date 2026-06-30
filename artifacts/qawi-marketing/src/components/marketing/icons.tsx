import {
  Users,
  Salad,
  Dumbbell,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  Database,
  Smartphone,
  LineChart,
  Zap,
  Apple,
  type LucideIcon,
} from 'lucide-react';

export const featureIcons: Record<string, LucideIcon> = {
  members: Users,
  nutrition: Salad,
  workout: Dumbbell,
  classes: CalendarCheck,
  coach: ClipboardList,
  analytics: BarChart3,
  database: Database,
  mobile: Smartphone,
};

export const modernIcons: Record<string, LucideIcon> = {
  clarity: LineChart,
  speed: Zap,
  localized: Apple,
  modern: Smartphone,
};
