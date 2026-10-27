package com.example.demo.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adds and backfills public UUIDs without changing existing numeric primary keys.
 * This runs after Hibernate has created/updated the mapped tables and before the
 * application is marked ready to receive traffic.
 */
@Component
public class PublicIdMigrationRunner implements ApplicationRunner {

    private static final List<String> TABLES = List.of(
            "users",
            "estate",
            "resident",
            "visitor",
            "visit",
            "security",
            "activity_log"
    );

    private final JdbcTemplate jdbcTemplate;

    public PublicIdMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        String uuidExpression = jdbcTemplate.execute((ConnectionCallback<String>) connection -> {
            String product = connection.getMetaData().getDatabaseProductName();
            if (product != null && product.toLowerCase().contains("postgresql")) {
                return "gen_random_uuid()";
            }
            if (product != null && product.toLowerCase().contains("h2")) {
                return "RANDOM_UUID()";
            }
            throw new IllegalStateException("Unsupported database for public_id migration: " + product);
        });

        for (String table : TABLES) {
            ensurePublicIds(table, uuidExpression);
        }
    }

    private void ensurePublicIds(String table, String uuidExpression) {
        // Table names come only from the fixed TABLES allow-list above. Leaving
        // these identifiers unquoted works with PostgreSQL's lowercase names
        // and H2's uppercase default naming for Hibernate-created tables.
        jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS public_id UUID");
        jdbcTemplate.update("UPDATE " + table + " SET public_id = " + uuidExpression + " WHERE public_id IS NULL");
        jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN public_id SET NOT NULL");
        jdbcTemplate.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_" + table + "_public_id ON "
                + table + " (public_id)");
    }
}
