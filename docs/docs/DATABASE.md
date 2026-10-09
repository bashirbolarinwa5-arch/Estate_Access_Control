# Database Design

## Planned Entities

### User

- id
- username
- email
- password
- role

### Role

- id
- name

### Resident

- id
- firstName
- lastName
- phoneNumber
- houseNumber

### Visitor

- id
- fullName
- phoneNumber
- visitReason

### SecurityGuard

- id
- fullName
- employeeNumber

### VisitorPass

- id
- qrCode
- status
