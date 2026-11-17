package com.example.demo.controller;

import com.example.demo.entity.Security;
import com.example.demo.entity.Visit;
import com.example.demo.response.ApiResponse;
import com.example.demo.response.BulkImportResult;
import com.example.demo.response.SecurityRequest;
import com.example.demo.service.SecurityService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/security")
@CrossOrigin(origins = "*")
public class SecurityController {

    private final SecurityService security;

    public SecurityController(
            SecurityService security) {

        this.security = security;
    }

    // CREATE SECURITY
    @PostMapping
    public Security createSecurity(
            @RequestBody SecurityRequest request) {

        Security securityPerson =
                new Security();

        securityPerson.setName(
                request.getName()
        );

        securityPerson.setPhoneNumber(
                request.getPhoneNumber()
        );

        securityPerson.setEmail(
                request.getEmail()
        );

        securityPerson.setShift(
                request.getShift()
        );

        /*
         * No password is passed: the officer sets one through the
         * activation link. Any password in the request is ignored.
         */
        return security.createSecurity(
                securityPerson,
                request.getUsername()
        );
    }

    // BULK CREATE SECURITY PERSONNEL
    @PostMapping("/bulk")
    public ApiResponse<BulkImportResult> createSecurities(
            @RequestBody List<SecurityRequest> requests) {

        if (requests.size() > 100) {
            throw new RuntimeException(
                    "Bulk imports are limited to 100 accounts per request"
            );
        }

        BulkImportResult result =
                security.createSecurities(requests);

        return new ApiResponse<>(
                true,
                "Bulk security creation finished",
                result
        );
    }

    // RESEND THE ACTIVATION EMAIL (ADMIN)
    /*
     * The admin never sees or shares a password. This simply asks the
     * server to re-send the single-use activation link to the officer's
     * address on record.
     */
    @PostMapping("/{id}/send-activation")
    public ApiResponse<java.util.Map<String, Object>> sendActivation(
            @PathVariable Long id) {

        return new ApiResponse<>(
                true,
                "Activation email processed",
                security.sendActivationLink(id)
        );
    }

    // GET ALL SECURITY
    @GetMapping
    public List<Security> getAllSecurity() {

        return security.getAllSecurity();
    }

    // GET SECURITY BY ID
    @GetMapping("/{id}")
    public Security getSecurityById(
            @PathVariable Long id) {

        return security.getSecurityById(id);
    }

    // UPDATE SECURITY
    @PutMapping("/{id}")
    public Security updateSecurity(
            @PathVariable Long id,
            @RequestBody Security updatedSecurity) {

        return security.updateSecurity(
                id,
                updatedSecurity
        );
    }

    // DELETE SECURITY
    @DeleteMapping("/{id}")
    public void deleteSecurity(
            @PathVariable Long id) {

        security.deleteSecurity(id);
    }

    // CHECK IN VISITOR
    @PostMapping("/check-in/{accessCode}")
    public Visit checkInVisitor(
            @PathVariable String accessCode) {

        return security.checkInVisitor(
                accessCode
        );
    }

    // CHECK OUT VISITOR
    @PostMapping("/check-out/{accessCode}")
    public Visit checkOutVisitor(
            @PathVariable String accessCode) {

        return security.checkOutVisitor(
                accessCode
        );
    }

}