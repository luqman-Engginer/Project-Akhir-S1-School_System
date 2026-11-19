export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent'
export type AttendanceStatus = 'present' | 'sick' | 'excused' | 'absent'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = 'sick' | 'excused'
export type SubmissionStatus = 'submitted' | 'graded'
export type AnnouncementTarget = 'all' | 'class' | 'parents'
export type ThreadCategory = 'leave' | 'consultation' | 'assignment' | 'other'
export type ThreadStatus = 'new' | 'read' | 'replied' | 'done'
export type NotificationType =
  | 'attendance'
  | 'leave'
  | 'assignment'
  | 'grade'
  | 'message'
  | 'announcement'
  | 'reminder'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          email_normalized: string
          full_name: string
          role: UserRole
          phone: string | null
          is_homeroom: boolean
          is_active: boolean
          is_demo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          email_normalized?: string
          full_name: string
          role: UserRole
          phone?: string | null
          is_homeroom?: boolean
          is_active?: boolean
          is_demo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      classes: {
        Row: {
          id: string
          name: string
          academic_year: string
          homeroom_teacher_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          academic_year: string
          homeroom_teacher_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      subjects: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      teachings: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string
          class_id: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          subject_id: string
          class_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['teachings']['Insert']>
      }
      schedules: {
        Row: {
          id: string
          teaching_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          teaching_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['schedules']['Insert']>
      }
      student_classes: {
        Row: {
          student_id: string
          class_id: string
          created_at: string
        }
        Insert: {
          student_id: string
          class_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['student_classes']['Insert']>
      }
      parent_students: {
        Row: {
          parent_id: string
          student_id: string
          created_at: string
        }
        Insert: {
          parent_id: string
          student_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['parent_students']['Insert']>
      }
      attendance: {
        Row: {
          id: string
          student_id: string
          class_id: string
          date: string
          status: AttendanceStatus
          note: string | null
          recorded_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          class_id: string
          date: string
          status?: AttendanceStatus
          note?: string | null
          recorded_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
      }
      leave_requests: {
        Row: {
          id: string
          student_id: string
          submitted_by: string
          date_from: string
          date_to: string
          reason: string
          attachment_path: string | null
          type: LeaveType
          status: LeaveStatus
          reviewed_by: string | null
          reviewed_at: string | null
          review_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          submitted_by: string
          date_from: string
          date_to: string
          reason: string
          attachment_path?: string | null
          type: LeaveType
          status?: LeaveStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>
      }
      assignments: {
        Row: {
          id: string
          teaching_id: string
          title: string
          description: string
          deadline: string
          attachment_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teaching_id: string
          title: string
          description?: string
          deadline: string
          attachment_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['assignments']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          assignment_id: string
          student_id: string
          content_url: string | null
          file_path: string | null
          submitted_at: string
          status: SubmissionStatus
          score: number | null
          feedback: string | null
          graded_by: string | null
          graded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          student_id: string
          content_url?: string | null
          file_path?: string | null
          submitted_at?: string
          status?: SubmissionStatus
          score?: number | null
          feedback?: string | null
          graded_by?: string | null
          graded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
      announcements: {
        Row: {
          id: string
          author_id: string
          target: AnnouncementTarget
          class_id: string | null
          title: string
          body: string
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          target: AnnouncementTarget
          class_id?: string | null
          title: string
          body: string
          is_pinned?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          announcement_id: string
          user_id: string
          read_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcement_reads']['Insert']>
      }
      threads: {
        Row: {
          id: string
          category: ThreadCategory
          subject: string
          status: ThreadStatus
          student_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: ThreadCategory
          subject: string
          status?: ThreadStatus
          student_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['threads']['Insert']>
      }
      thread_participants: {
        Row: {
          thread_id: string
          user_id: string
          last_read_at: string | null
        }
        Insert: {
          thread_id: string
          user_id: string
          last_read_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['thread_participants']['Insert']>
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          body: string
          attachment_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id: string
          body: string
          attachment_path?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          body: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          body: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      assignment_reminders: {
        Row: {
          assignment_id: string
          student_id: string
          reminded_at: string
        }
        Insert: {
          assignment_id: string
          student_id: string
          reminded_at?: string
        }
        Update: Partial<Database['public']['Tables']['assignment_reminders']['Insert']>
      }
    }
    Views: {
      assignment_status_view: {
        Row: {
          assignment_id: string
          student_id: string
          class_id: string
          assignment_title: string
          deadline: string
          submission_id: string | null
          submitted_at: string | null
          score: number | null
          feedback: string | null
          status: 'not_submitted' | 'submitted' | 'late' | 'graded' | 'overdue_not_submitted'
        }
      }
    }
  }
}
