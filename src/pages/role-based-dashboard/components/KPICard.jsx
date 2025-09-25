import React from 'react';
import Icon from '../../../components/AppIcon';

const KPICard = ({ title, value, change, changeType, icon, color = 'primary' }) => {
  const getColorClasses = () => {
    const colors = {
      primary: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
      success: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
      warning: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
      error: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
      accent: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
    };
    return colors[color] || colors.primary;
  };

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-slate-500';
  };

  const getChangeIcon = () => {
    if (changeType === 'positive') return 'TrendingUp';
    if (changeType === 'negative') return 'TrendingDown';
    return 'Minus';
  };

  const getBackgroundDecoration = () => {
    const decorations = {
      primary: 'bg-blue-100',
      success: 'bg-green-100',
      warning: 'bg-amber-100',
      error: 'bg-red-100',
      accent: 'bg-purple-100'
    };
    return decorations[color] || decorations.primary;
  };

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1">
      {/* Background decoration */}
      <div className={`absolute -top-2 -right-2 w-16 h-16 ${getBackgroundDecoration()} rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 mb-3 truncate">
            {value}
          </p>
          {change && (
            <div className={`flex items-center gap-2 ${getChangeColor()}`}>
              <div className="flex items-center gap-1">
                <Icon name={getChangeIcon()} size={14} />
                <span className="text-sm font-medium">{change}</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses()} shadow-sm flex-shrink-0`}>
          <Icon name={icon} size={24} />
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
    </div>
  );
};

export default KPICard;