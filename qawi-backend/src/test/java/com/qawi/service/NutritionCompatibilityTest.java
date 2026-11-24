package com.qawi.service;

import com.qawi.dto.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class NutritionCompatibilityTest {
    @Test
    void legacyTargetsAndWaterUseCanonicalWritesAndTranslateUnits() {
        var core = mock(NutritionV2Service.class);
        var adapter = new NutritionV3Service(core);
        UUID member = UUID.randomUUID();
        when(core.getTarget("coach", member)).thenReturn(Map.of("notes", "Keep notes"));
        when(core.setTarget(eq("coach"), any())).thenReturn(Map.of("targetCalories", 2100,
                "targetProtein", 140, "targetCarbs", 200, "targetFat", 70, "targetWater", 2.5));
        NutritionTargetRequest request = new NutritionTargetRequest();
        request.setMemberId(member); request.setCalories(2100); request.setProteinG(140); request.setWaterMl(2500);
        var result = adapter.setTarget("coach", request);
        var captured = ArgumentCaptor.forClass(NutritionTargetSetRequest.class);
        verify(core).setTarget(eq("coach"), captured.capture());
        assertEquals(2.5, captured.getValue().getTargetWater());
        assertEquals("Keep notes", captured.getValue().getNotes());
        assertEquals(2500L, result.get("waterMl"));
        assertEquals(140, result.get("proteinG"));
        when(core.logWater(eq("member"), any())).thenReturn(Map.of("consumed", 0.5,
                "logs", List.of(Map.of("id", UUID.randomUUID(), "amount", 0.5, "loggedAt", "2026-11-24T10:00:00"))));
        WaterLogRequest water = new WaterLogRequest(); water.setMemberId(member); water.setAmountMl(500);
        assertEquals(500L, adapter.logWater("member", water).get("totalTodayMl"));
        verify(core).logWater(eq("member"), argThat(value -> value.getAmount().equals(0.5)));
    }

    @Test
    void canonicalErrorsPropagateWithoutLegacyPersistenceOrAnalysisFallback() {
        var core = mock(NutritionV2Service.class);
        var adapter = new NutritionV3Service(core);
        UUID member = UUID.randomUUID();
        when(core.getTodayLog("foreign", member)).thenThrow(new IllegalStateException("denied"));
        assertThrows(IllegalStateException.class, () -> adapter.getTodayLog("foreign", member));
        when(core.calculateFood(eq("member"), any())).thenReturn(Map.of("calories", 125));
        assertEquals(125, adapter.analyzeFood("member", "rice").get("calories"));
        verify(core).calculateFood(eq("member"), argThat(value -> value.getQuantity().equals(1.0)));
    }
}
