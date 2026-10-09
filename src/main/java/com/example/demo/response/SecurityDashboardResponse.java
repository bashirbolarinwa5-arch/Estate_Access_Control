package com.example.demo.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SecurityDashboardResponse {

    private long totalResidents;
    private long todayVisits;
    private long pendingVisits;
    private long checkedInVisitors;
    private long checkedOutVisitors;

}