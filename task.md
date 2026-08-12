# Admin, VA, Super Admin & Activity Tracking Requirements

## 1. Workload / Patient Appointment Visibility

### Admin

- Admin can view all patient appointment records.
- Admin can view appointments assigned to any VA.
- Admin can access the complete workload/pipeline.
- Admin can reassign patients/appointments between VAs.
- Admin can edit appointment dates.
- Admin can open and update patient information.

### VA

- VA can view only patients and appointments assigned to their own account.
- VA cannot view another VA's assigned patient/appointment list.
- VA cannot access or modify workload belonging to another VA unless explicitly permitted by the system rules.
- VA should only see relevant pipeline records assigned to them.

### Super Admin

- Super Admin has complete system-wide visibility.
- Super Admin can view all admins, VAs, patients, appointments, workload, pipeline, and activities.
- Super Admin has administrative authority over Admin and VA accounts.

---

# 2. Activity / Audit Tracking

The system must maintain a centralized activity/audit log.

Activity tracking should NOT be limited to patient modal/card actions.

Every important user/system action should be recorded.

### Authentication Activities

Track:

- User login
- Failed login attempt
- User logout
- Password change
- Password reset
- Account activation/deactivation

### Profile Activities

Track:

- Profile update
- Name update
- Email update
- Profile information changes
- Role changes

### Patient Activities

Track:

- Patient created
- Patient information updated
- Patient modal information changed
- Patient reassigned
- Patient status changed
- Patient appointment updated
- Patient appointment date changed

### Appointment Activities

Track:

- Appointment date update / or patient info chnage 

### Report Activities

Track:

- Report exported
- Export type
- Exported data scope
- Exported by which user
- Export timestamp

### User Management Activities

Track:

- User created
- User deleted
- User role changed
- User activated/deactivated
- User profile updated

### Activity Log Data

Each activity should ideally contain:

- Activity ID
- User ID
- User name
- User role
- Action type
- Target entity
- Target entity ID
- Previous value, when applicable
- New value, when applicable
- Description
- Timestamp
- IP/device information if supported

Example:

`Admin Habib reassigned Patient #1045 from VA John to VA Sarah.`

---

# 3. Pipeline Board

The pipeline board must respect role-based access control.

### Admin

- Can view the complete pipeline.
- Can view all patients.
- Can view all appointments.
- Can view assignments across all VAs.
- Can reassign patients.
- Can update patient/appointment information.
- Can edit appointment dates.

### VA

- Can view only their assigned patients.
- Can view only their assigned appointments.
- Can view only relevant pipeline stages for their assigned patients.
- Cannot access another VA's workload.

### Super Admin

- Can view the complete pipeline across the entire system.
- Can manage all assignments.
- Can manage Admin and VA access.

---

# 4. Role-Based Access Control

The system should enforce role validation at both:

1. Frontend/UI level
2. Backend/API level

Frontend restrictions alone are NOT sufficient.

Every protected API endpoint must validate:

- Authentication
- User identity
- User role
- Resource ownership
- Permission to perform the requested action

Roles:

- Super Admin
- Admin
- VA

---

# 5. Role Permissions

## Super Admin

Super Admin is the highest-level administrative account.

Super Admin can:

- View all data
- View all users
- Add Admin
- Add VA
- Delete Admin
- Delete VA
- Update user information
- Change user roles where permitted
- View all patients
- View all appointments
- Reassign patients
- Edit appointment dates
- View all activity logs
- Export reports
- Manage the entire pipeline

### Super Admin Protection

The Super Admin account must be strictly protected.

Rules:

- Super Admin cannot be deleted.
- Super Admin cannot delete their own account.
- No Admin can delete Super Admin.
- No VA can delete Super Admin.
- Super Admin cannot be removed through the normal user-management interface.
- The system should prevent deletion at the backend/database authorization level as well.
- The application must always maintain at least one valid Super Admin account.

The Super Admin should effectively be treated as a protected system-level account.

