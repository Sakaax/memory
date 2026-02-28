# MEMORY — Technical Architecture

## System Overview

Memory operates through a persistent daemon named:

memoryd

memoryd acts as the cognitive authority for the user.

---

## High Level Architecture

User Environment
↓
Connectors
↓
Memory API
↓
Memory Core
↓
Storage Engine

---

## Components

### Memory Daemon (memoryd)

Responsibilities:

- memory storage
- semantic indexing
- retrieval
- permission enforcement
- synchronization

Runs locally or on private infrastructure.

Default endpoint:

http://localhost:8765

---

### Memory Core

Handles:

- memory creation
- classification
- scoring
- retrieval logic

---

### Storage Layer

Stores:

- structured memory objects
- embeddings
- metadata
- timestamps

Recommended stack:

- PostgreSQL
- vector extension
- local cache

---

### Connectors

#### CLI Connector

Provides terminal interaction.

Commands:

memory remember
memory recall
memory search
memory status

---

#### AI Connector

Acts as proxy layer.

Functions:

- inject contextual memory into prompts
- store validated outputs
- normalize AI interaction

---

#### Web Connector

JavaScript SDK enabling browser integration.

---

#### Mobile Connector (Future)

Acts as identity node and permission authority.
