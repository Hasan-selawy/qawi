package com.qawi.event;

import com.qawi.dto.NotificationCommand;

import java.util.List;

/**
 * Published by business services when an in-process event should produce
 * notifications. The actual dispatch happens after the publishing transaction
 * commits (see {@code NotificationEventListener}), so notifications are never
 * sent for rolled-back work and a notification failure can't roll back the
 * originating action.
 */
public record NotificationDispatchEvent(List<NotificationCommand> commands) {}
