package com.sigtm.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@SpringBootTest
@Testcontainers
class BackendApplicationTests {

	/**
	 * Secreto exclusivo para pruebas. No debe usarse fuera de este contexto.
	 * Decodificado en Base64 ocupa 64 bytes, suficiente para HS256.
	 */
	private static final String TEST_JWT_SECRET =
			"MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==";

	/**
	 * MySQL efímero para que la prueba de contexto no dependa del MySQL local
	 * ni de las variables DB_PASSWORD y JWT_SECRET del desarrollador.
	 */
	@Container
	private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
			.withDatabaseName("sigtm_test")
			.withUsername("sigtm_test")
			.withPassword("sigtm_test");

	@DynamicPropertySource
	static void registerTestProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
		registry.add("spring.datasource.username", MYSQL::getUsername);
		registry.add("spring.datasource.password", MYSQL::getPassword);
		registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
		registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");

		// También cubre los placeholders de application.yml, por si se resuelven
		// antes de aplicar las propiedades específicas de spring.datasource.
		registry.add("DB_URL", MYSQL::getJdbcUrl);
		registry.add("DB_USERNAME", MYSQL::getUsername);
		registry.add("DB_PASSWORD", MYSQL::getPassword);
		registry.add("JWT_SECRET", () -> TEST_JWT_SECRET);
	}

	@Test
	void contextLoads() {
	}

}
