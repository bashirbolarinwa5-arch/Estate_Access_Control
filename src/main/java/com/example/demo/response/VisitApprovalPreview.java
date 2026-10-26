package com.example.demo.response;

import java.time.LocalDate;

public record VisitApprovalPreview(String visitorName, String purpose, LocalDate visitDate,
                                   String houseNumber, String status) {}
