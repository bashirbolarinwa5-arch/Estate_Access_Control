
package com.example.demo.repository;

import com.example.demo.entity.Estate;
import com.example.demo.entity.Resident;
import com.example.demo.entity.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {

     List<Visitor> findByResidentId(Long residentId);

     List<Visitor> findByResidentUserUsername(String username);

     Visitor findByPhoneNumber(String phoneNumber);

     Visitor findByPhoneNumberAndResident(
             String phoneNumber,
             Resident resident
     );

     // Estate isolation
     List<Visitor> findByEstate(Estate estate);
}
