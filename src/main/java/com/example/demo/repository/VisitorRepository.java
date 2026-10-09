package com.example.demo.repository;

import com.example.demo.entity.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitorRepository extends JpaRepository<Visitor, Long> {

     List<Visitor> findByResidentId(Long residentId);

     List<Visitor> findByResidentUserUsername(String username);

     Visitor findByPhoneNumber(String phoneNumber);

}