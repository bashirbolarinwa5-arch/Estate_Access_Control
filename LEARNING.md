# EstateFlow — Engineering Academy

Your personal training log. One section per session. I grade quizzes and review homework.

## The contract

- **You answer first.** Every lesson ends with questions; you reply in your own words, I correct.
- **Predict before I reveal.** Wrong predictions are the most useful data we have.
- **Real code beats slides.** Every concept is taught against a file in this repo.
- **You keep this journal.** After each session, we add what you learned and what you got wrong.
- **"Pro" has a definition:** you can explain every line of the core request paths, build a feature end-to-end without me, debug production failures from logs, and defend your trade-offs.

## Roadmap (8 sessions + 2 assessments + capstone)

| # | Session | You will be able to… |
|---|---|---|
| 1 | Request lifecycle & JWT auth | Trace any request from browser to database; explain every line of JwtAuthenticationFilter + SecurityConfig |
| 2 | Spring Boot core | Explain controllers/services/repositories/DTOs, the 400 handler, transactions, and add an endpoint unaided |
| 3 | JPA & PostgreSQL | Model relationships, spot N+1 queries, write SQL, add a Flyway migration safely on production |
| 4 | React in this app | Explain components/hooks/context/routing; add a page + protected route + API call unaided |
| 5 | Full-stack feature | Ship a small feature end-to-end (design → backend → frontend → tests) |
| 6 | Security hardening | Threat-model the app; fix 401 vs 403, remove debug leaks, rate-limit login, review CORS/secrets |
| 7 | Testing & debugging | Write JUnit + MockMvc tests; read stack traces; break/fix drills |
| 8 | Production engineering | Docker, Caddy, Vercel, backups, monitoring, zero-downtime deploys, incident response |
| A1 | Assessment after S4 | Code-reading exam + quiz, graded like an interview |
| A2 | Assessment after S8 | Build a feature solo; I review like a senior reviewer |
| 🏁 | Capstone | One real improvement designed, built, tested and shipped to production by you |

## Session log

### Session 1 — Request lifecycle & JWT (in progress)
Topics: stateless auth, JWT anatomy, filter chain, SecurityContext, matcher order, 401 vs 403.
Quiz: pending.
Homework: pending.
