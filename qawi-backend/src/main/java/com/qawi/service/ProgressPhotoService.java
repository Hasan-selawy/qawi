package com.qawi.service;

import com.qawi.dto.CreateProgressPhotoRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.ProgressPhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProgressPhotoService {

    private final ProgressPhotoRepository photoRepository;
    private final AccessGuard accessGuard;

    @Transactional
    public ProgressPhoto addPhoto(CreateProgressPhotoRequest req, String memberEmail) {
        User member = accessGuard.loadUserByEmail(memberEmail);
        return photoRepository.save(ProgressPhoto.builder()
                .memberId(member.getId())
                .photoUrl(req.getPhotoUrl())
                .caption(req.getCaption())
                .takenAt(req.getTakenAt())
                .build());
    }

    @Transactional(readOnly = true)
    public List<ProgressPhoto> getByMember(UUID memberId, String callerEmail) {
        accessGuard.assertCanAccessMember(callerEmail, memberId);
        return photoRepository.findByMemberIdOrderByTakenAtDesc(memberId);
    }

    @Transactional
    public void deletePhoto(UUID photoId, String memberEmail) {
        User member = accessGuard.loadUserByEmail(memberEmail);
        ProgressPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new AppException("Photo not found", "الصورة غير موجودة", HttpStatus.NOT_FOUND));
        if (!photo.getMemberId().equals(member.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }
        photoRepository.delete(photo);
    }
}
