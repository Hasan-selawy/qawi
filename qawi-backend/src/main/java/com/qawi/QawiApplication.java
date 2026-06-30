package com.qawi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QawiApplication {
    public static void main(String[] args) {
        SpringApplication.run(QawiApplication.class, args);
    }
}
