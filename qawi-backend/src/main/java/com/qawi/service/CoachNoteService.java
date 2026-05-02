package com.qawi.service;

import com.qawi.dto.CreateCoachNoteRequest;
import com.qawi.dto.UpdateCoachNoteRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.CoachNoteRepository;
import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachNoteService {

    private final CoachNoteRepository noteRepository;
    private final UserRepository userRepository;

    @Transactional
    public CoachNote createNote(CreateCoachNoteRequest req, String coachEmail) {
        User coach = getUser(coachEmail);
        return noteRepository.save(CoachNote.builder()
                .coachId(coach.getId())
                .memberId(req.getMemberId())
                .note(req.getNote())
                .build());
    }

    public List<CoachNote> getNotesByMember(UUID memberId) {
        return noteRepository.findByMemberIdOrderByCreatedAtDesc(memberId);
    }

    @Transactional
    public CoachNote updateNote(UUID noteId, UpdateCoachNoteRequest req, String coachEmail) {
        User coach = getUser(coachEmail);
        CoachNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new AppException("Note not found", "الملاحظة غير موجودة", HttpStatus.NOT_FOUND));

        if (!note.getCoachId().equals(coach.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }

        note.setNote(req.getNote());
        note.setUpdatedAt(LocalDateTime.now());
        return noteRepository.save(note);
    }

    @Transactional
    public void deleteNote(UUID noteId, String coachEmail) {
        User coach = getUser(coachEmail);
        CoachNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new AppException("Note not found", "الملاحظة غير موجودة", HttpStatus.NOT_FOUND));

        if (!note.getCoachId().equals(coach.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }

        noteRepository.delete(note);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