---

# 6. Admin

Admin can:

- View all patients
- View all appointments
- View all VA workloads
- View complete pipeline
- Add patients
- Update patients
- Reassign patients
- Edit appointment dates
- Export reports
- View activity logs
- Add users where permitted
- Manage VA accounts where permitted

### Admin Restrictions

- Admin cannot delete Super Admin.
- Admin cannot delete their own currently logged-in account.
- Admin cannot access or perform Super Admin-only operations.
- Admin cannot bypass backend role validation.

---

# 7. VA

VA can:

- View their assigned patients
- View their assigned appointments
- Update permitted patient information
- Perform actions allowed by the patient workflow
- View relevant activities for their assigned records

VA cannot:

- View another VA's workload.
- View another VA's assigned patient list.
- Delete Admin.
- Delete Super Admin.
- Delete their own account.
- Change their role to Admin/Super Admin.
- Access Super Admin functionality.
- Access unrestricted system-wide reports.

---

# 8. User Management

The User Management section should provide:

- User list
- User name
- Email
- Role
- Status
- Created date
- Last login
- Actions

Available actions should depend on the current user's role.

### Add User

Allow authorized users to create:

- Admin
- VA

The system should record:

`User created → Who created → Role assigned → Timestamp`

### Delete User

User deletion must follow role restrictions.

Super Admin:

- Can delete Admin.
- Can delete VA.
- Cannot delete Super Admin.
- Cannot delete their own account.

Admin:

- Can delete permitted VA accounts.
- Cannot delete Super Admin.
- Cannot delete their own account.
- Cannot delete another Admin unless explicitly permitted by the final authorization matrix.

VA:

- Cannot delete users.

---

# 9. Two-Step Delete Confirmation

Deleting an Admin or VA must NOT happen with a single click.

Use a two-step confirmation modal.

### Step 1 — Warning Confirmation

Show:

- User name
- User email
- User role
- Warning that deletion is permanent
- Impact of deletion
- Cancel button
- Continue button

Example:

`You are about to permanently delete Sarah Williams (VA). This action cannot be undone.`

User selects:

`Continue`

### Step 2 — Typed Confirmation

Show a second confirmation modal.

Require the authorized user to type:

`DELETE`

The delete button remains disabled until the exact confirmation text is entered.

Example:

`Type DELETE to permanently remove this account.`

Only after the correct text is entered:

`DELETE ACCOUNT`

becomes enabled.

### Backend Protection

The two-step modal is only a UX safeguard.

The backend must independently verify:

- Current user's authentication
- Current user's role
- Target user's role
- Whether the target is Super Admin
- Whether the target is the current logged-in user
- Whether deletion is allowed

---

# 10. Self-Account Deletion Protection

A logged-in user must never be able to delete their own account through the user-management interface.

Backend rule:

`targetUserId === currentUserId → DELETE DENIED`

This must apply even if someone manually calls the API.

Frontend should also hide/disable the delete action for the current user.

---

# 11. Super Admin Deletion Protection

Super Admin deletion must be protected at multiple layers.

### UI

- Hide/delete button for Super Admin.
- Show protected account indicator.

### API

Reject deletion requests targeting Super Admin.

### Database / Service Layer

Add an additional protection so that application bugs cannot accidentally remove the Super Admin account.

Example business rule:

`target.role === SUPER_ADMIN → DELETE DENIED`

This protection must apply regardless of whether the request originates from:

- Admin dashboard
- API
- Direct API request
- Automated action
- Another administrative interface

---

# 12. Patient Reassignment

When a patient is reassigned:

Record:

- Patient ID
- Previous VA
- New VA
- Changed by
- Timestamp
- Reason, if required

Example activity:

`Patient #1045 reassigned from Sarah to John by Admin Habib.`

The pipeline and workload views should immediately reflect the new assignment.

---

# 13. Appointment Date Editing

Authorized users can edit appointment dates.

When an appointment date changes, record:

