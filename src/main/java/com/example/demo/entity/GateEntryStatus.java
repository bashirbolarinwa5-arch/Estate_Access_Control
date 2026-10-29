package com.example.demo.entity;

/** Outcome of a gate check-in that arrived through offline sync. */
public enum GateEntryStatus {
    /** The access code matched a visit and the visitor is checked in. */
    MATCHED,
    /** No matching visit yet, or the visit was not in a checkable state. */
    NEEDS_REVIEW,
    /** An administrator dismissed the entry without a match. */
    DISMISSED
}
