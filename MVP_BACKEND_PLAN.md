# Thermoeye MVP Backend Plan

เอกสารนี้วางแผน backend/API สำหรับ Phase 1 MVP ของ Thermoeye โดยยังยึดหลักว่าเป็น clinical decision support และทุกผลต้องผ่าน doctor review ก่อน release report

## Scope

Phase 1 backend ควรรองรับ workflow นี้:

1. Login และ role-based session
2. Hospital tenant context
3. Case intake และ scan upload
4. Raw file quarantine
5. Consent purpose check
6. De-identification status
7. Image quality check job
8. Mock/baseline AI analysis job
9. Doctor review
10. Report preview/release
11. Append-only audit log

## Suggested Stack

- API: FastAPI + Python
- Database: PostgreSQL
- Object storage: S3-compatible storage หรือ MinIO สำหรับ local dev
- Queue: Redis + Celery หรือ RQ
- Auth/session: server-managed session cookie, MFA-ready in production
- Deployment: Docker Compose สำหรับ dev

## Core API Routes

### Auth

- `POST /auth/login`
  - input: email, password
  - output: session user, role, hospital
  - notes: production ต้องมี rate limit, secure cookie, MFA option

- `POST /auth/logout`
  - output: success
  - audit: `user.logout`

- `GET /me`
  - output: current user, role, hospital, permissions

### Cases

- `GET /cases`
  - query: status, risk_level, hospital_id, date range
  - output: paginated case queue
  - permission: hospital-scoped

- `GET /cases/{case_id}`
  - output: case detail, scan metadata, quality status, analysis result, review status
  - permission: hospital-scoped

- `POST /cases`
  - input: age, sex, scan_type, eye_side, consent flags
  - output: case_code
  - audit: `case.create`

### Uploads

- `POST /cases/{case_id}/uploads/presign`
  - output: upload URL/object key
  - notes: raw files go to quarantine bucket/prefix first

- `POST /cases/{case_id}/uploads/complete`
  - input: object key, checksum, metadata
  - output: scan record
  - side effect: enqueue de-identification and quality jobs
  - audit: `scan.upload_complete`

### Pipeline

- `POST /cases/{case_id}/quality-check`
  - internal/admin trigger for MVP
  - output: quality status, score, failure reason

- `POST /cases/{case_id}/analysis`
  - internal/admin trigger for MVP
  - output: risk score, risk level, confidence, metrics, model version

- `GET /cases/{case_id}/pipeline`
  - output: upload, quarantine, consent, de-id, quality, AI, review, report states

### Doctor Review

- `POST /cases/{case_id}/review`
  - input: decision, note, follow_up_window
  - output: review record
  - permission: doctor role
  - audit: `review.submit`

- `GET /cases/{case_id}/review`
  - output: latest review record and history

### Reports

- `GET /cases/{case_id}/report/preview`
  - output: report data model for frontend preview
  - notes: available before release but must show locked status if not approved

- `POST /cases/{case_id}/report/release`
  - input: review_id
  - output: report number, PDF object key
  - permission: doctor role
  - guard: only allowed when review decision is approved
  - audit: `report.release`

- `GET /cases/{case_id}/report/download`
  - output: signed URL or streamed PDF
  - audit: `report.download`

### Governance

- `GET /audit-log`
  - query: actor, target, action, date range
  - output: append-only events
  - permission: admin or hospital-scoped auditor

- `GET /model-registry/current`
  - output: model version, threshold version, release status, validation summary

## Minimal Data Model

### users

- id
- name
- email
- role
- hospital_id
- status
- created_at

### hospitals

- id
- name
- code
- plan
- status

### cases

- id
- case_code
- hospital_id
- age
- sex
- status
- created_by
- created_at

### consents

- id
- case_id
- screening_allowed
- research_allowed
- model_training_allowed
- expires_at

### scans

- id
- case_id
- scan_type
- eye_side
- device
- raw_object_key
- processed_object_key
- checksum
- uploaded_at

### quality_checks

- id
- scan_id
- status
- blur_score
- artifact_score
- resolution_score
- failure_reason
- created_at

### analysis_results

- id
- scan_id
- risk_score
- risk_level
- confidence
- vessel_density
- model_version
- threshold_version
- created_at

### reviews

- id
- case_id
- reviewer_id
- decision
- note
- follow_up_window
- approved_at
- created_at

### reports

- id
- case_id
- review_id
- report_number
- pdf_object_key
- release_status
- released_at

### audit_logs

- id
- hospital_id
- actor_id
- action
- target_type
- target_id
- ip_address
- user_agent
- created_at

## Security Boundaries

- Never expose raw object keys directly to the browser without signed URL controls.
- Keep raw uploads in quarantine until metadata and de-identification checks finish.
- Enforce hospital tenant isolation on every case, scan, review, report, and audit query.
- Doctor-only actions: submit review and release report.
- Append audit events for login, upload, view, review, report preview, report release, report download, and admin changes.
- Do not use production screening data for model training automatically.

## Background Jobs

- `deidentify_scan_metadata`
- `quality_check_scan`
- `run_mock_analysis`
- `generate_report_pdf`
- `sync_audit_export`

## Phase 1 Build Order

1. Auth/session mock backed by database users
2. Hospital-scoped case list/detail APIs
3. Upload presign + upload completion record
4. Quality check worker with rule-based mock scoring
5. Mock analysis worker returning deterministic risk result
6. Doctor review API
7. Report preview and release API
8. Audit log API
9. Docker Compose for API, PostgreSQL, Redis, and MinIO

## Non-Goals For Phase 1

- Real medical diagnosis
- Real AI model training
- PACS/DICOMweb integration
- FHIR integration
- Regulatory certification package
- Production identity provider integration
