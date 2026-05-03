package com.qawi.entity;

/**
 * Visibility scope for an {@link ExerciseTemplate}.
 *
 * GLOBAL — built-in/seeded library, visible to every gym.
 * GYM    — added by a gym admin, visible to that gym's coaches/admins.
 * COACH  — added by a single coach, visible to that coach (and their gym admin).
 */
public enum ExerciseScope {
    GLOBAL,
    GYM,
    COACH
}
