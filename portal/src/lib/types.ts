/**
 * Types mirroring the Pydantic schemas of the Python predict service
 * (predict/app/schemas/predict.py).
 */

/** The seven numeric features the regression model was trained on. */
export interface HouseFeatures {
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
}

/** One input item: all features plus an optional client-supplied label. */
export interface HouseInfo extends HouseFeatures {
  id?: string;
}

/** One prediction result, in the same order as the input items. */
export interface HousePrice {
  index: number;
  id: string;
  price: number;
  reason: string;
}

export interface PredictSummary {
  total: number;
  succeed: number;
  failed: number;
}

/** Response body of POST /api/v1/predict. */
export interface PredictResponse {
  summary: PredictSummary;
  predicts: HousePrice[];
}

/** Cross-validation metrics saved by scripts/train.py. */
export interface ModelMetrics {
  model_type?: string;
  target?: string;
  features?: string[];
  cv?: {
    r2?: number;
    rmse?: number;
    mae?: number;
    r2_train?: number;
  };
}

/** Response body of GET /api/v1/model-info. */
export interface ModelInfo {
  model: string;
  model_version: string;
  target: string;
  feature_order: string[];
  coefficients: {
    intercept: number;
    features: Record<string, number>;
  };
  metrics: ModelMetrics | null;
}
