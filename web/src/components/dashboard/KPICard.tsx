import React from 'react';

interface SubItem {
  label: string;
  value: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendUp?: boolean;
  subItems?: SubItem[];
}

export function KPICard({ title, value, unit, trend, trendUp, subItems }: KPICardProps) {
  return (
    <div className="bg-surface rounded-xl p-5 shadow-sm border border-border flex flex-col justify-between">
      <div className="text-xs font-bold tracking-wider text-text-muted uppercase mb-3">
        {title}
      </div>
      <div className="flex items-end gap-2 mb-2">
        <div className="text-3xl font-bold font-mono text-primary leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {unit && <div className="text-sm font-semibold text-text-muted mb-1">{unit}</div>}
      </div>
      
      {trend && (
        <div className={`text-sm font-bold mb-3 ${trendUp ? 'text-success' : 'text-danger'}`}>
          {trend}
        </div>
      )}

      {subItems && subItems.length > 0 && (
        <div className="mt-auto pt-3 border-t border-border flex flex-col gap-1.5">
          {subItems.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="text-text-muted">{item.label}</span>
              <span className="font-mono font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
