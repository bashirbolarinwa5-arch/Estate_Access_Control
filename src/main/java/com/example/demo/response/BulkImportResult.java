package com.example.demo.response;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/*
 * Response shape for the CSV/Excel import endpoints.
 *
 * Rows are processed one by one: a bad row never rolls back
 * the good ones. The result mirrors the incoming order so the
 * browser can line it up with the spreadsheet.
 *
 * Resident imports never carry a password. Every created row is
 * PENDING_ACTIVATION and activates itself through the emailed link.
 * temporaryPassword is only used by the security-personnel import,
 * where guards have no self-service onboarding.
 */
public class BulkImportResult {

    private int created;

    private int failed;

    private int pendingActivation;

    private List<RowResult> results = new ArrayList<>();

    @Data
    public static class RowResult {

        private int row;

        private boolean success;

        private String username;

        private String fullName;

        private String houseNumber;

        /* PENDING_ACTIVATION for self-service resident accounts. */
        private String activationStatus;

        /* Security-personnel imports only. Never set for residents. */
        private String temporaryPassword;

        private String reason;

    }

    public void add(RowResult row) {

        results.add(row);

        if (row.isSuccess()) {

            created++;

            if ("PENDING_ACTIVATION".equals(row.getActivationStatus())) {
                pendingActivation++;
            }

        } else {
            failed++;
        }
    }

    public int getCreated() {
        return created;
    }

    public int getFailed() {
        return failed;
    }

    public int getPendingActivation() {
        return pendingActivation;
    }

    public List<RowResult> getResults() {
        return results;
    }

    public void setResults(List<RowResult> results) {
        this.results = results;
    }
}
