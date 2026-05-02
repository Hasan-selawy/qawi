import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; weight: number }[];
}

export function WeightChart({ data }: Props) {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            domain={['dataMin - 5', 'dataMax + 5']}
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94A3B8', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#3B82F6' }}
          />
          <Line type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#111827', stroke: '#3B82F6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}