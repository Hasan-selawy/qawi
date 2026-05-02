package com.qawi.gym;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QawiGymApplication {

    public static void main(String[] args) {
        SpringApplication.run(QawiGymApplication.class, args);
    }
}
