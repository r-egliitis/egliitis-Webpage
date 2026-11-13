// Hand-written from supabase/migrations/20261113120000_phase1_tasks.sql, in the
// same shape `supabase gen types typescript` produces. Keep the two in sync.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          name: string;
          description: string | null;
          status: ProjectStatus;
          deadline: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          deadline?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          deadline?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_area_fk";
            columns: ["area_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          area_id: string | null;
          project_id: string | null;
          due_date: string | null;
          priority: Priority;
          status: TaskStatus;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          notes?: string | null;
          area_id?: string | null;
          project_id?: string | null;
          due_date?: string | null;
          priority?: Priority;
          status?: TaskStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string | null;
          area_id?: string | null;
          project_id?: string | null;
          due_date?: string | null;
          priority?: Priority;
          status?: TaskStatus;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_area_fk";
            columns: ["area_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "tasks_project_fk";
            columns: ["project_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// The check constraints in the migration, as TypeScript unions.
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectStatus = "active" | "paused" | "done";
export type Priority = 1 | 2 | 3; // 1 = high

type Tables = Database["public"]["Tables"];
export type Area = Tables["areas"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Task = Tables["tasks"]["Row"];
