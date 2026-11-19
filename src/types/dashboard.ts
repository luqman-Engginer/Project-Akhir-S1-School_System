import type { Role } from '@/lib/auth/roles'

export interface StudentDashboard {
  role: 'student'
  student_id: string
  today_schedule: Array<{
    schedule_id: string
    subject_name: string
    teacher_name: string
    start_time: string
    end_time: string
  }>
  upcoming_assignments: Array<{
    assignment_id: string
    title: string
    subject_name: string
    teacher_name: string
    deadline: string
    status: 'not_submitted' | 'submitted' | 'late' | 'graded' | 'overdue_not_submitted'
    score: number | null
  }>
  latest_grades: Array<{
    submission_id: string
    assignment_title: string
    subject_name: string
    score: number
    feedback: string | null
    graded_at: string
  }>
  unread_messages: number
  unread_notifications: number
}

export interface TeacherDashboard {
  role: 'teacher'
  teacher_id: string
  is_homeroom: boolean
  today_classes: Array<{
    teaching_id: string
    class_id: string
    class_name: string
    subject_name: string
    start_time: string
    end_time: string
  }>
  to_grade: Array<{
    submission_id: string
    assignment_id: string
    assignment_title: string
    student_id: string
    student_name: string
    class_name: string
    submitted_at: string
  }>
  unanswered_threads: Array<{
    thread_id: string
    subject: string
    category: string
    sender_name: string
    sender_role: Role
    student_name: string | null
    created_at: string
    unread_count: number
  }>
  pending_leaves: Array<{
    leave_id: string
    student_id: string
    student_name: string
    type: 'sick' | 'excused'
    date_from: string
    date_to: string
    reason: string
    created_at: string
  }>
  attendance_today: Array<{
    class_id: string
    class_name: string
    is_recorded: boolean
  }>
}

export interface ParentDashboardChild {
  student_id: string
  name: string
  class_name: string
  today_status: 'present' | 'sick' | 'excused' | 'absent' | 'belum_diabsen'
  late_assignments: Array<{
    assignment_id: string
    title: string
    deadline: string
  }>
  latest_grades: Array<{
    assignment_title: string
    score: number
    graded_at: string
  }>
  upcoming_assignments: Array<{
    assignment_id: string
    title: string
    deadline: string
  }>
}

export interface ParentDashboard {
  role: 'parent'
  children: ParentDashboardChild[]
  announcements: Array<{
    id: string
    title: string
    body: string
    is_pinned: boolean
    created_at: string
  }>
  unread_messages: number
}

export interface AdminDashboard {
  role: 'admin'
  users_by_role: {
    admin: number
    teacher: number
    student: number
    parent: number
  }
  attendance_today_percent: number
  attendance_last_7_days: Array<{
    date: string
    percent_present: number
  }>
  average_score_per_class: Array<{
    class_id: string
    class_name: string
    average_score: number
  }>
  students_high_absence: Array<{
    student_id: string
    student_name: string
    class_name: string
    total_absences: number
    sick_count: number
    excused_count: number
    absent_count: number
  }>
  latest_announcements: Array<{
    id: string
    title: string
    target: string
    author_name: string
    created_at: string
  }>
}

export interface ParentChildSummary {
  student_id: string
  student_name: string
  class_name: string
  attendance_percent_30d: number
  recent_attendance: Array<{
    date: string
    status: 'present' | 'sick' | 'excused' | 'absent'
    note: string | null
  }>
  assignments: Array<{
    assignment_id: string
    title: string
    subject_name: string
    deadline: string
    status: string
    score: number | null
  }>
  average_by_subject: Array<{
    subject_name: string
    average_score: number
  }>
}

export interface ClassRosterItem {
  student_id: string
  student_name: string
  status: 'present' | 'sick' | 'excused' | 'absent'
  note: string | null
}
