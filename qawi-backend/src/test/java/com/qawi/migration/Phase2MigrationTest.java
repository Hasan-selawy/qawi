package com.qawi.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.sql.*;
import java.util.UUID;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "PHASE0_DB_URL", matches = ".+")
class Phase2MigrationTest {
    private Flyway flyway(String schema, String target) {
        var config = Flyway.configure().dataSource(System.getenv("PHASE0_DB_URL"), System.getenv("PHASE0_DB_USER"),
                System.getenv().getOrDefault("PHASE0_DB_PASSWORD", "")).schemas(schema).defaultSchema(schema).cleanDisabled(true);
        if (target != null) config.target(target);
        return config.load();
    }

    @Test
    void phase0UpgradePreservesMoneyExactlyAndCreatesPrivacyAndIdempotencyTables() throws Exception {
        String schema = schema();
        try {
            flyway(schema, "3").migrate();
            seedPrice(schema, "0.30000000000000004");
            assertEquals(3, flyway(schema, null).migrate().migrationsExecuted);
            try (Connection connection = connection(schema); var statement = connection.createStatement()) {
                var result = statement.executeQuery("select price from subscription_histories");
                assertTrue(result.next());
                assertEquals(new BigDecimal("0.300"), result.getBigDecimal(1));
                assertEquals(3, result.getMetaData().getScale(1));
                assertTrue(connection.getMetaData().getTables(null, schema, "attendance_operations", null).next());
                assertTrue(connection.getMetaData().getTables(null, schema, "biometric_erasure_jobs", null).next());
            }
            flyway(schema, null).validate();
            assertEquals(0, flyway(schema, null).migrate().migrationsExecuted);
        } finally { drop(schema); }
    }

    @Test
    void materialPrecisionLossRefusesUpgradeAndLeavesOriginalAmount() throws Exception {
        String schema = schema();
        try {
            flyway(schema, "3").migrate();
            seedPrice(schema, "12.3456");
            var failure = assertThrows(FlywayException.class, () -> flyway(schema, null).migrate());
            assertTrue(failure.getMessage().contains("Subscription prices exceed"));
            try (Connection connection = connection(schema); var statement = connection.createStatement()) {
                var result = statement.executeQuery("select price from subscription_histories");
                assertTrue(result.next());
                assertEquals(12.3456, result.getDouble(1), 0.0000001);
            }
        } finally { drop(schema); }
    }

    private void seedPrice(String schema, String price) throws Exception {
        try (Connection connection = connection(schema); var statement = connection.createStatement()) {
            String member = UUID.randomUUID().toString();
            String admin = UUID.randomUUID().toString();
            for (String id : new String[]{member, admin}) statement.execute("insert into users "
                    + "(id,name,email,password,role,is_active,self_training_enabled,created_at) values ('"
                    + id + "','Migration','" + id + "@test.com','unused','MEMBER',true,false,now())");
            statement.execute("insert into subscription_histories (id,member_id,managed_by_admin_id,start_date,end_date,plan,price,created_at) values ('"
                    + UUID.randomUUID() + "','" + member + "','" + admin + "',current_date,current_date,'MONTHLY'," + price + ",now())");
        }
    }

    private String schema() { return "phase2_" + UUID.randomUUID().toString().replace("-", ""); }
    private Connection connection(String schema) throws Exception {
        var connection = DriverManager.getConnection(System.getenv("PHASE0_DB_URL"), System.getenv("PHASE0_DB_USER"),
                System.getenv().getOrDefault("PHASE0_DB_PASSWORD", ""));
        connection.setSchema(schema);
        return connection;
    }
    private void drop(String schema) throws Exception {
        try (Connection connection = connection(schema); var statement = connection.createStatement()) {
            statement.execute("drop schema " + schema + " cascade");
        }
    }
}
