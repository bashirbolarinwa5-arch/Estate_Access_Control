package com.example.demo.exception;

import com.example.demo.response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;


   @RestControllerAdvice
    public class GlobalExceptionHandler {
       @ExceptionHandler(DataIntegrityViolationException.class)
       public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(
               DataIntegrityViolationException ex) {

           return ResponseEntity
                   .badRequest()
                   .body(new ApiResponse<>(
                           false,
                           "Cannot delete this resident because they have registered visitors.",
                           null
                   ));
       }

        @ExceptionHandler(RuntimeException.class)
        public ResponseEntity<ApiResponse<Void>> handleRuntimeException(
                RuntimeException exception) {

ApiResponse<Void> response = new ApiResponse<>(
                    false,
                    exception.getMessage(),
                    null
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(response);
        }
    }

