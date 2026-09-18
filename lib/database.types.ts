// Hand-written types mirroring supabase/schema.sql.
// If the schema changes, update this file to match.
//
// NOTE: these must be `type` aliases, not `interface`s — @supabase/supabase-js
// checks each table's Row/Insert/Update against `Record<string, unknown>`,
// and TypeScript only treats plain object type aliases (not interfaces) as
// satisfying that check.

export type EntityStatus = "active" | "closed";
export type ProfileRole = "admin" | "editor" | "viewer";

export type Entity = {
  id: string;
  name: string;
  // Free text — the admin's own label per entity, no fixed category list.
  business_type: string;
  address: string | null;
  status: EntityStatus;
  notes: string | null;
  created_at: string;
};

export type EinRecord = {
  id: string;
  entity_id: string;
  ein_number: string;
  legal_name: string | null;
  document_url: string | null;
  issued_date: string | null;
  created_at: string;
};

export type License = {
  id: string;
  entity_id: string;
  license_type: string;
  license_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  status: string | null;
  document_url: string | null;
  created_at: string;
};

export type InsurancePolicy = {
  id: string;
  entity_id: string;
  policy_type: string;
  carrier: string | null;
  policy_number: string | null;
  coverage_amount: number | null;
  effective_date: string | null;
  expiration_date: string | null;
  document_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
};

export type UserEntityAccess = {
  user_id: string;
  entity_id: string;
};

export type AuditAction = "create" | "update" | "delete";

export type ChangedField = { before: unknown; after: unknown };

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string;
  entity_id: string | null;
  changed_fields: Record<string, ChangedField>;
  created_at: string;
};

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      entities: Table<Entity, Partial<Entity> & Pick<Entity, "name" | "business_type">>;
      ein_records: Table<EinRecord, Partial<EinRecord> & Pick<EinRecord, "entity_id" | "ein_number">>;
      licenses: Table<License, Partial<License> & Pick<License, "entity_id" | "license_type">>;
      insurance_policies: Table<
        InsurancePolicy,
        Partial<InsurancePolicy> & Pick<InsurancePolicy, "entity_id" | "policy_type">
      >;
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, "id">>;
      user_entity_access: Table<UserEntityAccess, UserEntityAccess>;
      // No app code ever inserts here — RLS has no write policy for
      // audit_log at all, only the security-definer trigger can. The
      // Insert type exists only so this table fits the same shape.
      audit_log: Table<
        AuditLog,
        Partial<AuditLog> & Pick<AuditLog, "action" | "table_name" | "record_id">
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
