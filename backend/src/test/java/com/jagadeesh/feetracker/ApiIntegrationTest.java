package com.jagadeesh.feetracker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack test: real Spring context, Flyway migrations on in-memory H2, seeded demo data,
 * JWT security and MockMvc HTTP calls.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class ApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Test
    void protectedEndpointsNeedAToken() throws Exception {
        mvc.perform(get("/api/students")).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanListStudentsAndSeeDashboard() throws Exception {
        String token = login("admin", "admin123");

        mvc.perform(get("/api/students").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8));

        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentCount").value(8))
                .andExpect(jsonPath("$.overdueCount").value(greaterThan(0)));
    }

    @Test
    void paymentFlowEnforcesBalanceAndUniqueReference() throws Exception {
        String token = login("accountant", "accountant123");

        // Pick the first overdue fee
        String overdue = mvc.perform(get("/api/fees/overdue").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode fee = json.readTree(overdue).get(0);
        long feeId = fee.get("id").asLong();
        String balance = fee.get("balance").asText();

        // Paying more than the balance -> 422
        mvc.perform(post("/api/fees/" + feeId + "/payments").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":999999,\"mode\":\"UPI\",\"reference\":\"TEST-OVER\"}"))
                .andExpect(status().isUnprocessableEntity());

        // Paying the exact balance -> 201
        mvc.perform(post("/api/fees/" + feeId + "/payments").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":" + balance + ",\"mode\":\"UPI\",\"reference\":\"TEST-REF-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recordedBy").value("accountant"));

        // Same reference again -> 409 (no double counting)
        mvc.perform(post("/api/fees/" + feeId + "/payments").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":1,\"mode\":\"UPI\",\"reference\":\"TEST-REF-1\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void accountantCannotDeleteStudents() throws Exception {
        String token = login("accountant", "accountant123");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/students/1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidStudentReturnsFieldErrors() throws Exception {
        String token = login("admin", "admin123");
        mvc.perform(post("/api/students").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"admissionNo\":\"\",\"name\":\"X\",\"className\":\"Grade 1\",\"parentPhone\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.admissionNo").exists())
                .andExpect(jsonPath("$.fieldErrors.parentPhone").exists());
    }

    private String login(String username, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }
}
