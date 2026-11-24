package com.qawi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qawi.dto.MemberSubscriptionRequest;
import com.qawi.dto.PlatformTierRequest;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MoneyPrecisionTest {
    @Test
    void monetaryInputRejectsNegativeValuesAndUnrepresentableFractions() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var request = new MemberSubscriptionRequest();
            for (String invalid : new String[]{"-1", "12.3456", "10000000000000000"}) {
                request.setPrice(new BigDecimal(invalid));
                org.junit.jupiter.api.Assertions.assertTrue(factory.getValidator().validate(request).stream()
                        .anyMatch(value -> value.getPropertyPath().toString().equals("price")));
            }
        }
    }
    @Test
    void requestAmountsKeepThreeDecimalPlacesWithoutBinaryFloatingPoint() throws Exception {
        var mapper = new ObjectMapper();
        Object price = mapper.readValue("{\"price\":12.345}", MemberSubscriptionRequest.class).getPrice();
        assertEquals(new BigDecimal("12.345"), price);
        Object tierPrice = mapper.readValue("{\"price1m\":12.345}", PlatformTierRequest.class).getPrice1m();
        assertEquals(new BigDecimal("12.345"), tierPrice);
    }
}
