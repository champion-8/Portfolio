'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PortfolioItem {
  id: string;
  assetType: string;
  assetName: string;
  quantity: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

interface PortfolioChartProps {
  portfolio: PortfolioItem[];
  totalValue: number;
  totalCost: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-purple-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-text-secondary mb-1">{payload[0].payload.date}</p>
        <p className="text-sm font-semibold text-purple-600">
          Value: ฿{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function PortfolioChart({ totalValue, totalCost }: Omit<PortfolioChartProps, 'portfolio'>) {
  // Generate mock historical data for trend
  const chartData = useMemo(() => {
    const days = 30;
    const data = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate historical trend from cost to current value
      const progress = (days - i) / days;
      const value = totalCost + (totalValue - totalCost) * progress;
      // Use deterministic variance based on day index to avoid Math.random() during render
      const variance = Math.sin(i * 0.5) * (totalValue * 0.03);
      
      data.push({
        date: date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
        value: Math.max(0, value + variance),
        cost: totalCost,
      });
    }
    
    return data;
  }, [totalValue, totalCost]);

  const formatCurrency = (value: number) => {
    return `฿${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#a78bfa"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
