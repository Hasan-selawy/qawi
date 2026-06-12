package com.qawi.config;

import com.qawi.entity.ArabicFoodCache;
import com.qawi.entity.ArabicFoodSource;
import com.qawi.repository.ArabicFoodCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(10)
public class NutritionFoodSeeder implements ApplicationRunner {

    private final ArabicFoodCacheRepository repo;

    @Override
    public void run(ApplicationArguments args) {
        List<ArabicFoodCache> foods = List.of(
            food("Chicken Shawarma",    "شاورما دجاج",       "shawarma,شاورما,chicken wrap",           300, "g",      450, 38, 35,  16, null, null),
            food("Beef Shawarma",       "شاورما لحمة",       "shawarma,شاورما,beef wrap,لحمة",          300, "g",      550, 32, 35,  28, null, null),
            food("Mansaf",              "منسف",              "mansaf,منسف,lamb rice",                   400, "g",      800, 45, 90,  28, null, null),
            food("Falafel",             "فلافل",             "falafel,فلافل",                            1,  "piece",  57,  2,  6,   3,  1.0, null),
            food("Hummus",              "حمص",               "hummus,حمص,chickpea",                     100, "g",     166,  8, 14,  10,  4.0, null),
            food("Knafeh",              "كنافة",             "knafeh,كنافة,kunafa",                     100, "g",     400,  8, 55,  18, null, null),
            food("Musakhan",            "مسخن",              "musakhan,مسخن,chicken onion",             350, "g",     650, 35, 70,  25, null, null),
            food("Maqluba",             "مقلوبة",            "maqluba,مقلوبة,upside down rice",         350, "g",     550, 28, 65,  18, null, null),
            food("Tabbouleh",           "تبولة",             "tabbouleh,تبولة,parsley salad",           100, "g",     100,  3, 12,   5,  3.0, null),
            food("Fattoush",            "فتوش",              "fattoush,فتوش,bread salad",               100, "g",      90,  2, 14,   3,  2.0, null),
            food("Arabic Bread",        "خبز عربي",          "bread,خبز,pita,arabicbread",               1,  "piece", 370, 12, 76,   2,  3.0, null),
            food("White Rice Cooked",   "أرز أبيض مطبوخ",   "rice,أرز,white rice",                     200, "g",     260,  5, 57,   0,  0.5, null),
            food("Grilled Chicken",     "دجاج مشوي",         "grilled chicken,دجاج مشوي,chicken breast",150, "g",     230, 43,  0,   5, null, null),
            food("Egg",                 "بيض",               "egg,بيض,eggs",                             1,  "large",  78,  6,  0,   5, null, null),
            food("Yogurt",              "لبن",               "yogurt,لبن,labaneh",                      200, "g",     120,  8, 16,   2, null, null),
            food("Olive Oil",           "زيت زيتون",         "olive oil,زيت زيتون",                     1,  "tbsp",  119,  0,  0,  14, null, null),
            food("Tuna",                "تونا",              "tuna,تونا,canned tuna",                   100, "g",     132, 29,  0,   1, null, null),
            food("Banana",              "موز",               "banana,موز",                               1,  "medium",105,  1, 27,   0,  3.0, 14.0),
            food("Dates",               "تمر",               "dates,تمر,tamr",                           1,  "piece",  23,  0,  6,   0,  0.6,  5.0),
            food("Oats",                "شوفان",             "oats,شوفان,oatmeal",                      100, "g",     389, 17, 66,   7, 10.0, null),
            food("Potato",              "بطاطا",             "potato,بطاطا,potatoes",                   100, "g",      87,  2, 20,   0,  2.0, null),
            food("Sweet Potato",        "بطاطا حلوة",        "sweet potato,بطاطا حلوة",                 100, "g",      86,  2, 20,   0,  3.0, null),
            food("Milk",                "حليب",              "milk,حليب,dairy",                         250, "ml",    150,  8, 12,   8, null, null),
            food("Labneh",              "لبنة",              "labneh,لبنة,strained yogurt",             100, "g",     200, 10,  6,  16, null, null),
            food("Cheese",              "جبنة",              "cheese,جبنة,jibneh",                      100, "g",     300, 20,  3,  24, null, null)
        );

        int added = 0;
        for (ArabicFoodCache f : foods) {
            if (!repo.existsByFoodNameIgnoreCase(f.getFoodName())) {
                repo.save(f);
                added++;
            }
        }
        long total = repo.count();
        if (added > 0) {
            log.info("NutritionFoodSeeder: added {} new foods, total {} items in cache.", added, total);
        } else {
            log.info("NutritionFoodSeeder: food cache already seeded ({} items), skipping.", total);
        }
    }

    private ArabicFoodCache food(String name, String nameAr, String keywords,
                                  double qty, String unit,
                                  double cal, double prot, double carbs, double fat,
                                  Double fiber, Double sugar) {
        return ArabicFoodCache.builder()
                .foodName(name)
                .foodNameAr(nameAr)
                .searchKeywords(keywords)
                .defaultQuantity(qty)
                .defaultUnit(unit)
                .calories(cal)
                .protein(prot)
                .carbs(carbs)
                .fat(fat)
                .fiber(fiber)
                .sugar(sugar)
                .source(ArabicFoodSource.SEEDED)
                .build();
    }
}
