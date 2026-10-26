package com.example.demo.service;

/** Shared validation for Nigerian phone numbers entered in the app. */
public final class PhoneNumberValidator {
    private PhoneNumberValidator() {}

    public static String requireElevenDigits(String phoneNumber, String fieldName) {
        if (phoneNumber == null || !phoneNumber.trim().matches("[0-9]{11}")) {
            throw new IllegalArgumentException(fieldName + " must contain exactly 11 digits");
        }
        return phoneNumber.trim();
    }

    public static String requireElevenDigitsWhenPresent(String phoneNumber, String fieldName) {
        if (phoneNumber == null || phoneNumber.isBlank()) return phoneNumber;
        return requireElevenDigits(phoneNumber, fieldName);
    }
}
