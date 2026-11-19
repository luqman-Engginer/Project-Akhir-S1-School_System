'use client';

import { useState } from 'react';
import { Bell, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatRelativeDeadline } from '@/lib/dates';
import { ParentReminderDialog } from './ParentReminderDialog';

interface ParentTaskItem {
  assignment_id: string;
  title: string;
  subject_name: string;
  deadline: string;
  status: string;
  score: number | null;
}

interface ParentTasksSectionProps {
  studentId: string;
  studentName: string;
  tasks: ParentTaskItem[];
}

export function ParentTasksSection({
  studentId,
  studentName,
  tasks,
}: ParentTasksSectionProps) {
  const [selectedTask, setSelectedTask] = useState<ParentTaskItem | null>(null);

  // Urutkan: Terlambat & Belum kumpul di atas, lalu berdasarkan deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    const isOverdueA = a.status === 'overdue_not_submitted' || a.status === 'late';
    const isOverdueB = b.status === 'overdue_not_submitted' || b.status === 'late';

    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;

    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="space-y-4">
      {sortedTasks.length === 0 ? (
        <div className="p-6 rounded-[12px] bg-white border border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
          Belum ada tugas yang diberikan oleh bapak/ibu guru untuk kelas ananda.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const relDeadline = formatRelativeDeadline(task.deadline);
            const needsReminder =
              task.status === 'not_submitted' ||
              task.status === 'overdue_not_submitted' ||
              task.status === 'late';

            return (
              <div
                key={task.assignment_id}
                className="p-4 rounded-[12px] bg-white border border-[var(--color-border)] hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F4EFEA] text-[var(--color-text-muted)]">
                      {task.subject_name}
                    </span>
                    <StatusBadge status={task.status as any} />
                    {relDeadline.isUrgent && task.status === 'not_submitted' && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Deadline &lt; 24 jam</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-[var(--color-text)] line-clamp-1">
                    {task.title}
                  </h4>

                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Tenggat: {relDeadline.label}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)] shrink-0">
                  {task.score !== null ? (
                    <div className="text-right">
                      <span className="text-[11px] text-[var(--color-text-muted)] block">Nilai</span>
                      <span className="text-xl font-bold font-display text-[var(--color-primary)]">
                        {task.score}
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">/100</span>
                      </span>
                    </div>
                  ) : needsReminder ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedTask(task)}
                      className="min-h-[44px] text-xs"
                    >
                      <Bell className="w-3.5 h-3.5 mr-1.5 text-[var(--color-primary)]" />
                      <span>Ingatkan Ananda</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Menunggu penilaian</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <ParentReminderDialog
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          studentId={studentId}
          studentName={studentName}
          assignmentTitle={selectedTask.title}
          subjectName={selectedTask.subject_name}
        />
      )}
    </div>
  );
}
