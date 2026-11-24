package com.qawi.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Always targets a disposable database supplied explicitly by the test runner. */
@EnabledIfEnvironmentVariable(named = "PHASE0_DB_URL", matches = ".+")
class Phase0MigrationTest {
    private Flyway flyway(String schema, String target) {
        var config = Flyway.configure()
                .dataSource(System.getenv("PHASE0_DB_URL"), System.getenv("PHASE0_DB_USER"),
                        System.getenv().getOrDefault("PHASE0_DB_PASSWORD", ""))
                .schemas(schema).defaultSchema(schema).cleanDisabled(true).baselineOnMigrate(false);
        config.target(target == null ? "3" : target);
        return config.load();
    }

    @Test
    void freshSchemaMigratesAndRestartsWithoutDdlChanges() throws Exception {
        String schema = schema();
        Flyway flyway = flyway(schema, null);
        try {
            assertEquals(3, flyway.migrate().migrationsExecuted);
            flyway.validate();
            assertEquals(0, flyway.migrate().migrationsExecuted);
            try (Connection connection = connection(schema)) {
                assertTrue(connection.getMetaData().getTables(null, schema, "refresh_tokens", null).next());
                assertTrue(connection.getMetaData().getTables(null, schema, "attendances", null).next());
            }
        } finally {
            drop(schema);
        }
    }

    @Test
    void existingSchemaRequiresExplicitBaselineAndPreservesData() throws Exception {
        String schema = schema();
        try {
            flyway(schema, "1").migrate();
            seedAttendance(schema, false);
            try (Connection connection = connection(schema); var statement = connection.createStatement()) {
                statement.execute("drop table flyway_schema_history");
                statement.execute("alter table member_leads drop column subscription_start_date");
            }
            Flyway flyway = flyway(schema, null);
            assertThrows(FlywayException.class, flyway::migrate);
            flyway.baseline(); // Default baselineVersion=1: only after verifying the restored schema.
            assertEquals(2, flyway.migrate().migrationsExecuted);
            try (Connection connection = connection(schema); var statement = connection.createStatement()) {
                var result = statement.executeQuery("select count(*) from attendances");
                assertTrue(result.next());
                assertEquals(1, result.getInt(1));
                assertTrue(connection.getMetaData().getColumns(null, schema, "member_leads", "subscription_start_date").next());
                var duplicate = assertThrows(java.sql.SQLException.class, () -> statement.execute(
                        "insert into attendances (id, gym_id, member_id, checked_in_at, checked_out_at, source) "
                                + "select gen_random_uuid(), gym_id, member_id, checked_in_at, checked_out_at, source from attendances"));
                assertEquals("23505", duplicate.getSQLState());
            }
            flyway.validate();
        } finally {
            drop(schema);
        }
    }

    @Test
    void duplicateHistoryStopsMigrationWithoutDeletingRows() throws Exception {
        String schema = schema();
        try {
            flyway(schema, "1").migrate();
            seedAttendance(schema, true);
            Flyway flyway = flyway(schema, null);
            FlywayException error = assertThrows(FlywayException.class, flyway::migrate);
            assertTrue(error.getMessage().contains("Duplicate daily attendance exists"));
            try (Connection connection = connection(schema); var statement = connection.createStatement()) {
                var result = statement.executeQuery("select count(*) from attendances");
                assertTrue(result.next());
                assertEquals(2, result.getInt(1));
            }
        } finally {
            drop(schema);
        }
    }

    private void seedAttendance(String schema, boolean duplicate) throws Exception {
        try (Connection connection = connection(schema); var statement = connection.createStatement()) {
            // V1 has no tenant FKs; legacy rows intentionally model pre-migration data.
            String gym = UUID.randomUUID().toString();
            String member = UUID.randomUUID().toString();
            for (int i = 0; i < (duplicate ? 2 : 1); i++) {
                statement.execute("insert into attendances (id, gym_id, member_id, checked_in_at) values ('"
                        + UUID.randomUUID() + "', '" + gym + "', '" + member + "', '2026-11-24 10:00:00')");
            }
        }
    }

    private String schema() {
        return "phase0_" + UUID.randomUUID().toString().replace("-", "");
    }

    private Connection connection(String schema) throws Exception {
        Connection connection = DriverManager.getConnection(System.getenv("PHASE0_DB_URL"),
                System.getenv("PHASE0_DB_USER"), System.getenv().getOrDefault("PHASE0_DB_PASSWORD", ""));
        connection.setSchema(schema);
        return connection;
    }

    private void drop(String schema) throws Exception {
        try (Connection connection = connection(schema); var statement = connection.createStatement()) {
            statement.execute("drop schema " + schema + " cascade");
        }
    }
}
