1) Product goal

Build an offline lab reporting system that replaces Excel:

Enter results fast (CBC, Biochimie, Endocrine, Urine, Stool, Culture, Culture+ATB)

Print clean, professional reports with patient name and case info

Support dynamic tests: rename/add/remove/reorder, change unit, change normal range

Keep history + last result and audit log

Ensure empty fields never appear on printed reports

2) Non-negotiable rules (system behavior)
2.1 Dynamic configuration rules

Departments, panels, tests are not hardcoded

Admin can:

Rename tests/panels/departments

Add/remove tests

Change order (drag-drop)

Change unit defaults

Change normal ranges (including gender/age)

Change result input type (number/text/select/boolean)

Enable/disable (hide but keep historical data)

2.2 Printing rules (critical)

A test row prints only if result.value is not empty.

A panel prints only if it contains ≥ 1 printable row.

A department prints only if it contains ≥ 1 printable panel.

If “Last Result” column is enabled:

Use previous visit’s result for same patient + same test_code.

If no reference range exists:

Print — (configurable).

Range used for printing must be snapshotted into the result at time of verification/print, so older reports don’t change later.

2.3 Verification + locking

Status flow: Draft → Ready → Verified → Printed

Verified results are locked.

Only Admin can unlock (and unlock is audited).

2.4 Audit rules (legal/medical safety)

Every update to:

results

reference ranges

tests/panels/departments

patient demographics
must create an audit entry:

before → after

who

when

optional reason

3) Actors + permissions
Roles
Reception

Create/edit patients

Create visits/cases

View/print finalized reports (optional)

Cannot change reference ranges or test catalog

Lab Tech

Select panels/tests

Enter results

Save draft / mark ready

Cannot verify (optional policy)

Reviewer

Review results

Verify & lock

Print/export

Cannot edit test catalog (optional)

Admin

Everything

Test catalog manager

Reference ranges manager

Template/printing settings

Unlock verified report

User management

Full audit access

4) Data model (best practice for lab systems)
4.1 Patients

patient_id (PK)

full_name (required)

gender (Male/Female/Other/Unknown)

date_of_birth (optional but strongly recommended)

phone (optional)

notes (optional)

created_at

4.2 Visits / Cases

visit_id (PK)

patient_id (FK)

case_no (unique per lab/branch; auto but editable)

physician_name (optional)

branch/facility (optional)

visit_date

status (draft/ready/verified/printed)

created_by

verified_by

verified_at

printed_at

notes

4.3 Department / Panels / Tests (dynamic catalog)
Departments

department_id

name

ordering

active

Panels (Sections)

panel_id

department_id

name

ordering

print_if_empty (default false)

active

Tests

test_id

panel_id

test_code (stable internal key)

display_name (editable)

result_type (number/text/select/boolean)

allowed_values (for select)

default_unit

decimal_precision

print_order

active

4.4 Reference ranges (Norma)

range_id

test_id

gender (Any/Male/Female)

age_min / age_max (optional)

unit

range_text (e.g. “70–110”, “< 5”, “Negative”)

critical_low / critical_high (optional)

notes

4.5 Results (per visit)

result_id

visit_id

test_id

value (TEXT to support numeric+text)

unit (stored with result)

range_snapshot (TEXT stored with result at verify time)

abnormal_flag (Normal/Low/High/CriticalLow/CriticalHigh)

entered_by/entered_at

updated_by/updated_at

4.6 Audit log

audit_id

entity_type

entity_id

action (create/update/delete/unlock/verify/print)

before_json

after_json

user_id

timestamp

reason

5) System modules (what must exist)

Patient Management

Visit/Case Management

Test Selection & Data Entry

Review + Verify + Locking

Report Generator (PDF + Print Preview)

History + Last Result

Admin Catalog Manager (departments/panels/tests)

Reference Range Manager

Template Settings (per department)

User/Roles

Audit Viewer

Backup/Restore (offline critical)

6) Pages (detailed UX description)
Page 1 — Login

Fields

username/email

password

optional language
Features

role-based access

optional lockout policy

Page 2 — Dashboard

Widgets

New Visit (primary button)

Search Patient

Today’s Visits (tabs: Draft/Ready/Verified/Printed)

Quick metrics (optional)
Actions

open draft

open patient

print verified

Page 3 — Patients

List view

Search by name/phone/id

Patient table: Name | Gender | Age | Last visit | Actions
Patient profile

patient info (editable)

visit history list (with status)

button: “New Visit”

Page 4 — Create Visit / Case

Fields

Patient (select/create)

Case No (auto but editable)

Physician (optional)

Date (default today)

Branch (optional)

