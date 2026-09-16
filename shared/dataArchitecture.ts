export type DataField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type DataTableDefinition = {
  name: string;
  layer: "RAW" | "REFERENCE" | "LINK" | "KPI";
  authority: string;
  grain: string;
  primaryKey: string;
  status: "CURRENTLY VERIFIED" | "PROPOSED" | "PENDING VERIFICATION";
  fields: DataField[];
};

const field = (name: string, type: string, required: boolean, description: string): DataField => ({
  name,
  type,
  required,
  description,
});

export const WORKFLOW_GROUPS = [
  {
    id: "blast-ownership",
    label: "Blast & ownership",
    outcome: "Count one Respond.io outbound event once and retain the owner observed at event time.",
  },
  {
    id: "appointment-attendance",
    label: "Appointment & attendance",
    outcome: "Keep one Aoikumo appointment lifecycle while separating booked, rescheduled, cancelled and attended events.",
  },
  {
    id: "payment-signup",
    label: "Payment & signup",
    outcome: "Attribute an Aoikumo payment independently from appointment date and treat signup as a payment-backed event.",
  },
] as const;

export const PAUSE_STATUS = {
  code: "PAUSED_PENDING_VERIFICATION",
  label: "Pause when a required source, key, owner rule or event history is missing; preserve the record without forcing attribution.",
} as const;

export const OBJECTION_SHORTCUTS = [
  { id: "objection-not-interested", label: "Not interested", kind: "SHORTCUT WORKFLOW", action: "Classify only; no message is sent." },
  { id: "objection-timing", label: "Timing / not now", kind: "SHORTCUT WORKFLOW", action: "Classify only; any follow-up remains DRAFT ONLY." },
  { id: "objection-price", label: "Price / affordability", kind: "SHORTCUT WORKFLOW", action: "Classify only; no offer or payment action is triggered." },
] as const;

export const ATTRIBUTION_DECISIONS = [
  {
    id: "owner-transfer",
    question: "When one contact transfers between two CSOs, which owner receives the event?",
    proposedRule: "Store the owner observed at each source event; do not overwrite history with the current owner.",
    status: "PENDING VERIFICATION",
  },
  {
    id: "appointment-cancelled",
    question: "Does a cancelled appointment enter the appointment KPI?",
    proposedRule: "Keep it in lifecycle history but exclude it from the current booked/attended KPI.",
    status: "PENDING VERIFICATION",
  },
  {
    id: "appointment-rescheduled",
    question: "Is a reschedule a new appointment?",
    proposedRule: "Retain a RESCHEDULED event under the same Appointment ID; do not count a second appointment.",
    status: "PENDING VERIFICATION",
  },
  {
    id: "payment-business-date",
    question: "Should payment/signup follow appointment date or payment date?",
    proposedRule: "Use payment time for payment/signup KPIs and retain appointment date as a separate analytical dimension.",
    status: "PENDING VERIFICATION",
  },
] as const;

