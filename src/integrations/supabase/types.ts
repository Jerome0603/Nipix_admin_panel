export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blogs: {
        Row: {
          author_id: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blogs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template_url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_url?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_id: string
          certificate_url: string | null
          course_name: string
          created_at: string
          id: string
          issued_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          student_name: string
          template_id: string | null
        }
        Insert: {
          certificate_id: string
          certificate_url?: string | null
          course_name: string
          created_at?: string
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          student_name: string
          template_id?: string | null
        }
        Update: {
          certificate_id?: string
          certificate_url?: string | null
          course_name?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          student_name?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      course_faqs: {
        Row: {
          answer: string
          course_id: string
          created_at: string
          id: string
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          course_id: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          course_id?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_faqs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string
          created_at: string
          id: string
          instructor_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          instructor_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      course_learning_outcomes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          type: string
          outcome: string
          sort_order: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          type: string
          outcome: string
          sort_order?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          type?: string
          outcome?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          module_id: string
          sort_order: number | null
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          module_id: string
          sort_order?: number | null
          title: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          module_id?: string
          sort_order?: number | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_projects: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_projects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          course_id: string
          created_at: string
          id: string
          name: string
          rating: number | null
          role: string | null
          sort_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          course_id: string
          created_at?: string
          id?: string
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_testimonials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          banner_url: string | null
          category: string | null
          certificate_enabled: boolean
          created_at: string
          currency: string | null
          description: string | null
          original_price: number | null
          duration: string | null
          enrollment_limit: number | null
          id: string
          language: string | null
          level: Database["public"]["Enums"]["course_level"]
          mode: Database["public"]["Enums"]["event_mode"] | null
          preview_video_url: string | null
          price: number
          short_description: string | null
          slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["course_status"]
          subtitle: string | null
          syllabus_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          certificate_enabled?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          original_price?: number | null
          duration?: string | null
          enrollment_limit?: number | null
          id?: string
          language?: string | null
          level?: Database["public"]["Enums"]["course_level"]
          mode?: Database["public"]["Enums"]["event_mode"] | null
          preview_video_url?: string | null
          price?: number
          short_description?: string | null
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          syllabus_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          certificate_enabled?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          original_price?: number | null
          duration?: string | null
          enrollment_limit?: number | null
          id?: string
          language?: string | null
          level?: Database["public"]["Enums"]["course_level"]
          mode?: Database["public"]["Enums"]["event_mode"] | null
          preview_video_url?: string | null
          price?: number
          short_description?: string | null
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          syllabus_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress: number
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_faqs: {
        Row: {
          answer: string
          created_at: string
          event_id: string
          id: string
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          created_at?: string
          event_id: string
          id?: string
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          created_at?: string
          event_id?: string
          id?: string
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_faqs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_prizes: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          position: string
          prize_amount: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          position: string
          prize_amount?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          position?: string
          prize_amount?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_prizes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_problem_statements: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          event_id: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          event_id: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          event_id?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_problem_statements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule_days: {
        Row: {
          created_at: string
          day_date: string | null
          day_number: number
          day_title: string | null
          event_id: string
          id: string
        }
        Insert: {
          created_at?: string
          day_date?: string | null
          day_number: number
          day_title?: string | null
          event_id: string
          id?: string
        }
        Update: {
          created_at?: string
          day_date?: string | null
          day_number?: number
          day_title?: string | null
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_days_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          schedule_day_id: string
          sort_order: number | null
          speaker: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          schedule_day_id: string
          sort_order?: number | null
          speaker?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          schedule_day_id?: string
          sort_order?: number | null
          speaker?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_schedule_day_id_fkey"
            columns: ["schedule_day_id"]
            isOneToOne: false
            referencedRelation: "event_schedule_days"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          certificate_enabled: boolean
          created_at: string
          description: string | null
          event_date: string | null
          event_time: string | null
          id: string
          image_url: string | null
          location: string | null
          mode: Database["public"]["Enums"]["event_mode"]
          registration_open: boolean
          status: Database["public"]["Enums"]["course_status"]
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          certificate_enabled?: boolean
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          mode?: Database["public"]["Enums"]["event_mode"]
          registration_open?: boolean
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          certificate_enabled?: boolean
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          mode?: Database["public"]["Enums"]["event_mode"]
          registration_open?: boolean
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      instructors: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      internship_benefits: {
        Row: {
          benefit: string
          created_at: string
          id: string
          internship_id: string
          sort_order: number | null
        }
        Insert: {
          benefit: string
          created_at?: string
          id?: string
          internship_id: string
          sort_order?: number | null
        }
        Update: {
          benefit?: string
          created_at?: string
          id?: string
          internship_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_benefits_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_responsibilities: {
        Row: {
          created_at: string
          id: string
          internship_id: string
          responsibility: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          internship_id: string
          responsibility: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          internship_id?: string
          responsibility?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_responsibilities_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_skills: {
        Row: {
          created_at: string
          id: string
          internship_id: string
          skill: string
        }
        Insert: {
          created_at?: string
          id?: string
          internship_id: string
          skill: string
        }
        Update: {
          created_at?: string
          id?: string
          internship_id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_skills_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internships: {
        Row: {
          certificate_enabled: boolean
          company: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          openings: number | null
          status: Database["public"]["Enums"]["course_status"]
          stipend: string | null
          title: string
          type: Database["public"]["Enums"]["internship_type"]
          updated_at: string
        }
        Insert: {
          certificate_enabled?: boolean
          company: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          openings?: number | null
          status?: Database["public"]["Enums"]["course_status"]
          stipend?: string | null
          title: string
          type?: Database["public"]["Enums"]["internship_type"]
          updated_at?: string
        }
        Update: {
          certificate_enabled?: boolean
          company?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          openings?: number | null
          status?: Database["public"]["Enums"]["course_status"]
          stipend?: string | null
          title?: string
          type?: Database["public"]["Enums"]["internship_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          category: Database["public"]["Enums"]["program_category"]
          certificate_enabled: boolean
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          mode: Database["public"]["Enums"]["event_mode"]
          status: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["program_category"]
          certificate_enabled?: boolean
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          mode?: Database["public"]["Enums"]["event_mode"]
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["program_category"]
          certificate_enabled?: boolean
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          mode?: Database["public"]["Enums"]["event_mode"]
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          email: string
          extra_data: Json | null
          id: string
          message: string | null
          name: string
          phone: string | null
          reference_id: string | null
          registration_type: Database["public"]["Enums"]["registration_type"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          extra_data?: Json | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          reference_id?: string | null
          registration_type: Database["public"]["Enums"]["registration_type"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          extra_data?: Json | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          reference_id?: string | null
          registration_type?: Database["public"]["Enums"]["registration_type"]
          status?: string
        }
        Relationships: []
      }
      seminar_agenda: {
        Row: {
          created_at: string
          description: string | null
          id: string
          seminar_id: string
          sort_order: number | null
          speaker: string | null
          time: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          seminar_id: string
          sort_order?: number | null
          speaker?: string | null
          time?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          seminar_id?: string
          sort_order?: number | null
          speaker?: string | null
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminar_agenda_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminar_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          seminar_id: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          seminar_id: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          seminar_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seminar_faqs_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminar_key_takeaways: {
        Row: {
          created_at: string
          id: string
          seminar_id: string
          sort_order: number | null
          takeaway: string
        }
        Insert: {
          created_at?: string
          id?: string
          seminar_id: string
          sort_order?: number | null
          takeaway: string
        }
        Update: {
          created_at?: string
          id?: string
          seminar_id?: string
          sort_order?: number | null
          takeaway?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminar_key_takeaways_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminar_past_events: {
        Row: {
          created_at: string
          date: string | null
          id: string
          image_url: string | null
          participants: string | null
          seminar_id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          image_url?: string | null
          participants?: string | null
          seminar_id: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          image_url?: string | null
          participants?: string | null
          seminar_id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seminar_past_events_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminar_speakers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          role: string | null
          seminar_id: string
          sort_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          role?: string | null
          seminar_id: string
          sort_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string | null
          seminar_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seminar_speakers_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminar_testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          id: string
          name: string
          rating: number | null
          role: string | null
          seminar_id: string
          sort_order: number | null
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: string
          name: string
          rating?: number | null
          role?: string | null
          seminar_id: string
          sort_order?: number | null
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number | null
          role?: string | null
          seminar_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seminar_testimonials_seminar_id_fkey"
            columns: ["seminar_id"]
            isOneToOne: false
            referencedRelation: "seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      seminars: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          location: string | null
          long_description: string | null
          main_speaker: string | null
          mode: Database["public"]["Enums"]["seminar_mode"] | null
          participants: string | null
          slug: string | null
          status: Database["public"]["Enums"]["course_status"] | null
          subtitle: string | null
          time: string | null
          title: string
          type: Database["public"]["Enums"]["seminar_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          long_description?: string | null
          main_speaker?: string | null
          mode?: Database["public"]["Enums"]["seminar_mode"] | null
          participants?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle?: string | null
          time?: string | null
          title: string
          type?: Database["public"]["Enums"]["seminar_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          long_description?: string | null
          main_speaker?: string | null
          mode?: Database["public"]["Enums"]["seminar_mode"] | null
          participants?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle?: string | null
          time?: string | null
          title?: string
          type?: Database["public"]["Enums"]["seminar_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vac_curriculum: {
        Row: {
          created_at: string
          description: string | null
          id: string
          sort_order: number | null
          title: string
          vac_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title: string
          vac_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          title?: string
          vac_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vac_curriculum_vac_id_fkey"
            columns: ["vac_id"]
            isOneToOne: false
            referencedRelation: "vac_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      vac_lessons: {
        Row: {
          created_at: string
          curriculum_id: string
          description: string | null
          duration: string | null
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          curriculum_id: string
          description?: string | null
          duration?: string | null
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          curriculum_id?: string
          description?: string | null
          duration?: string | null
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vac_lessons_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "vac_curriculum"
            referencedColumns: ["id"]
          },
        ]
      }
      vac_programs: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          instructor: string | null
          level: string | null
          long_description: string | null
          price: number | null
          rating: string | null
          slug: string | null
          status: Database["public"]["Enums"]["course_status"] | null
          students: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level?: string | null
          long_description?: string | null
          price?: number | null
          rating?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          students?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level?: string | null
          long_description?: string | null
          price?: number | null
          rating?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          students?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      workshop_agenda_days: {
        Row: {
          created_at: string
          day_date: string | null
          day_number: number
          day_title: string | null
          id: string
          sort_order: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          day_date?: string | null
          day_number: number
          day_title?: string | null
          id?: string
          sort_order?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          day_date?: string | null
          day_number?: number
          day_title?: string | null
          id?: string
          sort_order?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_agenda_days_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_agenda_sessions: {
        Row: {
          agenda_day_id: string
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          sort_order: number | null
          speaker: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          agenda_day_id: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          sort_order?: number | null
          speaker?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          agenda_day_id?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          sort_order?: number | null
          speaker?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_agenda_sessions_agenda_day_id_fkey"
            columns: ["agenda_day_id"]
            isOneToOne: false
            referencedRelation: "workshop_agenda_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number | null
          workshop_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number | null
          workshop_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_faqs_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_learning_outcomes: {
        Row: {
          created_at: string
          id: string
          outcome: string
          sort_order: number | null
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          sort_order?: number | null
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          sort_order?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_learning_outcomes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_past_events: {
        Row: {
          created_at: string
          date: string | null
          id: string
          image_url: string | null
          participants: string | null
          sort_order: number | null
          title: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          image_url?: string | null
          participants?: string | null
          sort_order?: number | null
          title: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          image_url?: string | null
          participants?: string | null
          sort_order?: number | null
          title?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_past_events_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          id: string
          name: string
          rating: number | null
          role: string | null
          sort_order: number | null
          workshop_id: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          id?: string
          name: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
          workshop_id: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          rating?: number | null
          role?: string | null
          sort_order?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_testimonials_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_trainers: {
        Row: {
          image_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          designation: string | null
          sort_order: number | null
          workshop_id: string
        }
        Insert: {
          image_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          designation?: string | null
          sort_order?: number | null
          workshop_id: string
        }
        Update: {
          image_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          designation?: string | null
          sort_order?: number | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_trainers_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          duration: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          location: string | null
          main_trainer: string | null
          mode: Database["public"]["Enums"]["seminar_mode"] | null
          participants: string | null
          slug: string | null
          status: Database["public"]["Enums"]["course_status"] | null
          subtitle: string | null
          title: string
          type: Database["public"]["Enums"]["workshop_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          duration?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          main_trainer?: string | null
          mode?: Database["public"]["Enums"]["seminar_mode"] | null
          participants?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle?: string | null
          title: string
          type?: Database["public"]["Enums"]["workshop_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          duration?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          location?: string | null
          main_trainer?: string | null
          mode?: Database["public"]["Enums"]["seminar_mode"] | null
          participants?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["course_status"] | null
          subtitle?: string | null
          title?: string
          type?: Database["public"]["Enums"]["workshop_type"] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "course_admin" | "support_team"
      certificate_status: "pending" | "approved" | "issued" | "Verified"
      course_level: "beginner" | "intermediate" | "advanced"
      course_status: "draft" | "published" | "archived"
      enrollment_status: "active" | "completed" | "dropped"
      event_mode: "online" | "offline" | "hybrid"
      internship_type: "online" | "hybrid" | "offline"
      payment_status: "paid" | "pending" | "refunded"
      program_category: "workshop" | "seminar" | "vac"
      registration_type:
        | "course"
        | "internship"
        | "event"
        | "workshop"
        | "seminar"
        | "vac"
      seminar_mode: "online" | "offline" | "hybrid"
      seminar_type: "technical" | "non_technical" | "career" | "industry"
      workshop_type:
        | "technical"
        | "non_technical"
        | "hands_on"
        | "certification"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "course_admin", "support_team"],
      certificate_status: ["pending", "approved", "issued", "verified"],
      course_level: ["beginner", "intermediate", "advanced"],
      course_status: ["draft", "published", "archived"],
      enrollment_status: ["active", "completed", "dropped"],
      event_mode: ["online", "offline", "hybrid"],
      internship_type: ["online", "hybrid", "offline"],
      payment_status: ["paid", "pending", "refunded"],
      program_category: ["workshop", "seminar", "vac"],
      registration_type: [
        "course",
        "internship",
        "event",
        "workshop",
        "seminar",
        "vac",
      ],
      seminar_mode: ["online", "offline", "hybrid"],
      seminar_type: ["technical", "non_technical", "career", "industry"],
      workshop_type: [
        "technical",
        "non_technical",
        "hands_on",
        "certification",
      ],
    },
  },
} as const
