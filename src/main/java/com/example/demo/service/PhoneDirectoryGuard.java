package com.example.demo.service;

import com.example.demo.repository.ResidentRepository;
import com.example.demo.repository.SecurityRepository;
import org.springframework.stereotype.Service;

/*
 * One phone number, one account per estate.
 *
 * A phone number is how residents and security officers sign in and how
 * "First time here? Create password" finds them, so it has to identify a
 * single person inside an estate. The check spans both residents and
 * security officers: a security officer's phone must not collide with a
 * resident's phone in the same estate either, otherwise activation by
 * phone would resolve the wrong account.
 *
 * Numbers from different estates never collide.
 */
@Service
public class PhoneDirectoryGuard {

    private final ResidentRepository residents;
    private final SecurityRepository securities;

    public PhoneDirectoryGuard(
            ResidentRepository residents,
            SecurityRepository securities) {

        this.residents = residents;
        this.securities = securities;
    }

    /*
     * residentId / securityId identify the row being edited so it does not
     * collide with itself. Pass null when creating.
     */
    public void assertAvailable(
            Long estateId,
            String phoneNumber,
            Long residentId,
            Long securityId) {

        if (estateId == null || phoneNumber == null || phoneNumber.isBlank()) {
            return;
        }

        boolean takenByResident = residentId == null
                ? residents.existsByEstateIdAndPhoneNumber(estateId, phoneNumber)
                : residents.existsByEstateIdAndPhoneNumberAndIdNot(
                        estateId, phoneNumber, residentId);

        boolean takenBySecurity = securityId == null
                ? securities.existsByPhoneNumberAndUserEstateId(
                        phoneNumber, estateId)
                : securities.existsByPhoneNumberAndUserEstateIdAndIdNot(
                        phoneNumber, estateId, securityId);

        if (takenByResident || takenBySecurity) {
            throw new RuntimeException(
                    "Phone number " + phoneNumber
                            + " already belongs to another account in this estate");
        }
    }
}
