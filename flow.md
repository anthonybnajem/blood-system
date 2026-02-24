🟢 Main Operational Flow (Daily Lab Work)
Login
  ↓
Dashboard
  ↓
Search Patient
   ├─ Select existing patient
   └─ Create new patient
  ↓
Create Visit / Case
  ↓
Select Departments
  ↓
Select Panels / Tests
  ↓
Enter Results (dynamic form)
  ↓
Save Draft (optional → exit & resume later)
  ↓
Mark Ready
  ↓
Review & Validation
  ↓
Verify & Lock
  ↓
Preview Report (empty inputs hidden)
  ↓
Print / Export PDF
  ↓
Visit saved → feeds Last Result for future visits
🟣 Resume Draft Flow
Dashboard
  ↓
Open Draft Visits
  ↓
Select Visit
  ↓
Enter Results
  ↓
Mark Ready
🔵 Patient History Flow
Search Patient
  ↓
Open Patient Profile
  ↓
View Visit History
  ↓
Select Visit
   ├─ View Report
   ├─ Compare with Previous
   └─ Trend (optional)
🟡 Admin — Test Catalog Flow (Dynamic Excel Engine)
Admin
  ↓
Catalog Manager
  ↓
Select Department
  ↓
Select Panel
  ↓
Manage Tests
   ├─ Add Test
   ├─ Rename Test
   ├─ Change Unit
   ├─ Change Type
   ├─ Reorder (drag)
   └─ Activate / Deactivate
🟠 Admin — Reference Range Flow (Norma)
Admin
  ↓
Reference Range Manager
  ↓
Select Test
  ↓
Add / Edit Range
   ├─ Gender
   ├─ Age range
   ├─ Unit
   ├─ Range text
   └─ Critical thresholds
🔴 Verification Flow (Safety Flow)
Results Entered
  ↓
Mark Ready
  ↓
Reviewer opens visit
  ↓
Check flagged / missing / abnormal
  ↓
Verify & Lock
  ↓
Report becomes immutable
🟤 Printing Flow (Clean Output Logic)
Open Verified Visit
  ↓
Preview Report
  ↓
System hides empty rows
  ↓
System hides empty panels
  ↓
Print / Export PDF
  ↓
Mark Printed
⚫ Unlock / Correction Flow (Rare)
Admin opens Verified Visit
  ↓
Unlock Report (audit logged)
  ↓
Edit Result
  ↓
Re-Verify
🧪 Culture + Antibiogram Flow
Select Culture Panel
  ↓
Enter Culture Result Text
  ↓
Add Organism (optional)
  ↓
Enter Antibiogram rows
   ├─ Antibiotic
   ├─ Result (S/R/I)
   ├─ MIC (optional)
  ↓
Save / Verify
💾 Backup / Safety Flow (Offline critical)
Admin
  ↓
Backup
   ├─ Automatic scheduled
   └─ Manual backup
  ↓
Restore (if needed)
⭐ Core UX Principle Summary (what user feels)
Fast entry
Few clicks
Excel-like editing
No empty noise in reports
Safe verification step
History always visible
Admin controls structure without developers