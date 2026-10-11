import React from 'react';
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { MetricCardData } from '../../types';

interface MetricCardProps {
  data: MetricCardData;
}

export const MetricCard: React.FC<MetricCardProps> = ({ data }) => {
  const getThemeStyles = (category: MetricCardData['category']) => {
    switch (category) {
      case 'rose':
        return {
          cardBg: 'bg-pastel-rose-bg',
          cardBorder: 'border-pastel-rose-border',
          titleColor: 'text-pastel-rose-text/80',
          valueColor: 'text-pastel-rose-text',
          badgeBg: 'bg-white/80 text-pastel-rose-text border border-pastel-rose-border',
          strokeColor: '#F1B4B9',
          fillColor: 'rgba(241, 180, 185, 0.25)',
          dotMenuColor: 'text-pastel-rose-text/60 hover:text-pastel-rose-text',
        };
      case 'lime':
        return {
          cardBg: 'bg-pastel-lime-bg',
          cardBorder: 'border-pastel-lime-border',
          titleColor: 'text-pastel-lime-text/80',
          valueColor: 'text-pastel-lime-text',
          badgeBg: 'bg-white/80 text-pastel-lime-text border border-pastel-lime-border',
          strokeColor: '#97C95B',
          fillColor: 'rgba(216, 241, 182, 0.35)',
          dotMenuColor: 'text-pastel-lime-text/60 hover:text-pastel-lime-text',
        };
      case 'mint':
        return {
          cardBg: 'bg-pastel-mint-bg',
          cardBorder: 'border-pastel-mint-border',
          titleColor: 'text-pastel-mint-text/80',
          valueColor: 'text-pastel-mint-text',
          badgeBg: 'bg-white/80 text-pastel-mint-text border border-pastel-mint-border',
          strokeColor: '#58B9AC',
          fillColor: 'rgba(169, 220, 213, 0.35)',
          dotMenuColor: 'text-pastel-mint-text/60 hover:text-pastel-mint-text',
        };
      case 'lavender':
      default:
        return {
          cardBg: 'bg-pastel-lavender-bg',
          cardBorder: 'border-pastel-lavender-border',
          titleColor: 'text-pastel-lavender-text/80',
          valueColor: 'text-pastel-lavender-text',
          badgeBg: 'bg-white/80 text-pastel-lavender-text border border-pastel-lavender-border',
          strokeColor: '#8C98DC',
          fillColor: 'rgba(185, 192, 238, 0.35)',
          dotMenuColor: 'text-pastel-lavender-text/60 hover:text-pastel-lavender-text',
        };
    }
  };

  const theme = getThemeStyles(data.category);

  // Generate SVG Sparkline Path
  const generateSparklinePath = (points: number[]) => {
    if (!points || points.length === 0) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 100;
    const height = 32;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${coords.join(' L ')}`;
  };

  const sparklinePath = generateSparklinePath(data.sparkline);
  const areaPath = sparklinePath
    ? `${sparklinePath} L 100,32 L 0,32 Z`
    : '';

  return (
    <div
      className={`p-5 rounded-3xl border ${theme.cardBg} ${theme.cardBorder} shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Top row: Title + 3-Dot Options */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold tracking-tight ${theme.titleColor}`}>
          {data.title}
        </span>
        <button
          title="Metric options"
          className={`p-1 rounded-full hover:bg-white/50 transition-colors ${theme.dotMenuColor}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: Big metric number + Mini Sparkline Graphic */}
      <div className="flex items-baseline justify-between my-2">
        <span className={`text-2xl md:text-3xl font-extrabold tracking-tight ${theme.valueColor}`}>
          {data.value}
        </span>

        {/* Mini SVG Sparkline */}
        <div className="w-20 h-8">
          <svg
            viewBox="0 0 100 32"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {areaPath && (
              <path
                d={areaPath}
                fill={theme.fillColor}
              />
            )}
            {sparklinePath && (
              <path
                d={sparklinePath}
                fill="none"
                stroke={theme.strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Bottom row: Change badge + descriptive subtext */}
      <div className="flex items-center gap-2 mt-1">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${theme.badgeBg}`}
        >
          {data.isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {data.change}
        </span>
        <span className="text-[11px] font-medium text-ink-secondary/90 truncate">
          {data.subtext}
        </span>
      </div>
    </div>
  );
};
