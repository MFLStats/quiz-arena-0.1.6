import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { Category } from '@shared/types';
interface SkillRadarProps {
  categories: Category[];
  categoryElo?: Record<string, number>;
}
export function SkillRadar({ categories, categoryElo = {} }: SkillRadarProps) {
  // Transform data
  // We filter to ensure we don't have too many points if categories grow large,
  // but for now with ~10 categories it's manageable.
  // Sorting by Elo might make the shape weird, so we keep category order or sort by name.
  // Let's sort by name for consistency.
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const data = sortedCategories.map(cat => ({
    subject: cat.name,
    A: categoryElo[cat.id] || 1200, // Default Elo
    fullMark: 2000, // Max scale
  }));
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full min-h-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Activity className="w-5 h-5 text-indigo-400" />
          Skill Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#ffffff20" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 2000]} // Elo range 0-2000 roughly
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Elo Rating"
              dataKey="A"
              stroke="#818cf8"
              strokeWidth={2}
              fill="#6366f1"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff20', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#a1a1aa' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}