package com.qawi.service;

import com.qawi.dto.CreateProgressPhotoRequest;
import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.ProgressPhotoRepository;
import com.qawi.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Transactional
    public ProgressPhoto addPhoto(CreateProgressPhotoRequest req, String memberEmail) {
        User member = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        return photoRepository.save(ProgressPhoto.builder()
                .memberId(member.getId())
                .photoUrl(req.getPhotoUrl())
                .caption(req.getCaption())
                .takenAt(req.getTakenAt())
                .build());
    }

    public List<ProgressPhoto> getByMember(UUID memberId) {
        return photoRepository.findByMemberIdOrderByTakenAtDesc(memberId);
    }

    @Transactional
    public void deletePhoto(UUID photoId, String memberEmail) {
        User member = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));

        ProgressPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new AppException("Photo not found", "الصورة غير موجودة", HttpStatus.NOT_FOUND));

        if (!photo.getMemberId().equals(member.getId())) {
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        }

        photoRepository.delete(photo);
    }
}
