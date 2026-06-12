package com.qawi.repository;

import com.qawi.entity.ArabicFoodCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArabicFoodCacheRepository extends JpaRepository<ArabicFoodCache, UUID> {

    @Query("SELECT f FROM ArabicFoodCache f WHERE " +
           "LOWER(f.foodName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "f.foodNameAr LIKE CONCAT('%', :q, '%') OR " +
           "LOWER(f.searchKeywords) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY f.searchCount DESC")
    List<ArabicFoodCache> search(@Param("q") String q);

    @Query("SELECT f FROM ArabicFoodCache f WHERE " +
           "LOWER(f.foodName) = LOWER(:name) OR f.foodNameAr = :name " +
           "ORDER BY f.searchCount DESC")
    List<ArabicFoodCache> findByExactName(@Param("name") String name);

    boolean existsByFoodNameIgnoreCase(String foodName);
}
