package com.houseprice.market.data;

/** One row of the housing dataset; serialized with snake_case keys. */
public record House(
    long id,
    double squareFootage,
    int bedrooms,
    double bathrooms,
    int yearBuilt,
    double lotSize,
    double distanceToCityCenter,
    double schoolRating,
    long price) {}
