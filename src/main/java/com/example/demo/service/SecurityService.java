package com.example.demo.service;

import com.example.demo.entity.Security;
import com.example.demo.repository.SecurityRepository;
import org.springframework.stereotype.Service;
import com.example.demo.entity.Visit;
import com.example.demo.service.VisitService;
import java.util.List;
@Service
public class SecurityService {
    private final SecurityRepository securityRepository;
    private final VisitService visitService;
    public SecurityService(
            SecurityRepository securityRepository,
            VisitService visitService) {

        this.securityRepository = securityRepository;
        this.visitService = visitService;
    }

        // CREATE SECURITY
        public Security createSecurity(Security security) {
            return securityRepository.save(security);
        }

        // GET ALL SECURITY
        public List<Security> getAllSecurity() {
            return securityRepository.findAll();
        }

        // GET SECURITY BY ID
        public Security getSecurityById(Long id) {
            return securityRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("security not found"));
        }

        // UPDATE SECURITY
        public Security updateSecurity(Long id, Security updatedSecurity) {

            Security existingSecurity = securityRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("security not found"));

            existingSecurity.setName(updatedSecurity.getName());
            existingSecurity.setPhoneNumber(updatedSecurity.getPhoneNumber());
            existingSecurity.setEmail(updatedSecurity.getEmail());
            existingSecurity.setPassword(updatedSecurity.getPassword());

            return securityRepository.save(existingSecurity);
        }

        // DELETE SECURITY
        public void deleteSecurity(Long id) {

            if (!securityRepository.existsById(id)) {
                throw new RuntimeException("security not found");
            }

            securityRepository.deleteById(id);
        }
    // CHECK IN VISITOR
    public Visit checkInVisitor(String accessCode) {
        return visitService.checkInVisitor(accessCode);
    }

    // CHECK OUT VISITOR
    public Visit checkOutVisitor(String accessCode) {
        return visitService.checkOutVisitor(accessCode);
    }
}

