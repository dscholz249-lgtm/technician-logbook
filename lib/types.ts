export type ActionType = "assign_training" | "add_employee";
export type ActionStatus = "pending" | "actioned" | "failed";

export interface QueueItem {
  id: number;
  type: ActionType;
  payload: string; // JSON — parse at render
  manager_phone: string;
  company_id: string;
  status: ActionStatus;
  actioned_by: string | null;
  actioned_note: string | null;
  created_at: number; // Unix ms
  actioned_at: number | null;
}

export interface LogbookEntry {
  id: number;
  employee_id: string | null;
  employee_name_raw: string;
  manager_phone: string;
  company_id: string;
  body: string;
  tags: string; // JSON array — parse at render
  source_message_id: number;
  created_at: number;
}

// Parsed payload shapes from the NLP layer
export interface AssignTrainingPayload {
  type: "assign_training";
  employee_name: string;
  certification_name: string;
}

export interface AddEmployeePayload {
  type: "add_employee";
  new_employee: {
    name: string;
    email: string;
    title: string;
  };
}
