package com.qawi.service;

/**
 * Bilingual (EN/AR) content for automatic and event-driven notifications.
 * Centralised so titles/bodies stay consistent across jobs and event hooks.
 */
public final class NotificationTemplates {

    private NotificationTemplates() {}

    /** A single notification's bilingual title + body. */
    public record Content(String titleEn, String titleAr, String bodyEn, String bodyAr) {}

    // ── Membership ────────────────────────────────────────────────────────

    public static Content membershipExpiring(int days) {
        return new Content(
                "Membership expiring soon",
                "اشتراكك سينتهي قريبًا",
                "Your membership ends in " + days + " day" + (days == 1 ? "" : "s")
                        + ". Renew now to keep training without interruption.",
                "ينتهي اشتراكك خلال " + days + " "
                        + (days == 1 ? "يوم" : "أيام")
                        + ". جدّد الآن لتستمر في التمرين بدون انقطاع.");
    }

    public static Content membershipExpired() {
        return new Content(
                "Membership expired",
                "انتهى اشتراكك",
                "Your membership has expired. Renew now to regain full access to the gym.",
                "انتهى اشتراكك. جدّد الآن لاستعادة وصولك الكامل إلى الصالة.");
    }

    // ── Inactivity ────────────────────────────────────────────────────────

    public static Content inactiveMember(int days) {
        return new Content(
                "We miss you at the gym",
                "افتقدناك في الصالة",
                "You have not checked in for " + days + " day" + (days == 1 ? "" : "s")
                        + ". Come back and continue your progress.",
                "لم تسجّل حضورك منذ " + days + " "
                        + (days == 1 ? "يوم" : "يومًا")
                        + ". عد للتدريب وواصل تقدمك.");
    }

    public static Content adminInactiveAlert(String memberName, int days) {
        return new Content(
                "Inactive member alert",
                "تنبيه عضو غير نشط",
                memberName + " has not checked in for " + days + " day" + (days == 1 ? "" : "s") + ".",
                "العضو " + memberName + " لم يسجّل حضورًا منذ " + days + " "
                        + (days == 1 ? "يوم" : "يومًا") + ".");
    }

    // ── Classes ───────────────────────────────────────────────────────────

    public static Content classReminder(String className, String time) {
        return new Content(
                "Class starts soon",
                "حصتك ستبدأ قريبًا",
                "Your class " + className + " starts at " + time + ".",
                "ستبدأ حصة " + className + " الساعة " + time + ".");
    }

    // ── Admin-facing event alerts ─────────────────────────────────────────

    public static Content newMemberAdmin(String memberName) {
        return new Content(
                "New member joined",
                "عضو جديد انضم",
                memberName + " has been added to your gym.",
                "تمت إضافة " + memberName + " إلى صالتك.");
    }

    public static Content coachAssignedToMember(String coachName) {
        return new Content(
                "A coach has been assigned to you",
                "تم تعيين مدرب لك",
                "Coach " + coachName + " is now your coach. Check your plan to get started.",
                "أصبح المدرب " + coachName + " مدربك الآن. اطّلع على خطتك للبدء.");
    }

    public static Content memberAssignedToCoach(String memberName) {
        return new Content(
                "New member assigned",
                "تم تعيين عضو جديد",
                memberName + " has been assigned to you.",
                "تم تعيين العضو " + memberName + " لك.");
    }

    public static Content reportSubmittedAdmin(String memberName) {
        return new Content(
                "New member report",
                "بلاغ جديد من عضو",
                memberName + " submitted a new report.",
                "قام العضو " + memberName + " بإرسال بلاغ جديد.");
    }

    public static Content suggestionSubmittedAdmin(String memberName) {
        return new Content(
                "New member suggestion",
                "اقتراح جديد من عضو",
                memberName + " submitted a new suggestion.",
                "قام العضو " + memberName + " بإرسال اقتراح جديد.");
    }

    public static Content renewalRequestAdmin(String memberName, String planName) {
        String plan = planName != null && !planName.isBlank() ? planName : "a plan";
        String planAr = planName != null && !planName.isBlank() ? planName : "خطة";
        return new Content(
                "New renewal request",
                "طلب تجديد جديد",
                memberName + " requested to renew " + plan + ".",
                "طلب العضو " + memberName + " تجديد " + planAr + ".");
    }
}
