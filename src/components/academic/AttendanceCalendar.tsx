'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWIB } from '@/lib/dates';

export interface CalendarAttendanceRecord {
  date: string; // YYYY-MM-DD
  status: 'present' | 'sick' | 'excused' | 'absent';
  note?: string | null;
}

interface AttendanceCalendarProps {
  records: CalendarAttendanceRecord[];
}

export function AttendanceCalendar({ records }: AttendanceCalendarProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-11

  // Petakan record berdasarkan tanggal string "YYYY-MM-DD"
  const recordMap = useMemo(() => {
    const map = new Map<string, CalendarAttendanceRecord>();
    records.forEach((r) => {
      map.set(r.date, r);
    });
    return map;
  }, [records]);

  // Hitung hari-hari dalam bulan
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Hari pertama bulan (0: Minggu, 1: Senin, ..., 6: Sabtu)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Konversi ke format Senin = 0, ..., Minggu = 6
    const startOffset = (firstDayIndex + 6) % 7;

    const days: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      isWeekend: boolean;
      record?: CalendarAttendanceRecord;
    }> = [];

    // Hari kosong sebelum tanggal 1
    for (let i = 0; i < startOffset; i++) {
      days.push({ dayNumber: null, dateStr: null, isWeekend: false });
    }

    // Hari dalam bulan
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      days.push({
        dayNumber: day,
        dateStr,
        isWeekend,
        record: recordMap.get(dateStr),
      });
    }

    return days;
  }, [year, month, recordMap]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const monthLabel = formatWIB(currentMonthDate, { month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-5 rounded-[14px] bg-white border border-[#E6E0D6] shadow-2xs space-y-4">
      {/* Header Bulan */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-[var(--color-text)]">
          {monthLabel}
        </h3>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-[8px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[#F3EFEA] cursor-pointer"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-[8px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[#F3EFEA] cursor-pointer"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Kalender */}
      <div>
        {/* Header Nama Hari */}
        <div className="grid grid-cols-7 text-center mb-1">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName, idx) => (
            <span
              key={dayName}
              className={`text-[11px] font-semibold py-1 ${
                idx >= 5 ? 'text-[#A0AAB0]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Kotak Tanggal */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((item, idx) => {
            if (!item.dayNumber || !item.dateStr) {
              return <div key={`empty-${idx}`} className="h-9 sm:h-10" />;
            }

            const rec = item.record;
            let statusText = 'Tidak ada catatan';
            let dotColor = '';

            if (rec) {
              if (rec.status === 'present') {
                statusText = 'Hadir';
                dotColor = 'bg-[#1F5C4D]';
              } else if (rec.status === 'sick') {
                statusText = 'Sakit';
                dotColor = 'bg-[#D97706]';
              } else if (rec.status === 'excused') {
                statusText = 'Izin';
                dotColor = 'bg-[#2563EB]';
              } else if (rec.status === 'absent') {
                statusText = 'Alpa';
                dotColor = 'bg-[#DC2626]';
              }
            }

            const ariaLabel = `${item.dayNumber} ${monthLabel}: ${
              rec ? statusText : item.isWeekend ? 'Akhir pekan' : 'Sekolah biasa'
            }`;

            return (
              <div
                key={item.dateStr}
                tabIndex={0}
                aria-label={ariaLabel}
                className={`
                  h-9 sm:h-10 rounded-[8px] flex flex-col items-center justify-center relative text-xs font-medium transition-colors
                  ${
                    item.isWeekend
                      ? 'bg-[#F9F7F4] text-[#A6AFB2]'
                      : 'text-[var(--color-text)] hover:bg-[#FAF7F2]'
                  }
                  focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]
                `}
              >
                <span>{item.dayNumber}</span>
                {rec && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda Keterangan */}
      <div className="pt-3 border-t border-[#F0EBE1] flex flex-wrap items-center justify-center gap-4 text-[11px] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1F5C4D]" />
          <span>Hadir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#D97706]" />
          <span>Sakit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
          <span>Izin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
          <span>Alpa</span>
        </div>
      </div>
    </div>
  );
}
