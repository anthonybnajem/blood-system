import Dexie from "dexie";

export type LabRole = "admin" | "reception" | "lab" | "reviewer";
export type VisitStatus = "draft" | "ready" | "verified" | "printed";
export type TestResultType = "number" | "text" | "select" | "boolean";
export type PatientGender = "Male" | "Female" | "Other" | "Unknown";
export type RangeGender = "Any" | "Male" | "Female";
export type AbnormalFlag =
  | "Normal"
  | "Low"
  | "High"
  | "CriticalLow"
  | "CriticalHigh";
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "unlock"
  | "verify"
  | "print";

export type LabUser = {
  userId: string;
  fullName: string;
  username: string;
  email?: string;
  role: LabRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Patient = {
  patientId: string;
  fullName: string;
  gender: PatientGender;
  dateOfBirth?: Date;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Visit = {
  visitId: string;
  patientId: string;
  caseNo: string;
  physicianName?: string;
  branch?: string;
  visitDate: Date;
  status: VisitStatus;
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  printedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Department = {
  departmentId: string;
  name: string;
  ordering: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Panel = {
  panelId: string;
  departmentId: string;
  name: string;
  ordering: number;
  printIfEmpty: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LabTest = {
  testId: string;
  panelId: string;
  testCode: string;
  displayName: string;
  resultType: TestResultType;
  allowedValues?: string[];
  defaultUnit?: string;
  decimalPrecision: number;
  printOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ReferenceRange = {
  rangeId: string;
  testId: string;
  gender: RangeGender;
  ageMin?: number;
  ageMax?: number;
  unit?: string;
  rangeText?: string;
  criticalLow?: number;
  criticalHigh?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LabResult = {
  resultId: string;
  visitId: string;
  testId: string;
  value?: string;
  unit?: string;
  rangeSnapshot?: string;
  abnormalFlag?: AbnormalFlag;
  enteredBy?: string;
  enteredAt: Date;
  updatedBy?: string;
  updatedAt: Date;
};

export type AuditLog = {
  auditId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeJson?: string;
  afterJson?: string;
  userId?: string;
  timestamp: Date;
  reason?: string;
};

class LabDatabase extends Dexie {
  users!: Dexie.Table<LabUser, string>;
  patients!: Dexie.Table<Patient, string>;
  visits!: Dexie.Table<Visit, string>;
  departments!: Dexie.Table<Department, string>;
  panels!: Dexie.Table<Panel, string>;
  tests!: Dexie.Table<LabTest, string>;
  referenceRanges!: Dexie.Table<ReferenceRange, string>;
  results!: Dexie.Table<LabResult, string>;
  auditLog!: Dexie.Table<AuditLog, string>;

  constructor() {
    super("lab_reporting_db");

    this.version(1).stores({
      users: "userId, username, email, role, active, createdAt, updatedAt",
      patients:
        "patientId, fullName, gender, dateOfBirth, phone, createdAt, updatedAt",
      visits:
        "visitId, patientId, caseNo, status, visitDate, createdBy, verifiedBy, verifiedAt, printedAt, createdAt, updatedAt",
      departments: "departmentId, name, ordering, active, createdAt, updatedAt",
      panels:
        "panelId, departmentId, name, ordering, printIfEmpty, active, createdAt, updatedAt",
      tests:
        "testId, panelId, testCode, resultType, printOrder, active, createdAt, updatedAt",
      referenceRanges:
        "rangeId, testId, gender, ageMin, ageMax, createdAt, updatedAt",
      results:
        "resultId, visitId, testId, enteredBy, enteredAt, updatedBy, updatedAt, abnormalFlag",
      auditLog: "auditId, entityType, entityId, action, userId, timestamp",
    });

    this.users = this.table("users");
    this.patients = this.table("patients");
    this.visits = this.table("visits");
    this.departments = this.table("departments");
    this.panels = this.table("panels");
    this.tests = this.table("tests");
    this.referenceRanges = this.table("referenceRanges");
    this.results = this.table("results");
    this.auditLog = this.table("auditLog");
  }
}

let labDb: LabDatabase | null = null;

export function getLabDb() {
  if (!labDb) {
    labDb = new LabDatabase();
  }
  return labDb;
}
