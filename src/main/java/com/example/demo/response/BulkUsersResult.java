package com.example.demo.response;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/*
 * Response shape for bulk creation endpoints.
 *
 * Created keeps what actually succeeded (the saved entities);
 * failed keeps per-item failures so a 1000-row job does not
 * roll back everything because of one bad row.
 */
public class BulkUsersResult {

    private List<?> created = new ArrayList<>();

    private List<Map<String, String>> failed = new ArrayList<>();

    public BulkUsersResult() {
    }

    public BulkUsersResult(
            List<?> created,
            List<Map<String, String>> failed) {

        this.created = created;
        this.failed = failed;
    }

    public List<?> getCreated() {
        return created;
    }

    public void setCreated(List<?> created) {
        this.created = created;
    }

    public List<Map<String, String>> getFailed() {
        return failed;
    }

    public void setFailed(List<Map<String, String>> failed) {
        this.failed = failed;
    }

}
