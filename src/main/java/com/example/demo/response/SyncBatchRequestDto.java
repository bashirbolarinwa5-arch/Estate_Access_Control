package com.example.demo.response;

import java.util.List;

public record SyncBatchRequestDto(List<SyncCommandDto> mutations) {
}
