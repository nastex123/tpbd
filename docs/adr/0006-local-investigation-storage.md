# ADR 0006: Local Investigation Storage

**Status:** Accepted

## Context

Users need to return to an investigation without storing credentials or depending on a remote service.

## Decision

Store the investigation's name, variable identifier, locations, time range, timestamp, and fixed NASA POWER source reference in a versioned localStorage key. Validate each record on read and before writing, discard unrecognized properties, and report storage errors without replacing unreadable data.

## Consequences

Investigations persist on the current device and do not require a backend. They are stored as ordinary local application data, not encrypted secrets. Development and compiled Electron have different origins and therefore separate stores. The UI restores queries and reloads data rather than saving scientific results as if they were immutable.
