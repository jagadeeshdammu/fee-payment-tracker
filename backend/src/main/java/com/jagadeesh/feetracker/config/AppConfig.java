package com.jagadeesh.feetracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class AppConfig {

    /** Injecting a Clock (instead of calling LocalDate.now()) lets tests control "today". */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
