'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { formatWIB } from '@/lib/dates';

interface AttendancePoint {
  date: string;
  percent_present: number;
}

interface ClassScorePoint {
  class_id: string;
  class_name: string;
  average_score: number;
}

export function AttendanceTrendChart({ data }: { data: AttendancePoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Belum ada data kehadiran 7 hari terakhir.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    rawDate: d.date,
    displayDate: formatWIB(d.date, { weekday: 'short', day: 'numeric', month: 'short' }),
    kehadiran: Math.round(d.percent_present || 0),
  }));

  const total = chartData.reduce((acc, curr) => acc + curr.kehadiran, 0);
  const avg = Math.round(total / (chartData.length || 1));

  return (
    <div>
      {/* Aksesibilitas: Ringkasan teks alternatif untuk pembaca layar */}
      <div className="sr-only">
        <h4>Tabel Data Tren Kehadiran 7 Hari Terakhir</h4>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Persentase Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d, i) => (
              <tr key={i}>
                <td>{d.displayDate}</td>
                <td>{d.kehadiran}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-64 w-full pt-2" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="attendanceColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1F5C4D" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1F5C4D" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5DA" />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={{ stroke: '#DDD7CD' }}
              tick={{ fontSize: 11, fill: '#5B676B' }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#5B676B' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              formatter={(value: any) => [`${value}%`, 'Tingkat Kehadiran']}
              labelFormatter={(label) => `Tanggal: ${label}`}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                borderColor: '#E6E0D6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="kehadiran"
              stroke="#1F5C4D"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#attendanceColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>Rata-rata kehadiran 7 hari terakhir:</span>
        <strong className="text-sm font-bold text-[var(--color-primary)]">
          {isNaN(avg) ? '0%' : `${avg}%`}
        </strong>
      </div>
    </div>
  );
}

export function ClassScoresChart({ data }: { data: ClassScorePoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Belum ada data nilai per kelas.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    kelas: d.class_name,
    nilai: Number((d.average_score || 0).toFixed(1)),
  }));

  const total = chartData.reduce((acc, curr) => acc + curr.nilai, 0);
  const avg = Number((total / (chartData.length || 1)).toFixed(1));

  return (
    <div>
      {/* Aksesibilitas: Ringkasan teks alternatif untuk pembaca layar */}
      <div className="sr-only">
        <h4>Tabel Rata-rata Nilai per Kelas</h4>
        <table>
          <thead>
            <tr>
              <th>Kelas</th>
              <th>Rerata Nilai</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((d, i) => (
              <tr key={i}>
                <td>{d.kelas}</td>
                <td>{d.nilai} / 100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-64 w-full pt-2" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EBE5DA" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#DDD7CD' }}
              tick={{ fontSize: 11, fill: '#5B676B' }}
            />
            <YAxis
              type="category"
              dataKey="kelas"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#1F2A2E', fontWeight: 500 }}
              width={80}
            />
            <Tooltip
              formatter={(value: any) => [`${value} / 100`, 'Rata-rata Nilai']}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                borderColor: '#E6E0D6',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="nilai"
              fill="#1F5C4D"
              radius={[0, 6, 6, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
        <span>Rata-rata seluruh kelas:</span>
        <strong className="text-sm font-bold text-[var(--color-primary)]">
          {isNaN(avg) ? '0' : avg}
        </strong>
      </div>
    </div>
  );
}
