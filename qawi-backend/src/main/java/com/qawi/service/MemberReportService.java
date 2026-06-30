package com.qawi.service;

import com.qawi.dto.NotificationCommand;
import com.qawi.entity.*;
import com.qawi.event.NotificationDispatchEvent;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MemberReportService {

    private final MemberReportRepository memberReportRepository;
    private final MemberSuggestionRepository memberSuggestionRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public MemberReport submitReport(String memberEmail, ReportCategory category, String description) {
        User member = getMember(memberEmail);
        MemberReport saved = memberReportRepository.save(MemberReport.builder()
                .memberId(member.getId())
                .gymId(member.getGymId())
                .category(category)
                .description(description)
                .status(ReportStatus.PENDING)
                .build());
        notifyAdmins(member.getGymId(), NotificationTemplates.reportSubmittedAdmin(member.getName()),
                "report:" + saved.getId());
        return saved;
    }

    @Transactional
    public MemberSuggestion submitSuggestion(String memberEmail, String text) {
        User member = getMember(memberEmail);
        MemberSuggestion saved = memberSuggestionRepository.save(MemberSuggestion.builder()
                .memberId(member.getId())
                .gymId(member.getGymId())
                .text(text)
                .build());
        notifyAdmins(member.getGymId(), NotificationTemplates.suggestionSubmittedAdmin(member.getName()),
                "suggestion:" + saved.getId());
        return saved;
    }

    private void notifyAdmins(UUID gymId, NotificationTemplates.Content c, String keyPrefix) {
        if (gymId == null) return;
        List<NotificationCommand> cmds = new ArrayList<>();
        for (User adminUser : userRepository.findByGymIdAndRole(gymId, Role.GYM_ADMIN)) {
            cmds.add(NotificationCommand.builder()
                    .userId(adminUser.getId()).gymId(gymId)
                    .type(NotificationType.REPORT_SUBMITTED)
                    .titleEn(c.titleEn()).titleAr(c.titleAr())
                    .message(c.bodyEn()).messageAr(c.bodyAr())
                    .actionUrl("/admin/reports")
                    .uniqueKey(keyPrefix + ":" + adminUser.getId())
                    .build());
        }
        if (!cmds.isEmpty()) eventPublisher.publishEvent(new NotificationDispatchEvent(cmds));
    }

    public List<Map<String, Object>> getReportsForGym(UUID gymId) {
        List<Map<String, Object>> result = new ArrayList<>();

        for (MemberReport r : memberReportRepository.findByGymIdOrderByCreatedAtDesc(gymId)) {
            String memberName = userRepository.findById(r.getMemberId())
                    .map(User::getName).orElse("Unknown");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", r.getId());
            row.put("type", "REPORT");
            row.put("memberName", memberName);
            row.put("category", r.getCategory());
            row.put("description", r.getDescription());
            row.put("status", r.getStatus());
            row.put("createdAt", r.getCreatedAt());
            result.add(row);
        }

        for (MemberSuggestion s : memberSuggestionRepository.findByGymIdOrderByCreatedAtDesc(gymId)) {
            String memberName = userRepository.findById(s.getMemberId())
                    .map(User::getName).orElse("Unknown");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", s.getId());
            row.put("type", "SUGGESTION");
            row.put("memberName", memberName);
            row.put("category", null);
            row.put("description", s.getText());
            row.put("status", "N/A");
            row.put("createdAt", s.getCreatedAt());
            result.add(row);
        }

        result.sort((a, b) -> {
            var ta = (java.time.LocalDateTime) a.get("createdAt");
            var tb = (java.time.LocalDateTime) b.get("createdAt");
            return tb.compareTo(ta);
        });

        return result;
    }

    @Transactional
    public void resolveReport(UUID reportId, UUID gymId) {
        MemberReport report = memberReportRepository.findById(reportId)
                .orElseThrow(() -> new AppException("Report not found", "التقرير غير موجود", HttpStatus.NOT_FOUND));
        if (!report.getGymId().equals(gymId)) {
            throw new AppException("Access denied", "غير مصرح", HttpStatus.FORBIDDEN);
        }
        report.setStatus(ReportStatus.RESOLVED);
        memberReportRepository.save(report);
    }

    private User getMember(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
    }
}
