package com.qawi.dto;

import com.qawi.entity.Attendance;
import com.qawi.entity.Notification;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckInResponse {
    private Attendance attendance;
    private int streak;
    private Notification notification;
}