- Appointment ID
- Patient ID
- Previous date
- New date
- Changed by
- Timestamp

Example:

`Appointment for Daniel Osei changed from Aug 15, 2026 to Aug 18, 2026 by Admin Habib.`

---

# 14. Patient Information Updates

When patient information changes, record:

- Patient ID
- Field changed
- Previous value
- New value
- Changed by
- Timestamp

Example:

`Patient phone number updated by Admin Habib.`

Sensitive values should be handled carefully in audit logs and should not be unnecessarily exposed.

---

# 15. Report Export Tracking

Every CSV/Excel/report export should create an activity.

Track:

- User
- Role
- Report type
- Data scope
- Number of records exported
- Export format
- Timestamp

Example:

`Admin Habib exported 152 appointment records as XLSX.`

---

# 16. Global Authorization Principle

The application should follow this rule:

`Authentication → Role Authorization → Resource Ownership → Action Permission`

Example:

VA requests patient #1050.

System checks:

1. Is the user authenticated?
2. Is the user a VA?
3. Is patient #1050 assigned to this VA?
4. Does this VA have permission to perform the requested action?
5. If yes → allow.
6. If no → return authorization error.

This must be enforced server-side.

---

# 17. Final Permission Hierarchy

| Feature                                                                                               | Super Admin | Admin          | VA                                    |
| ----------------------------------------------------------------------------------------------------- | ----------- | -------------- | ------------------------------------- |
| View all patients                                                                                     | Yes         | Yes            | No                                    |
| View assigned patients                                                                                | Yes         | Yes            | Yes                                   |
| View all workload calender slots                                                                      | Yes         | Yes            | No                                    |
| View assigned appointments slot                                                                       | Yes         | Yes            | Yes                                   |
| View all pipeline                                                                                     | Yes         | Yes            | No                                    |
| View own pipeline - assigned patient and unassingmnt patient - but do not show other va assigned user | Yes         | Yes            | Yes                                   |
| Reassign patients                                                                                     | Yes         | Yes            | No                                    |
| Edit appointment date - assiginend va and admin                                                       | Yes         | Yes            | Based on permission                   |
| Add patient                                                                                           | Yes         | Yes            | Based on permission                   |
| Update patient - info - only assigned va and admin                                                    | Yes         | Yes            | Based on permission                   |
| Export reports                                                                                        | Yes         | Yes            | Restricted                            |
| View activity logs                                                                                    | Yes         | Yes            | only own activity also can do filter  |
| Add Admin                                                                                             | Yes         | Restricted     | No                                    |
| Add VA                                                                                                | Yes         | Yes            | No                                    |
| Delete Admin                                                                                          | Yes         | No             | No                                    |
| Delete VA                                                                                             | Yes         | Yes/permission | No                                    |
| Delete own account                                                                                    | No          | No             | No                                    |
| Delete Super Admin                                                                                    | No          | No             | No                                    |
| Manage Super Admin                                                                                    | No          | No             | No                                    |
| Change own role                                                                                       | No          | No             | No                                    |

---

# 18. Critical Security Rules

These rules must be enforced on the backend, not only through UI visibility:

1. A user cannot delete their own account.
2. Super Admin cannot be deleted.
3. Admin cannot delete Super Admin.
4. VA cannot access another VA's patients.
5. VA cannot access another VA's appointments.
6. VA cannot access system-wide pipeline data.
7. VA cannot access unrestricted reports.
8. Users cannot modify their own role.
9. Users cannot elevate their own privileges.
10. Frontend-hidden actions must still be rejected by the API.
11. Every important mutation must create an audit/activity record.
12. Delete operations require explicit confirmation.
13. Admin/VA deletion requires the two-step confirmation flow.
14. Typed confirmation must require the exact word `DELETE`.
15. The backend must validate the target role before deletion.
16. The system must always retain a valid Super Admin account.
17. Authorization must be checked against the current authenticated user, not client-provided role information.
