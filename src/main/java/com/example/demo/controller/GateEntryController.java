package com.example.demo.controller;

import com.example.demo.entity.GateEntry;
import com.example.demo.entity.GateEntryStatus;
import com.example.demo.entity.Visit;
import com.example.demo.repository.GateEntryRepository;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.CurrentUserService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Admin review of offline gate entries that could not be matched to a visit.
 * Entries arrive through the normal offline sync queue.
 */
@RestController
@RequestMapping("/api/service/gate-entries")
public class GateEntryController {

    private final GateEntryRepository gateEntries;
    private final CurrentUserService currentUserService;

    public GateEntryController(
            GateEntryRepository gateEntries,
            CurrentUserService currentUserService) {
        this.gateEntries = gateEntries;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ApiResponse<List<GateEntryView>> list(
            @RequestParam(name = "status", required = false) String status) {

        GateEntryStatus wanted = parseStatus(status);

        List<GateEntryView> entries = gateEntries
                .findByEstateAndStatusOrderByOccurredAtDesc(
                        currentUserService.getRequiredEstate(), wanted)
                .stream()
                .map(GateEntryView::from)
                .toList();

        return new ApiResponse<>(true, "Gate entries retrieved successfully", entries);
    }

    @PostMapping("/{publicId}/dismiss")
    @Transactional
    public ApiResponse<GateEntryView> dismiss(@PathVariable UUID publicId) {

        GateEntry entry = gateEntries.findByPublicId(publicId)
                .orElseThrow(() -> new RuntimeException("Gate entry was not found."));

        var estate = currentUserService.getRequiredEstate();
        if (entry.getEstate() == null || !entry.getEstate().getId().equals(estate.getId())) {
            throw new RuntimeException("This gate entry does not belong to your estate.");
        }

        entry.setStatus(GateEntryStatus.DISMISSED);
        entry.setNote("Dismissed by an administrator.");
        GateEntry saved = gateEntries.save(entry);

        return new ApiResponse<>(true, "Gate entry dismissed", GateEntryView.from(saved));
    }

    private static GateEntryStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return GateEntryStatus.NEEDS_REVIEW;
        try {
            return GateEntryStatus.valueOf(status.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            return GateEntryStatus.NEEDS_REVIEW;
        }
    }

    public record GateEntryView(
            String publicId,
            String accessCode,
            String status,
            LocalDateTime occurredAt,
            LocalDateTime receivedAt,
            String note,
            String visitPublicId,
            String visitorName,
            String visitorPhone,
            String residentName,
            String houseNumber) {

        static GateEntryView from(GateEntry entry) {
            Visit visit = entry.getVisit();
            return new GateEntryView(
                    entry.getPublicId() == null ? null : entry.getPublicId().toString(),
                    entry.getAccessCode(),
                    entry.getStatus() == null ? null : entry.getStatus().name(),
                    entry.getOccurredAt(),
                    entry.getReceivedAt(),
                    entry.getNote(),
                    visit == null || visit.getPublicId() == null ? null : visit.getPublicId().toString(),
                    visit == null || visit.getVisitor() == null ? null : visit.getVisitor().getFullName(),
                    visit == null || visit.getVisitor() == null ? null : visit.getVisitor().getPhoneNumber(),
                    visit == null || visit.getResident() == null ? null : visit.getResident().getFullName(),
                    visit == null || visit.getResident() == null ? null : visit.getResident().getHouseNumber());
        }
    }
}
