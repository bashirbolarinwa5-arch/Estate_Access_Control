package com.example.demo.service;

import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.Locale;

/*
 * Creates the two credentials a bulk-imported account needs:
 * a unique username and a temporary password.
 *
 * The password is meant to be read from a phone screen and
 * typed once, so it avoids look-alike characters (I, O, l, o,
 * 0, 1) and is grouped in blocks of four.
 */
@Service
public class CredentialService {

    private static final String ALPHABET =
            "ABCDEFGHJKMNPQRSTUVWXYZ"
                    + "abcdefghjkmnpqrstuvwxyz"
                    + "23456789";

    private static final int PASSWORD_LENGTH = 12;

    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;

    public CredentialService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String generateTemporaryPassword() {

        StringBuilder password = new StringBuilder(PASSWORD_LENGTH + 2);

        for (int index = 0; index < PASSWORD_LENGTH; index++) {

            if (index == 4 || index == 8) {
                password.append('-');
            }

            password.append(
                    ALPHABET.charAt(
                            random.nextInt(ALPHABET.length())
                    )
            );
        }

        return password.toString();
    }

    /*
     * "Adaeze Okonkwo" in house "12B" becomes adaeze.12b,
     * then adaeze.12b2, adaeze.12b3 ... until it is free.
     */
    public String generateUsername(
            String fullName,
            String houseNumber) {

        String namePart = firstToken(fullName);

        if (namePart.isEmpty()) {
            namePart = "user";
        }

        String housePart = alphanumeric(houseNumber);

        String base = housePart.isEmpty()
                ? namePart
                : namePart + "." + housePart;

        if (base.length() > 40) {
            base = base.substring(0, 40);
        }

        if (!userRepository.existsByUsername(base)) {
            return base;
        }

        for (int suffix = 2; suffix < 10000; suffix++) {

            String candidate = base + suffix;

            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
        }

        throw new RuntimeException(
                "Could not generate a unique username"
        );
    }

    private String firstToken(String value) {

        if (value == null || value.isBlank()) {
            return "";
        }

        String normalised = Normalizer
                .normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();

        String[] parts = normalised.split("\\s+");

        for (String part : parts) {

            String cleaned = part.replaceAll("[^a-z0-9]", "");

            if (!cleaned.isEmpty()) {
                return cleaned;
            }
        }

        return "";
    }

    private String alphanumeric(String value) {

        if (value == null) {
            return "";
        }

        return Normalizer
                .normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }
}
