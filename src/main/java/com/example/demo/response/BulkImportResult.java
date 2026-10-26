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
 * temporaryPassword is present only when the server generated
 * one. Those accounts are forced to change it on first login.
 */
public class BulkImportResult {

    private int created;

    private int failed;

    private List<RowResult> results = new ArrayList<>();

    @Data
    public static class RowResult {

        private int row;

        private boolean success;

        private String username;

        private String fullName;

        private String houseNumber;

        private String temporaryPassword;

        private String reason;

    }

    public void add(RowResult row) {

        results.add(row);

        if (row.isSuccess()) {
            created++;
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

    public List<RowResult> getResults() {
        return results;
    }

    public void setResults(List<RowResult> results) {
        this.results = results;
    }
}
