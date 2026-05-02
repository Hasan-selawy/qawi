package com.qawi.gym.service;

import com.qawi.gym.dto.request.GymRequest;
import com.qawi.gym.dto.response.GymResponse;
import com.qawi.gym.dto.response.PageResponse;
import com.qawi.gym.entity.Gym;
import com.qawi.gym.entity.enums.GymStatus;
import com.qawi.gym.exception.ConflictException;
import com.qawi.gym.exception.ResourceNotFoundException;
import com.qawi.gym.repository.GymRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GymService {

    private final GymRepository gymRepository;

    @Transactional
    public GymResponse createGym(GymRequest request, Long ownerId) {
        if (request.getEmail() != null && gymRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("A gym with this email already exists");
        }

        Gym gym = Gym.builder()
                .name(request.getName())
                .nameAr(request.getNameAr())
                .address(request.getAddress())
                .city(request.getCity())
                .country(request.getCountry() != null ? request.getCountry() : "SA")
                .email(request.getEmail())
                .phone(request.getPhone())
                .logoUrl(request.getLogoUrl())
                .maxMembers(request.getMaxMembers() != null ? request.getMaxMembers() : 500)
                .ownerId(ownerId)
                .build();

        return toResponse(gymRepository.save(gym));
    }

    @Transactional(readOnly = true)
    public GymResponse getGym(Long id) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gym", id));
        return toResponse(gym);
    }

    @Transactional(readOnly = true)
    public PageResponse<GymResponse> getAllGyms(Pageable pageable) {
        Page<GymResponse> page = gymRepository.findAll(pageable).map(this::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public List<GymResponse> getGymsByOwner(Long ownerId) {
        return gymRepository.findByOwnerId(ownerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public GymResponse updateGym(Long id, GymRequest request) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gym", id));

        gym.setName(request.getName());
        if (request.getNameAr() != null) gym.setNameAr(request.getNameAr());
        if (request.getAddress() != null) gym.setAddress(request.getAddress());
        if (request.getCity() != null) gym.setCity(request.getCity());
        if (request.getCountry() != null) gym.setCountry(request.getCountry());
        if (request.getEmail() != null) gym.setEmail(request.getEmail());
        if (request.getPhone() != null) gym.setPhone(request.getPhone());
        if (request.getLogoUrl() != null) gym.setLogoUrl(request.getLogoUrl());
        if (request.getMaxMembers() != null) gym.setMaxMembers(request.getMaxMembers());

        return toResponse(gymRepository.save(gym));
    }

    @Transactional
    public void updateGymStatus(Long id, GymStatus status) {
        Gym gym = gymRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gym", id));
        gym.setStatus(status);
        gymRepository.save(gym);
    }

    @Transactional
    public void deleteGym(Long id) {
        if (!gymRepository.existsById(id)) {
            throw new ResourceNotFoundException("Gym", id);
        }
        gymRepository.deleteById(id);
    }

    private GymResponse toResponse(Gym gym) {
        long activeMembers = gymRepository.countActiveMembers(gym.getId());
        return GymResponse.builder()
                .id(gym.getId())
                .name(gym.getName())
                .nameAr(gym.getNameAr())
                .address(gym.getAddress())
                .city(gym.getCity())
                .country(gym.getCountry())
                .phone(gym.getPhone())
                .email(gym.getEmail())
                .logoUrl(gym.getLogoUrl())
                .status(gym.getStatus())
                .ownerId(gym.getOwnerId())
                .maxMembers(gym.getMaxMembers())
                .activeMembers(activeMembers)
                .createdAt(gym.getCreatedAt())
                .build();
    }
}
