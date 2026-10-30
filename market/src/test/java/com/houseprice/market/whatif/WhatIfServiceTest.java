package com.houseprice.market.whatif;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import com.houseprice.market.ml.MlClient;
import com.houseprice.market.ml.MlModels;
import com.houseprice.market.web.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class WhatIfServiceTest {

  @Mock
  MlClient mlClient;

  @InjectMocks
  WhatIfService service;

  private static WhatIfModels.WhatIfRequest request(String feature, Double value) {
    return new WhatIfModels.WhatIfRequest(
        new WhatIfModels.HouseFeaturesRequest(1500.0, 3, 2.0, 2000, 6000.0, 5.0, 8.0),
        List.of(new WhatIfModels.ScenarioRequest("change", Map.of(feature, value))));
  }

  @Test
  @SuppressWarnings("unchecked")
  void computesDeltasAndSendsBaselineFirst() {
    when(mlClient.predict(anyList())).thenReturn(new MlModels.MlPredictResponse(
        new MlModels.MlSummary(2, 2, 0),
        List.of(
            new MlModels.MlHousePrice(0, "baseline", 300000, ""),
            new MlModels.MlHousePrice(1, "change", 330000, ""))));

    WhatIfModels.WhatIfResult result = service.analyze(request("square_footage", 1800.0));

    assertThat(result.baselinePrice()).isEqualTo(300000);
    assertThat(result.scenarios()).hasSize(1);
    assertThat(result.scenarios().get(0).price()).isEqualTo(330000);
    assertThat(result.scenarios().get(0).delta()).isEqualTo(30000);

    ArgumentCaptor<List<MlModels.MlHouse>> captor = ArgumentCaptor.forClass(List.class);
    verify(mlClient).predict(captor.capture());
    assertThat(captor.getValue()).hasSize(2);
    assertThat(captor.getValue().get(0).id()).isEqualTo("baseline");
    assertThat(captor.getValue().get(1).id()).isEqualTo("change");
    assertThat(captor.getValue().get(1).squareFootage()).isEqualTo(1800.0);
    assertThat(captor.getValue().get(1).bedrooms()).isEqualTo(3);
  }

  @Test
  void rejectsUnknownFeature() {
    assertThatThrownBy(() -> service.analyze(request("garages", 2.0)))
        .isInstanceOfSatisfying(ApiException.class, e -> {
          assertThat(e.status()).isEqualTo(HttpStatus.BAD_REQUEST);
          assertThat(e.errors()).containsKey("scenarios[0].changes");
        });
  }

  @Test
  void rejectsOutOfRangeMergedValues() {
    assertThatThrownBy(() -> service.analyze(request("school_rating", 11.0)))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.errors())
            .containsEntry("scenarios[0].school_rating", "must be between 0 and 10."));
  }

  @Test
  void rejectsNonWholeBedrooms() {
    assertThatThrownBy(() -> service.analyze(request("bedrooms", 3.5)))
        .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.errors())
            .containsEntry("scenarios[0].bedrooms", "must be a whole number."));
  }

  @Test
  void baselineFailureYieldsNullDeltas() {
    when(mlClient.predict(anyList())).thenReturn(new MlModels.MlPredictResponse(
        new MlModels.MlSummary(2, 1, 1),
        List.of(
            new MlModels.MlHousePrice(0, "baseline", 0, "square_footage invalid"),
            new MlModels.MlHousePrice(1, "change", 280000, ""))));

    WhatIfModels.WhatIfResult result = service.analyze(request("bedrooms", 4.0));

    assertThat(result.baselinePrice()).isZero();
    assertThat(result.baselineReason()).contains("invalid");
    assertThat(result.scenarios().get(0).delta()).isNull();
  }
}
