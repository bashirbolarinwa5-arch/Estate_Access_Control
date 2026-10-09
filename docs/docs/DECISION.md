# Architectural Decisions

## 2026-09-28

Decision:
Continue using Estate_Access_Control instead of creating a new project.

Reason:
Existing codebase already contains domain knowledge and functionality.

---

Decision:
Use Java Spring Boot as backend.

Reason:
Existing experience and productivity.

---

Decision:
Single Monolith Architecture.

Reason:
Simple to develop and deploy.




Decision:
Use Role enum instead of Role entity.

Roles:

ROLE_ADMIN
ROLE_SECURITY
ROLE_RESIDENT

Reason:
Fixed role set.
Simpler implementation.
Faster delivery.
Can migrate to Role table later if required.




Decision:
Use stateless JWT authentication.

Claims:
- username
- role

Expiry:
24 hours

Reason:
Simple implementation suitable for V1.




Decision:

Phase 1 User Management is considered satisfied by:

- User Registration
- User Authentication
- Role Management
- Authorization

Administrative User CRUD is not part of Phase 1 unless explicitly required by project documentation.

Reason:

Avoid adding requirements that do not contribute directly to MVP delivery.


Decision:

User is the only authentication identity.

User:
- username
- password
- role

Resident:
- resident information only

Resident.password is deprecated and scheduled for removal after dependency verification.