import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const colorVariants = {
  blue: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400",
  green: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400",
  yellow: "bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400",
  indigo: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/70 dark:text-cyan-400",
  orange: "bg-teal-100 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400",
};

export const FeatureCard = ({ icon: Icon, title, description, color }: FeatureCardProps) => {
  const colorClass = colorVariants[color as keyof typeof colorVariants] || colorVariants.blue;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${colorClass}`}>
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
};
