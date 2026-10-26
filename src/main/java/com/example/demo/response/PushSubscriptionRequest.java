package com.example.demo.response;

public record PushSubscriptionRequest(String endpoint, String p256dh, String auth) {}
