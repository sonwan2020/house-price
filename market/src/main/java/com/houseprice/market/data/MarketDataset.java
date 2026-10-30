package com.houseprice.market.data;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/** Immutable snapshot of the dataset, replaced atomically on reload. */
public class MarketDataset {

  private final AtomicReference<List<House>> houses;

  public MarketDataset(List<House> houses) {
    this.houses = new AtomicReference<>(List.copyOf(houses));
  }

  public List<House> all() {
    return houses.get();
  }

  public int size() {
    return houses.get().size();
  }

  public void replace(List<House> next) {
    houses.set(List.copyOf(next));
  }
}
