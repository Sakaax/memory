# MEMORY — Security Model

## Threat Model

Memory contains sensitive cognitive data.

Compromise risk exceeds traditional application data.

---

## Security Principles

### Local by Default

Memory remains on user-controlled infrastructure.

### Zero Implicit Sharing

No automatic external transmission.

### Permission Scopes

Access must define scope:

- personal
- development
- professional
- system

---

## Authentication

All connectors authenticate via signed tokens.

Devices must be explicitly trusted.

---

## Encryption

Required:

- encryption at rest
- encrypted transport
- secure key storage

---

## AI Restrictions

AI systems:

- cannot access raw memory storage
- cannot persist memory automatically
- must request write permission

---

## User Control

User must be able to:

- inspect memory
- edit memory
- delete memory
- revoke device access