Notes
Next: Select Tests/Panels

Page 5 — Select Department & Panels

UI

Left: Departments list/tabs

Right: Panels with checkbox

Optional: test search box
Rules

Select panel → selects all tests inside

Optional “custom selection” mode to remove some tests
Next: Enter Results

Page 6 — Enter Results (Dynamic Form)

Layout

Left sidebar: panels navigation + completion % per panel

Main: table rows

Columns:

Test name

Result input

Unit (editable per row)

Normal Range (auto computed)

Last Result (optional column)

Flag indicator (auto)

Behaviors

Numeric input respects decimal precision

Dropdown uses allowed_values

Text supports “Négatif/Positif”, “Trace”, etc.

Auto highlight out-of-range (if numeric + range parseable)

“Hide empty rows” toggle for entry comfort

Save Draft always available

Actions

Save Draft

Mark Ready

Page 7 — Review & Validation

UI

Panel completion summary

“Out of range” list (click jumps to test row)

Optional “critical alert” list
Actions

Preview report

Verify & Lock (Reviewer)
Rules

Verification freezes reference ranges into range_snapshot

Page 8 — Report Preview / Print

Header

Patient Name

Case No

Physician

Date

Gender

Optional DOB/age, phone, branch

Content

Department titles

Panel titles

Table columns per template settings:

Test | Result | Unit | Range | Last Result

Print logic

show only rows with result not empty

omit empty panels
Actions

Print

Export PDF

Mark Printed

Share (optional: WhatsApp/email) (offline may only support save PDF)

Page 9 — Patient History

List

Visits table: date | case | status | verified by | printed
Visit details

open report

open results table

compare with previous visit (optional)
Trends (optional advanced)

select test → values over time

7) Admin Configuration (Excel-like dynamic engine)
Page 10 — Catalog Manager (Departments/Panels/Tests)

Left: Departments
Middle: Panels
Right: Tests list

For tests:

display name (editable)

type

default unit

decimals

allowed values (if select)

order (drag/drop)

active toggle

Actions:

add / duplicate / deactivate

move test between panels

import/export Excel (so you can manage quickly)

Page 11 — Reference Range Manager

Pick a test → manage ranges:

gender: Any/M/F

age range (optional)

unit

range expression text

critical thresholds

Rules:

allow multiple ranges

select best match by: gender + age + unit priority

Page 12 — Template / Printing Settings

Per department template options:

columns enable/disable

show last result yes/no

show range yes/no

show unit yes/no

header fields toggles

footer text

signature blocks (optional)

lab logo upload (optional)

Page 13 — Users & Roles

create users

role assignment

reset password

deactivate users

Page 14 — Audit Log Viewer

Filters:

date range

user

patient

case_no

entity type

action

View:

before/after diff

export audit log (optional)

8) UX flow diagrams
8.1 Main lab flow
Login
  ↓
Dashboard
  ↓
Patients (search/select) → (or add new)
  ↓
Create Visit/Case
  ↓
Select Panels/Tests
  ↓
Enter Results
  ↓
Save Draft (optional) → continue later
  ↓
Mark Ready
  ↓
Review
  ↓
Verify & Lock
  ↓
Preview (print hides empty)
  ↓
Print / Export PDF
  ↓
Saved in history (last result available next time)
8.2 Admin flow
Admin
  ↓
Catalog Manager (Departments → Panels → Tests)
  ↓
Reference Ranges (Norma)
  ↓
Template Settings
  ↓
User Roles
  ↓
Audit Viewer
9) Culture + Antibiogram (special structure)
Culture section

“Specimen / Sample type”

“Culture result text” (multi-line)

“Organism(s)” (optional table)

Antibiogram table

Rows:

Antibiotic name
Columns:

Result (dropdown): S / R / I

MIC (optional numeric)

Notes (optional)

Print rules:

Don’t print antibiotic row if empty

Print organism header only if at least 1 row printed

10) Offline database recommendation (best)
Single-PC lab:

SQLite (WAL mode) best: fast, simple, one file, easy backup

Multi-PC on local network:

PostgreSQL installed on one PC/server, others connect via LAN

Either way you must have:

Daily backup + manual backup button

Restore function

Backup encryption (optional but recommended)

11) “Best” acceptance criteria (what “done” means)

Admin can change test name/unit/range and it reflects in entry UI immediately.

Enter results and print report: only filled results appear.

Verify locks the report; later range edits do not change old reports.

Last Result shows correctly from previous visits.

Every edit creates an audit entry with before/after.

Import/export catalog to Excel works (so your staff can manage easily).

Works fully offline; PDF exports and printing works from local machine.