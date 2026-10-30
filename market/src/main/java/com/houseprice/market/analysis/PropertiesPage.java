package com.houseprice.market.analysis;

import java.util.List;

import com.houseprice.market.data.House;

/** Paged dataset rows for GET /api/market/properties. */
public record PropertiesPage(int total, int page, int size, List<House> properties) {}
