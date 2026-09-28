package com.example.demo.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.entity.Visitor;
import com .example.demo.entity.VisitorStatus;
import com.example.demo.entity.Resident;
import java.util.List;

public interface VisitorRepository extends JpaRepository<Visitor,Long> {


     Visitor findByPhoneNumber(String phoneNumber);

}
