// Hand-written from supabase/migrations/20261113120000_phase1_tasks.sql, in the
// same shape `supabase gen types typescript` produces. Keep the two in sync.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
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
      // ── Day Log (supabase/migrations/20261116120000_daylog_schema.sql) ──
      daylog_settings: TableDef<DaylogSettingsRow, never>;
      daylog_days: TableDef<DaylogDayRow, "day">;
      daylog_entries: TableDef<DaylogEntryRow, "day_id" | "start_at" | "end_at">;
      daylog_tags: TableDef<DaylogTagRow, "name">;
      daylog_entry_tags: TableDef<DaylogEntryTagRow, "entry_id" | "tag_id">;
      daylog_pauses: TableDef<DaylogPauseRow, "day_id">;
      push_subscriptions: TableDef<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">;
      notification_log: TableDef<NotificationLogRow, "user_id" | "kind" | "dedupe_key" | "title" | "body" | "url">;
    };
    Views: { [_ in never]: never };
    Functions: {
      daylog_request_test_push: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Row = every column; Insert = the required columns plus any optional ones;
// Update = any subset. Same shape as the generated types, written compactly.
type TableDef<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type DaylogStatus = "scheduled" | "active" | "ended" | "missed";
export type DaylogEntryKind = "opening" | "slot" | "pause";

/** What a day's settings_snapshot holds (also daylog_settings minus user_id/updated_at). */
export type DaylogSettings = {
  interval_minutes: 15 | 20 | 30 | 60;
  missed_slot_mode: "backfill" | "lock" | "skip";
  lock_after_slots: number;
  multi_slot_entries: boolean;
  tagging_mode: "off" | "while_writing" | "review" | "both";
  pause_mode: "off" | "button" | "timer";
  pause_timer_minutes: number;
  unanswered_ping_mode: "always" | "quiet_after";
  quiet_after_unanswered: number;
  midnight_notice: boolean;
  morning_reminder_time: string | null; // "07:00:00"
  auto_end_time: string; // "04:00:00"
};

type DaylogSettingsRow = DaylogSettings & { user_id: string; updated_at: string };

type DaylogDayRow = {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD
  status: DaylogStatus;
  window_start: string;
  window_end: string;
  started_at: string | null;
  ended_at: string | null;
  end_reason: "manual" | "auto" | null;
  settings_snapshot: DaylogSettings | null;
  created_at: string;
  updated_at: string;
};

type DaylogEntryRow = {
  id: string;
  user_id: string;
  day_id: string;
  kind: DaylogEntryKind;
  start_at: string;
  end_at: string;
  body: string | null;
  skipped: boolean;
  search: unknown; // generated tsvector; never selected by the app
  created_at: string;
  updated_at: string;
};

type DaylogTagRow = { id: string; user_id: string; name: string; color: string | null; created_at: string };
type DaylogEntryTagRow = { entry_id: string; tag_id: string; user_id: string };

type DaylogPauseRow = {
  id: string;
  user_id: string;
  day_id: string;
  started_at: string;
  ended_at: string | null;
  resume_at: string | null;
  created_at: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
  last_error: string | null;
  fail_count: number;
};

type NotificationLogRow = {
  id: string;
  user_id: string;
  day_id: string | null;
  kind: "midnight" | "morning" | "slot" | "resume" | "test";
  dedupe_key: string;
  slot_start: string | null;
  slot_end: string | null;
  title: string;
  body: string;
  url: string;
  status: "pending" | "sending" | "sent" | "failed" | "expired";
  attempts: number;
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

// The check constraints in the migration, as TypeScript unions.
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectStatus = "active" | "paused" | "done";
export type Priority = 1 | 2 | 3; // 1 = high

type Tables = Database["public"]["Tables"];
export type Area = Tables["areas"]["Row"];
export type Project = Tables["projects"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type DaylogDay = Tables["daylog_days"]["Row"];
export type DaylogEntry = Tables["daylog_entries"]["Row"];
export type DaylogTag = Tables["daylog_tags"]["Row"];
export type DaylogEntryTag = Tables["daylog_entry_tags"]["Row"];
export type DaylogPause = Tables["daylog_pauses"]["Row"];
