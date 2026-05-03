package com.qawi.exception;

import com.qawi.dto.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handleAppException(AppException ex) {
        return ResponseEntity.status(ex.getStatus()).body(ErrorResponse.builder()
                .error(ex.getMessage())
                .messageAr(ex.getMessageAr())
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a));
        return ResponseEntity.badRequest().body(ErrorResponse.builder()
                .error("Validation failed")
                .messageAr("فشل التحقق من البيانات")
                .fields(fields)
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorResponse.builder()
                .error(ex.getMessage() != null ? ex.getMessage() : "Resource not found")
                .messageAr("العنصر غير موجود")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConflict(DataIntegrityViolationException ex) {
        String msg = ex.getMostSpecificCause().getMessage();
        boolean isDuplicate = msg != null && (msg.contains("duplicate") || msg.contains("unique"));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.builder()
                .error(isDuplicate ? "A record with these details already exists" : "Data conflict")
                .messageAr(isDuplicate ? "يوجد سجل بهذه البيانات بالفعل" : "تعارض في البيانات")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponse.builder()
                .error("Invalid email or password")
                .messageAr("البريد الإلكتروني أو كلمة المرور غير صحيحة")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuth(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponse.builder()
                .error("Unauthorized")
                .messageAr("غير مصرح")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ErrorResponse.builder()
                .error("Access denied")
                .messageAr("الوصول مرفوض")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ErrorResponse> handleNpe(NullPointerException ex) {
        log.error("Unexpected NullPointerException", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.builder()
                .error("An unexpected error occurred. Please try again.")
                .messageAr("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.")
                .timestamp(LocalDateTime.now())
                .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse.builder()
                .error("An unexpected error occurred")
                .messageAr("حدث خطأ غير متوقع")
                .timestamp(LocalDateTime.now())
                .build());
    }
}
