package com.qawi.controller;

import com.qawi.dto.CreateCoachNoteRequest;
import com.qawi.dto.UpdateCoachNoteRequest;
import com.qawi.entity.CoachNote;
import com.qawi.service.CoachNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class CoachNoteController {

    private final CoachNoteService noteService;

    @PostMapping
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<CoachNote> createNote(
            @Valid @RequestBody CreateCoachNoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(noteService.createNote(request, userDetails.getUsername()));
    }

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<List<CoachNote>> getNotesByMember(
            @PathVariable UUID memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(noteService.getNotesByMember(memberId, userDetails.getUsername()));
    }

    @PutMapping("/{noteId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<CoachNote> updateNote(
            @PathVariable UUID noteId,
            @Valid @RequestBody UpdateCoachNoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(noteService.updateNote(noteId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{noteId}")
    @PreAuthorize("hasRole('COACH')")
    public ResponseEntity<Void> deleteNote(
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UserDetails userDetails) {
        noteService.deleteNote(noteId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
