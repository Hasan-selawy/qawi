package com.qawi.service;

import com.qawi.entity.*;
import com.qawi.exception.AppException;
import com.qawi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private final UserRepository userRepository;
    private final GymRepository gymRepository;
    private final GymMemberPlanRepository gymMemberPlanRepository;
    private final AttendanceRepository attendanceRepository;

    private User loadAccountant(String email) {
        User u = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", "المستخدم غير موجود", HttpStatus.NOT_FOUND));
        if (u.getRole() != Role.ACCOUNTANT && u.getRole() != Role.GYM_ADMIN)
            throw new AppException("Access denied", "غير مصرح لك", HttpStatus.FORBIDDEN);
        return u;
    }

    public Map<String, Object> getRevenueSummary(String email) {
        User caller = loadAccountant(email);
        UUID gymId = caller.getGymId();

        List<User> members = userRepository.findByGymIdAndRole(gymId, Role.MEMBER);
        List<GymMemberPlan> plans = gymMemberPlanRepository.findByGymIdOrderByDurationAscCreatedAtAsc(gymId);

        long activeMembers = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null
                        && !m.getSubscriptionEndDate().isBefore(LocalDate.now()))
                .count();

        long expiredMembers = members.stream()
                .filter(m -> m.getSubscriptionEndDate() == null
                        || m.getSubscriptionEndDate().isBefore(LocalDate.now()))
                .count();

        BigDecimal avgPlanPrice = plans.stream()
                .map(GymMemberPlan::getPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (!plans.isEmpty()) avgPlanPrice = avgPlanPrice.divide(BigDecimal.valueOf(plans.size()), 3, RoundingMode.HALF_UP);

        BigDecimal mrr = avgPlanPrice.multiply(BigDecimal.valueOf(activeMembers));
        BigDecimal arr = mrr.multiply(BigDecimal.valueOf(12));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("activeMembers", activeMembers);
        result.put("expiredMembers", expiredMembers);
        result.put("totalMembers", members.size());
        result.put("mrr", mrr.setScale(3, RoundingMode.HALF_UP));
        result.put("arr", arr.setScale(3, RoundingMode.HALF_UP));
        result.put("averagePlanPrice", avgPlanPrice.setScale(3, RoundingMode.HALF_UP));
        result.put("currency", "JOD");

        long expiringThisWeek = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null
                        && !m.getSubscriptionEndDate().isBefore(LocalDate.now())
                        && !m.getSubscriptionEndDate().isAfter(LocalDate.now().plusDays(7)))
                .count();
        result.put("expiringThisWeek", expiringThisWeek);

        double renewalRate = members.isEmpty() ? 0 :
                Math.round((double) activeMembers / members.size() * 10000.0) / 100.0;
        result.put("renewalRate", renewalRate);

        return result;
    }

    public Map<String, Object> getSubscriptions(String email) {
        User caller = loadAccountant(email);
        List<User> members = userRepository.findByGymIdAndRole(caller.getGymId(), Role.MEMBER);
        LocalDate today = LocalDate.now();

        List<Map<String, Object>> active = new ArrayList<>();
        List<Map<String, Object>> expiring = new ArrayList<>();
        List<Map<String, Object>> expired = new ArrayList<>();

        for (User m : members) {
            Map<String, Object> sub = buildMemberSubscription(m);
            if (m.getSubscriptionEndDate() == null || m.getSubscriptionEndDate().isBefore(today)) {
                expired.add(sub);
            } else if (!m.getSubscriptionEndDate().isAfter(today.plusDays(7))) {
                expiring.add(sub);
            } else {
                active.add(sub);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("active", active);
        result.put("expiring", expiring);
        result.put("expired", expired);
        result.put("activeCount", active.size());
        result.put("expiringCount", expiring.size());
        result.put("expiredCount", expired.size());
        result.put("renewalRate", members.isEmpty() ? 0 :
                Math.round((double) active.size() / members.size() * 10000.0) / 100.0);
        return result;
    }

    public List<Map<String, Object>> getMemberFinances(String email) {
        User caller = loadAccountant(email);
        List<User> members = userRepository.findByGymIdAndRole(caller.getGymId(), Role.MEMBER);

        return members.stream().map(m -> {
            Map<String, Object> item = buildMemberSubscription(m);
            item.put("totalPaid", BigDecimal.ZERO);
            item.put("paymentStatus", m.getSubscriptionEndDate() != null
                    && !m.getSubscriptionEndDate().isBefore(LocalDate.now()) ? "PAID" : "OVERDUE");
            return item;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getFinanceSummary(String email) {
        User caller = loadAccountant(email);
        UUID gymId = caller.getGymId();

        List<User> members = userRepository.findByGymIdAndRole(gymId, Role.MEMBER);
        List<GymMemberPlan> plans = gymMemberPlanRepository.findByGymIdOrderByDurationAscCreatedAtAsc(gymId);
        LocalDate today = LocalDate.now();

        long activeCount = members.stream()
                .filter(m -> m.getSubscriptionEndDate() != null && !m.getSubscriptionEndDate().isBefore(today))
                .count();

        BigDecimal avgPrice = plans.stream().map(GymMemberPlan::getPrice)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (!plans.isEmpty()) avgPrice = avgPrice.divide(BigDecimal.valueOf(plans.size()), 3, RoundingMode.HALF_UP);

        BigDecimal grossRevenue = avgPrice.multiply(BigDecimal.valueOf(members.size()));
        BigDecimal expectedRevenue = avgPrice.multiply(BigDecimal.valueOf(activeCount));
        BigDecimal actualRevenue = avgPrice.multiply(BigDecimal.valueOf(activeCount));

        long newThisMonth = members.stream()
                .filter(m -> m.getCreatedAt() != null
                        && m.getCreatedAt().isAfter(today.withDayOfMonth(1).atStartOfDay()))
                .count();
        BigDecimal newRevenue = avgPrice.multiply(BigDecimal.valueOf(newThisMonth));

        long expired = members.size() - activeCount;
        BigDecimal churnImpact = avgPrice.multiply(BigDecimal.valueOf(expired));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("grossRevenue", grossRevenue.setScale(3, RoundingMode.HALF_UP));
        result.put("expectedRevenue", expectedRevenue.setScale(3, RoundingMode.HALF_UP));
        result.put("actualRevenue", actualRevenue.setScale(3, RoundingMode.HALF_UP));
        result.put("churnImpact", churnImpact.setScale(3, RoundingMode.HALF_UP));
        result.put("newRevenue", newRevenue.setScale(3, RoundingMode.HALF_UP));
        result.put("expansionRevenue", BigDecimal.ZERO);
        result.put("currency", "JOD");
        result.put("activeMembers", activeCount);
        result.put("totalMembers", members.size());
        result.put("newThisMonth", newThisMonth);

        List<Map<String, Object>> monthly = buildMonthlyRevenue(members, avgPrice);
        result.put("monthlyRevenue", monthly);

        List<Map<String, Object>> byPlan = buildRevenueByPlan(plans, members);
        result.put("revenueByPlan", byPlan);

        return result;
    }

    public String exportCsv(String email) {
        User caller = loadAccountant(email);
        List<User> members = userRepository.findByGymIdAndRole(caller.getGymId(), Role.MEMBER);

        StringBuilder sb = new StringBuilder();
        sb.append("Name,Email,Phone,SubscriptionStart,SubscriptionEnd,Status\n");
        LocalDate today = LocalDate.now();
        for (User m : members) {
            String status = (m.getSubscriptionEndDate() == null || m.getSubscriptionEndDate().isBefore(today))
                    ? "EXPIRED" : "ACTIVE";
            sb.append(csv(m.getName())).append(",")
                    .append(csv(m.getEmail())).append(",")
                    .append(csv(m.getPhone())).append(",")
                    .append(m.getSubscriptionStartDate()).append(",")
                    .append(m.getSubscriptionEndDate()).append(",")
                    .append(status).append("\n");
        }
        return sb.toString();
    }

    private Map<String, Object> buildMemberSubscription(User m) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("memberId", m.getId());
        item.put("memberName", m.getName());
        item.put("email", m.getEmail());
        item.put("subscriptionStartDate", m.getSubscriptionStartDate());
        item.put("subscriptionEndDate", m.getSubscriptionEndDate());
        item.put("status", getStatus(m));
        return item;
    }

    private String getStatus(User m) {
        if (m.getSubscriptionEndDate() == null) return "NO_PLAN";
        LocalDate today = LocalDate.now();
        if (m.getSubscriptionEndDate().isBefore(today)) return "EXPIRED";
        if (!m.getSubscriptionEndDate().isAfter(today.plusDays(7))) return "EXPIRING_SOON";
        return "ACTIVE";
    }

    private List<Map<String, Object>> buildMonthlyRevenue(List<User> members, BigDecimal avgPrice) {
        Map<String, Long> counts = new LinkedHashMap<>();
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};
        for (String m : months) counts.put(m, 0L);

        LocalDate today = LocalDate.now();
        for (User m : members) {
            if (m.getCreatedAt() != null) {
                int mon = m.getCreatedAt().getMonthValue() - 1;
                if (m.getCreatedAt().getYear() == today.getYear()) {
                    counts.merge(months[mon], 1L, Long::sum);
                }
            }
        }

        return counts.entrySet().stream().map(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", e.getKey());
            item.put("members", e.getValue());
            item.put("revenue", avgPrice.multiply(BigDecimal.valueOf(e.getValue())).setScale(3, RoundingMode.HALF_UP));
            return item;
        }).collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildRevenueByPlan(List<GymMemberPlan> plans, List<User> members) {
        return plans.stream().map(p -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("planId", p.getId());
            item.put("planName", p.getName());
            item.put("price1Month", p.getPrice());
            item.put("memberCount", 0);
            item.put("revenue", BigDecimal.ZERO);
            return item;
        }).collect(Collectors.toList());
    }

    private String csv(String s) {
        if (s == null) return "";
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
