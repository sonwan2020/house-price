package com.houseprice.market.analysis;

import java.util.List;

import com.houseprice.market.data.House;

/** Paged dataset rows for GET /api/v1/market/listings. */
public record ListingsPage(int total, int page, int size, List<House> listings) {}
