package com.houseprice.market.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.houseprice.market.ml.MlClient;
import com.houseprice.market.ml.MlModels;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * End-to-end slice over the HTTP API with the ML container mocked out;
 * the dataset is the six-row test fixture.
 */
@SpringBootTest(properties = "market.data-file=src/test/resources/houses.csv")
@AutoConfigureMockMvc
class MarketApiIntegrationTest {

  @Autowired
  MockMvc mockMvc;

  @MockitoBean
  MlClient mlClient;

  @Test
  void healthReportsDatasetAndMl() throws Exception {
    when(mlClient.healthy()).thenReturn(true);

    mockMvc.perform(get("/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.properties").value(6))
        .andExpect(jsonPath("$.ml").value("ok"));
  }

  @Test
  void aggregatesReturnStats() throws Exception {
    mockMvc.perform(get("/api/market/aggregates"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(6))
        .andExpect(jsonPath("$.price.mean").value(273333.3))
        .andExpect(jsonPath("$.by_bedrooms.length()").value(3))
        .andExpect(jsonPath("$.by_bedrooms[0].band").value("2"))
        .andExpect(jsonPath("$.by_year_built_band.length()").value(4))
        .andExpect(jsonPath("$.price_histogram.length()").value(8));
  }

  @Test
  void aggregatesHonorFilters() throws Exception {
    mockMvc.perform(get("/api/market/aggregates").param("bedrooms", "3"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.count").value(2))
        .andExpect(jsonPath("$.filters.bedrooms").value(3));
  }

  @Test
  void propertiesSortAndPage() throws Exception {
    mockMvc.perform(get("/api/market/properties")
            .param("sortBy", "price").param("sortDir", "desc").param("size", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(6))
        .andExpect(jsonPath("$.properties.length()").value(2))
        .andExpect(jsonPath("$.properties[0].price").value(395000))
        .andExpect(jsonPath("$.properties[1].price").value(345000));
  }

  @Test
  void propertiesRejectUnknownSort() throws Exception {
    mockMvc.perform(get("/api/market/properties").param("sortBy", "garages"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Unknown sort_by")));
  }

  @Test
  void propertiesRejectBadParamType() throws Exception {
    mockMvc.perform(get("/api/market/properties").param("minYearBuilt", "abc"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("Validation failed."))
        .andExpect(jsonPath("$.errors.minYearBuilt")
            .value(org.hamcrest.Matchers.containsString("Invalid value for query parameter")));
  }

  @Test
  void whatIfComputesDeltas() throws Exception {
    when(mlClient.predict(anyList())).thenReturn(new MlModels.MlPredictResponse(
        new MlModels.MlSummary(2, 2, 0),
        List.of(
            new MlModels.MlHousePrice(0, "baseline", 300000, ""),
            new MlModels.MlHousePrice(1, "+1 bedroom", 330000, ""))));

    mockMvc.perform(post("/api/market/what-if")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"baseline": {"square_footage": 1500, "bedrooms": 3, "bathrooms": 2,
                  "year_built": 2000, "lot_size": 6000, "distance_to_city_center": 5,
                  "school_rating": 8},
                 "scenarios": [{"name": "+1 bedroom", "changes": {"bedrooms": 4}}]}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.baseline_price").value(300000))
        .andExpect(jsonPath("$.scenarios[0].price").value(330000))
        .andExpect(jsonPath("$.scenarios[0].delta").value(30000));
  }

  @Test
  void whatIfRejectsUnknownFeature() throws Exception {
    mockMvc.perform(post("/api/market/what-if")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"baseline": {"square_footage": 1500, "bedrooms": 3, "bathrooms": 2,
                  "year_built": 2000, "lot_size": 6000, "distance_to_city_center": 5,
                  "school_rating": 8},
                 "scenarios": [{"name": "garage", "changes": {"garages": 2}}]}
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors['scenarios[0].changes']")
            .value(org.hamcrest.Matchers.containsString("unknown feature")));
  }

  @Test
  void exportCsvDownloadsFilteredRows() throws Exception {
    mockMvc.perform(get("/api/market/export.csv").param("bedrooms", "2"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("text/csv"))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("id,square_footage")))
        .andExpect(content().string(org.hamcrest.Matchers.containsString(",185000")))
        .andExpect(content().string(org.hamcrest.Matchers.not(
            org.hamcrest.Matchers.containsString(",395000"))));
  }

  @Test
  void exportPdfDownloadsSummary() throws Exception {
    byte[] pdf = mockMvc.perform(get("/api/market/export.pdf"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith("application/pdf"))
        .andReturn().getResponse().getContentAsByteArray();

    assertThat(new String(pdf, 0, 4, StandardCharsets.ISO_8859_1)).startsWith("%PDF");
  }

  @Test
  void modelInfoPassesThrough() throws Exception {
    when(mlClient.modelInfo()).thenReturn(Map.of("model", "linear"));

    mockMvc.perform(get("/api/market/model-info"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.model").value("linear"));
  }

  @Test
  void reloadRereadsDataset() throws Exception {
    mockMvc.perform(post("/api/market/reload"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("reloaded"))
        .andExpect(jsonPath("$.properties").value(6));
  }
}
