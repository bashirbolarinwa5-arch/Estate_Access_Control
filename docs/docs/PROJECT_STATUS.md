# EstateFlow - Project Status

## Mission

Transform Estate_Access_Control into a production-ready SaaS.

## Stack

- Java 17
- Spring Boot
- PostgreSQL
- React (planned)
- JWT
- Spring Security

## Completed

### Core Business Logic
- Resident CRUD
- Visitor CRUD
- Visit CRUD
- Access Code Generation
- Visitor Check-In
- Visitor Check-Out

### Authentication
- Role Enum
- User Entity
- UserRepository
- BCrypt Password Hashing
- Registration
- Login
- Wrong Password Handling
- JWT Generation
- JWT Validation
- extractUsername()
- isTokenValid()
- JwtService Tests Passed

### Database
- PostgreSQL Configured

## Current Sprint

### JWT Authentication Filter

Next Step:

Implement JwtAuthenticationFilter incrementally.

Focus on:

1. OncePerRequestFilter
2. Authorization Header Extraction
3. Bearer Token Extraction
4. JwtService Integration
5. SecurityContext Population
6. Endpoint Protection

## Architecture Decisions

- One User → One Role
- Role implemented as Enum
- Stateless JWT Authentication
- Username stored as JWT Subject
- Role stored as JWT Claim
- JWT Expiration: 24 Hours
- PostgreSQL chosen for production
- Monolithic Architecture

## Future

### Backend
- JwtAuthenticationFilter
- Role Authorization
- Protected Endpoints

### Frontend
- React UI
- Login Page
- Dashboard
- Resident Management
- Visitor Management

### Later
- AI Features
- QR Codes
- Notifications
- Deployment


✅ Registration
✅ BCrypt
✅ Login
✅ JWT Generation
✅ JWT Validation
✅ JwtAuthenticationFilter
✅ SecurityContext Population
✅ Protected Endpoint Verification

Current Sprint:

Role-Based Authorization