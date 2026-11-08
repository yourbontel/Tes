# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched (`/gradeRecords/{recordId}`, `/admins/{adminId}`) is strictly denied for both read and write operations.
2. **Authentication & Verification**: All write operations (`create`, `update`, `delete`) require an authenticated user (`request.auth != null`) with a verified email address (`request.auth.token.email_verified == true`).
3. **Path Variable Integrity**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates that `{recordId}` and `{adminId}` match `^[a-zA-Z0-9_\-]+$` with length between 1 and 128 characters.
4. **Strict Key & Schema Enforcement**: `isValidGradeRecord` enforces exact required keys (`hasAll`) and allowlisted keys (`hasOnly`) with zero shadow fields permitted. All strings have explicit `.size()` bounds, `nis` and `ownerId` match `^[a-zA-Z0-9_\-]+$`, and all 5 subject scores (`nahwu`, `shorof`, `durusulLughah`, `hadis`, `adab`) must be numbers in `[0, 100]`.
5. **Identity & Ownership Integrity**: On creation and update, `incoming().ownerId == request.auth.uid`. On update, `existing().ownerId == request.auth.uid`, `incoming().ownerId == existing().ownerId`, and `incoming().createdAt == existing().createdAt`.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on both creation and update.
7. **Secure List Queries (Query Enforcer)**: `allow list` on `/gradeRecords/{recordId}` enforces `existing().ownerId == request.auth.uid`, requiring client queries to filter by `where('ownerId', '==', auth.uid)`.
8. **Privilege Escalation Prevention**: Client writes to `/admins/{adminId}` are strictly forbidden (`allow create, update, delete: if false;`).

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Create)**: Creating a grade record with `ownerId: "victim_uid_999"` when authenticated as `"attacker_uid_111"`.
2. **Payload 2 (Unverified Email Write)**: Creating a grade record when `request.auth.token.email_verified == false`.
3. **Payload 3 (Shadow Field Injection on Create)**: Including an undeclared field `"isApproved": true` in a `/gradeRecords/{recordId}` create request.
4. **Payload 4 (Shadow Field Injection on Update)**: Updating a grade record with an extra undeclared field `"bonusPoints": 50`.
5. **Payload 5 (Score Out-of-Bounds High)**: Setting `nahwu: 105` (above maximum 100).
6. **Payload 6 (Score Out-of-Bounds Negative)**: Setting `shorof: -5` (below minimum 0).
7. **Payload 7 (Type Poisoning on Score)**: Setting `durusulLughah: "100"` (string instead of number).
8. **Payload 8 (String Size Overflow / Denial of Wallet)**: Setting `catatanUstadz` to a 1,000-character string (exceeding `maxLength: 500`).
9. **Payload 9 (NIS Regex Bypass)**: Setting `nis: "NIS/2026;<script>"` (violating `^[a-zA-Z0-9_\-]+$`).
10. **Payload 10 (Immutable `createdAt` Tampering on Update)**: Modifying `createdAt` during an `update` operation.
11. **Payload 11 (Forged Client Timestamp)**: Supplying a past or future timestamp where `updatedAt != request.time`.
12. **Payload 12 (Self-Assigned Admin Escalation)**: Attempting to create `/admins/attacker_uid_111` with `{"uid": "attacker_uid_111", "role": "admin"}`.
