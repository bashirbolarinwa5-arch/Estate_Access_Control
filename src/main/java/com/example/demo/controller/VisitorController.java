package com.example.demo.controller;

import com.example.demo.service.VisitorService;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import com.example.demo.entity.Visitor;
@RestController
@RequestMapping("/visitor")
@CrossOrigin(origins = "*")
public class VisitorController {
    private final VisitorService service;
    public VisitorController(VisitorService service){
        this.service = service;
    }
    // GET ALL VISITOR
    @GetMapping
    public List<Visitor> getAllVisitor(){
        return service.getAllVisitor();
    }

    // GET VISITOR BY ID
    @GetMapping("/{id}")
    public Visitor getById(@PathVariable Long id) {
        return service.getVisitorById(id);
    }

    // CREATE VISITOR
    @PostMapping("/resident/{residentId}")
    public Visitor createVisitor(@PathVariable Long residentId, @RequestBody Visitor visitor){
        return service.createVisitor(residentId,visitor);
    }

     // UPDATE VISITOR
    @PutMapping("/{id}")
        public Visitor updateVisitor(@PathVariable Long id, @RequestBody Visitor Visitor){

        return   service.updateVisitor(id,Visitor);

    }

    // DELETE VISITOR
    @DeleteMapping("/{id}")
    public void deleteVisitor(@PathVariable Long id){
        service.deleteVisitor(id);
    }



}