export const DATA_TABLES: DataTableDefinition[] = [
  {
    name: "Raw_Respond",
    layer: "RAW",
    authority: "Respond.io",
    grain: "One immutable outbound message or shortcut event",
    primaryKey: "message_event_id",
    status: "PROPOSED",
    fields: [
      field("message_event_id", "STRING", true, "Respond.io message/event identifier"),
      field("contact_id", "STRING", true, "Respond.io deterministic contact identifier"),
      field("owner_id_at_event", "STRING", false, "Owner observed when the event occurred"),
      field("shortcut_code", "STRING", false, "Approved shortcut or workflow code"),
      field("campaign_id", "STRING", false, "Campaign or blast identifier"),
      field("direction", "ENUM", true, "OUTGOING or INCOMING"),
      field("event_time_utc", "DATETIME_UTC", true, "Immutable event timestamp"),
      field("delivery_status", "ENUM", false, "Provider delivery state; pending verification"),
      field("source_payload_hash", "STRING", true, "Idempotency and audit hash"),
      field("ingested_at_utc", "DATETIME_UTC", true, "Raw ingestion timestamp"),
    ],
  },
  {
    name: "Raw_Appointment",
    layer: "RAW",
    authority: "Aoikumo",
    grain: "One immutable appointment lifecycle event",
    primaryKey: "appointment_event_id",
    status: "PENDING VERIFICATION",
    fields: [
      field("appointment_event_id", "STRING", true, "Source event identifier or deterministic event hash"),
      field("appointment_id", "STRING", true, "Aoikumo appointment identifier"),
      field("customer_id", "STRING", true, "Aoikumo customer identifier"),
      field("event_type", "ENUM", true, "CREATED, RESCHEDULED, CANCELLED, ATTENDED or NO_SHOW"),
      field("event_time_utc", "DATETIME_UTC", true, "When the lifecycle event occurred"),
      field("appointment_start_utc", "DATETIME_UTC", true, "Scheduled start after this event"),
      field("outlet_id", "STRING", false, "Aoikumo outlet identifier"),
      field("assigned_cso_id", "STRING", false, "CSO stored by source, if present"),
      field("resource_ids", "JSON", false, "Room, machine, therapist and BA identifiers"),
      field("source_payload_hash", "STRING", true, "Idempotency and audit hash"),
    ],
  },
  {
    name: "Raw_Payment",
    layer: "RAW",
    authority: "Aoikumo",
    grain: "One posted, voided, reversed or refunded payment event",
    primaryKey: "payment_event_id",
    status: "PENDING VERIFICATION",
    fields: [
      field("payment_event_id", "STRING", true, "Source event identifier or deterministic event hash"),
      field("payment_id", "STRING", true, "Aoikumo payment or receipt identifier"),
      field("customer_id", "STRING", true, "Aoikumo customer identifier"),
      field("appointment_id", "STRING", false, "Linked appointment when the source provides it"),
      field("event_type", "ENUM", true, "POSTED, VOIDED, REVERSED or REFUNDED"),
      field("payment_time_utc", "DATETIME_UTC", true, "Financial event time; never replaced by appointment date"),
      field("amount", "DECIMAL(12,2)", true, "Signed transaction amount"),
      field("currency", "CHAR(3)", true, "ISO currency code"),
      field("line_item_ids", "JSON", false, "Transaction line identifiers for future reconciliation"),
      field("source_payload_hash", "STRING", true, "Idempotency and audit hash"),
    ],
  },
  {
    name: "Ref_CSO",
    layer: "REFERENCE",
    authority: "Approved operations directory",
    grain: "One CSO identity and effective-date record",
    primaryKey: "cso_record_id",
    status: "PENDING VERIFICATION",
    fields: [
      field("cso_record_id", "STRING", true, "Stable surrogate identity version"),
      field("cso_id", "STRING", true, "Approved cross-system CSO identifier"),
      field("respond_user_id", "STRING", false, "Respond.io user identifier"),
      field("aoikumo_user_id", "STRING", false, "Aoikumo user identifier"),
      field("display_name", "STRING", true, "Internal display label"),
      field("effective_from_utc", "DATETIME_UTC", true, "Identity mapping start"),
      field("effective_to_utc", "DATETIME_UTC", false, "Identity mapping end"),
      field("active_flag", "BOOLEAN", true, "Current roster state"),
    ],
  },
  {
    name: "Bridge_Contact_Identity",
    layer: "LINK",
    authority: "Approved deterministic mapping",
    grain: "One effective mapping between Respond.io and Aoikumo customer identities",
    primaryKey: "identity_link_id",
    status: "PROPOSED",
    fields: [
      field("identity_link_id", "STRING", true, "Stable mapping identifier"),
      field("respond_contact_id", "STRING", true, "Respond.io contact identifier"),
      field("aoikumo_customer_id", "STRING", true, "Aoikumo customer identifier"),
      field("match_method", "ENUM", true, "EXACT_SOURCE_ID or approved deterministic key"),
      field("confidence_status", "ENUM", true, "CONFIRMED, AMBIGUOUS or UNMATCHED"),
      field("effective_from_utc", "DATETIME_UTC", true, "Mapping validity start"),
      field("effective_to_utc", "DATETIME_UTC", false, "Mapping validity end"),
      field("evidence_reference", "STRING", true, "Source or approval reference"),
    ],
  },
  {
    name: "Fact_Blast_Ownership",
    layer: "LINK",
    authority: "Respond.io + approved owner rule",
    grain: "One qualifying outbound blast event with one attribution decision",
    primaryKey: "blast_fact_id",
    status: "PROPOSED",
    fields: [
      field("blast_fact_id", "STRING", true, "Stable fact identifier"),
      field("message_event_id", "STRING", true, "Link to Raw_Respond"),
      field("contact_id", "STRING", true, "Respond.io contact identifier"),
      field("attributed_cso_id", "STRING", false, "CSO after the approved ownership rule"),
      field("ownership_rule_version", "STRING", true, "Versioned attribution policy"),
      field("qualifying_blast_flag", "BOOLEAN", true, "Whether the event enters Blast KPI"),
      field("objection_shortcut", "ENUM", false, "One of the three approved shortcuts"),
      field("audit_status", "ENUM", true, "CURRENTLY_VERIFIED, PROPOSED or PAUSED_PENDING_VERIFICATION"),
    ],
  },
  {
    name: "Fact_Appointment_Lifecycle",
    layer: "LINK",
    authority: "Aoikumo",
    grain: "One appointment with its latest state and retained event history",
    primaryKey: "appointment_id",
    status: "PROPOSED",
    fields: [
      field("appointment_id", "STRING", true, "Aoikumo appointment identifier"),
      field("customer_id", "STRING", true, "Aoikumo customer identifier"),
      field("created_time_utc", "DATETIME_UTC", true, "Original booking creation time"),
      field("current_start_utc", "DATETIME_UTC", true, "Latest scheduled start"),
      field("current_status", "ENUM", true, "BOOKED, CANCELLED, ATTENDED or NO_SHOW"),
      field("reschedule_count", "INTEGER", true, "Count of RESCHEDULED events; not new appointments"),
      field("attributed_cso_id", "STRING", false, "Versioned attribution result"),
      field("attribution_rule_version", "STRING", true, "Approved appointment ownership rule"),
      field("audit_status", "ENUM", true, "CURRENTLY_VERIFIED, PROPOSED or PAUSED_PENDING_VERIFICATION"),
    ],
  },
  {
    name: "Fact_Payment_Attribution",
    layer: "LINK",
    authority: "Aoikumo + approved attribution rule",
    grain: "One net payment event with one signup attribution decision",
    primaryKey: "payment_event_id",
    status: "PROPOSED",
    fields: [
      field("payment_event_id", "STRING", true, "Link to Raw_Payment"),
      field("payment_id", "STRING", true, "Aoikumo payment identifier"),
      field("customer_id", "STRING", true, "Aoikumo customer identifier"),
      field("appointment_id", "STRING", false, "Linked appointment when proven"),
      field("net_amount", "DECIMAL(12,2)", true, "Posted amount net of void/reversal/refund events"),
      field("currency", "CHAR(3)", true, "ISO currency code"),
      field("signup_flag", "BOOLEAN", true, "Payment-backed signup under approved rule"),
      field("attributed_cso_id", "STRING", false, "CSO after approved payment attribution"),
      field("attribution_rule_version", "STRING", true, "Versioned payment/signup rule"),
      field("audit_status", "ENUM", true, "CURRENTLY_VERIFIED, PROPOSED or PAUSED_PENDING_VERIFICATION"),
    ],
  },
  {
    name: "Daily_CSO_KPI",
    layer: "KPI",
    authority: "Derived from verified facts only",
    grain: "One business date, CSO, metric and rule version",
    primaryKey: "daily_kpi_id",
    status: "PROPOSED",
    fields: [
      field("daily_kpi_id", "STRING", true, "Date + CSO + metric + rule version"),
      field("business_date_sgt", "DATE", true, "Singapore business date"),
      field("cso_id", "STRING", true, "Approved CSO identifier"),
      field("metric_code", "ENUM", true, "BLAST, APPOINTMENT, ATTENDANCE, SIGNUP or PAYMENT"),
      field("metric_value", "DECIMAL(14,2)", true, "Count or amount at declared grain"),
      field("currency", "CHAR(3)", false, "Required only for monetary metrics"),
      field("rule_version", "STRING", true, "KPI definition version"),
      field("quality_gate", "ENUM", true, "PASS, BLOCK, WAITING, STALE or NO_DATA"),
      field("source_row_count", "INTEGER", true, "Fact rows supporting the metric"),
      field("generated_at_utc", "DATETIME_UTC", true, "Deterministic build time"),
    ],
  },
  {
    name: "Dashboard_Control",
    layer: "KPI",
    authority: "Dashboard audit controls",
    grain: "One dashboard section and as-of checkpoint",
    primaryKey: "control_id",
    status: "PROPOSED",
    fields: [
      field("control_id", "STRING", true, "Section + source + as-of checkpoint"),
      field("section_code", "ENUM", true, "TODAY, MRL, FLOMMIE, AUTOMATION or SOURCES"),
      field("source_system", "STRING", true, "System of record"),
      field("source_as_of_utc", "DATETIME_UTC", false, "Business source timestamp"),
      field("retrieved_at_utc", "DATETIME_UTC", true, "Read timestamp"),
      field("quality_gate", "ENUM", true, "PASS, BLOCK, WAITING, STALE or NO_DATA"),
      field("evidence_status", "ENUM", true, "CURRENTLY_VERIFIED, HISTORICALLY_VERIFIED, PROPOSED or PENDING_VERIFICATION"),
      field("record_count", "INTEGER", true, "Supporting records after filters"),
      field("formula_version", "STRING", false, "Formula or transformation version"),
      field("evidence_reference", "STRING", true, "Workbook range, execution ID or source record"),
    ],
  },
];
