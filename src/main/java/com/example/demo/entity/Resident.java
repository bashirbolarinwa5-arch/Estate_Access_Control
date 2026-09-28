package com.example.demo.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.List;
@Entity
@Data
public class Resident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "resident")
    @JsonManagedReference
    private List<Visitor> visitors;

    private String fullName;
    private String phoneNumber;
    private String houseNumber;
    private String email;
    @JsonIgnore
    private String password;

}
