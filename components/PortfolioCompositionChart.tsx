'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Icon } from '@iconify/react';

interface PortfolioItem {
  id: string;
  assetType: 'fund' | 'stock' | 'crypto';
  assetId: string;
  assetName: string;
  quantity: number;
  avgBuyPrice: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  notes: string | null;
}

interface PortfolioCompositionChartProps {
  portfolio: PortfolioItem[];
  mode?: 'type' | 'asset'; // Show by asset type or individual assets
}

const COLORS = {
  fund: '#a78bfa',    // purple
  stock: '#f472b6',   // pink
  crypto: '#38bdf8',  // blue/cyan
};

const ASSET_COLORS = [
  '#a78bfa', '#f472b6', '#38bdf8', '#fb923c', '#34d399', 
  '#fbbf24', '#c084fc', '#f87171', '#60a5fa', '#a3e635'
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white border-2 border-purple-200 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-text-primary mb-1">{data.name}</p>
        <p className="text-xs text-text-secondary">
          Value: ฿{data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs font-medium text-purple-600">
          {data.payload.percentage}%
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, mode }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          className="flex items-center gap-1.5 px-2 py-1 bg-white/50 rounded-lg border border-purple-100"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-text-primary truncate max-w-[120px]">
            {entry.value}
          </span>
          {mode === 'type' && (
            <Icon 
              icon={
                entry.value === 'Fund' ? 'solar:dollar-bold-duotone' :
                entry.value === 'Stock' ? 'solar:chart-2-bold-duotone' : 
                'solar:bitcoin-bold-duotone'
              } 
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: entry.color }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default function PortfolioCompositionChart({ portfolio, mode = 'type' }: PortfolioCompositionChartProps) {
  const chartData = useMemo(() => {
    if (mode === 'type') {
      // Group by asset type
      const grouped: Record<string, number> = {
        fund: 0,
        stock: 0,
        crypto: 0,
      };

      portfolio.forEach((item) => {
        grouped[item.assetType] += item.currentValue;
      });

      const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);

      return [
        {
          name: 'Fund',
          value: grouped.fund,
          percentage: total > 0 ? ((grouped.fund / total) * 100).toFixed(1) : '0.0',
          color: COLORS.fund,
        },
        {
          name: 'Stock',
          value: grouped.stock,
          percentage: total > 0 ? ((grouped.stock / total) * 100).toFixed(1) : '0.0',
          color: COLORS.stock,
        },
        {
          name: 'Crypto',
          value: grouped.crypto,
          percentage: total > 0 ? ((grouped.crypto / total) * 100).toFixed(1) : '0.0',
          color: COLORS.crypto,
        },
      ].filter((item) => item.value > 0); // Only show types with values
    } else {
      // Show individual assets (top 10)
      const sorted = [...portfolio]
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 10);

      const total = sorted.reduce((sum, item) => sum + item.currentValue, 0);

      return sorted.map((item, index) => ({
        name: item.assetName,
        value: item.currentValue,
        percentage: total > 0 ? ((item.currentValue / total) * 100).toFixed(1) : '0.0',
        color: ASSET_COLORS[index % ASSET_COLORS.length],
      }));
    }
  }, [portfolio, mode]);

  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (portfolio.length === 0) {
    return (
      <div className="w-full h-40 flex flex-col items-center justify-center text-text-secondary">
        <Icon icon="solar:pie-chart-bold-duotone" className="w-12 h-12 mb-2 text-purple-300" />
        <p className="text-sm">No data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percent }: any) => `${(percent * 100).toFixed(1)}%`}
            outerRadius={60}
            innerRadius={30}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend mode={mode} />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Total Value Display */}
      <div className="mt-1 text-center">
        <p className="text-xs text-text-secondary">Total Portfolio Value</p>
        <p className="text-md font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          ฿{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
