"""Catalog service aggregating curated variables and satellite products."""
from app.schemas.catalog import Variable, VariableCategory, DataSourceProvider, SatelliteProduct

CURATED_VARIABLES: list[Variable] = [
    Variable(
        variable_id="T2M",
        display_name="Surface Air Temperature (2m)",
        unit="°C",
        category=VariableCategory.ATMOSPHERE,
        provider=DataSourceProvider.NASA_POWER,
        description="Monthly average temperature of air at 2 meters above the surface of the Earth.",
        spatial_resolution="0.5° x 0.625°",
        temporal_range="1981-01 to 2025-12",
        source_model_or_sensor="MERRA-2 / GEOS-5.12.4",
        data_community="AG (Agroclimatology)",
    ),
    Variable(
        variable_id="PRECTOTCORR",
        display_name="Precipitation Corrected",
        unit="mm/month",
        category=VariableCategory.ATMOSPHERE,
        provider=DataSourceProvider.NASA_POWER,
        description="Bias-corrected monthly total precipitation combining satellite gauges and model reanalysis.",
        spatial_resolution="0.5° x 0.625°",
        temporal_range="1981-01 to 2025-12",
        source_model_or_sensor="MERRA-2 / GEOS-5.12.4",
        data_community="AG (Agroclimatology)",
    ),
    Variable(
        variable_id="RH2M",
        display_name="Relative Humidity (2m)",
        unit="%",
        category=VariableCategory.ATMOSPHERE,
        provider=DataSourceProvider.NASA_POWER,
        description="Ratio of actual water vapor pressure to saturation vapor pressure at 2 meters.",
        spatial_resolution="0.5° x 0.625°",
        temporal_range="1981-01 to 2025-12",
        source_model_or_sensor="MERRA-2 / GEOS-5.12.4",
        data_community="AG (Agroclimatology)",
    ),
    Variable(
        variable_id="GWETROOT",
        display_name="Root-Zone Soil Wetness",
        unit="fraction",
        category=VariableCategory.HYDROLOGY,
        provider=DataSourceProvider.NASA_POWER,
        description="Fraction of root-zone soil wetness (0 to 1, dimensionless) in the top 1 meter of soil.",
        spatial_resolution="0.5° x 0.625°",
        temporal_range="1981-01 to 2025-12",
        source_model_or_sensor="MERRA-2 Land Model",
        data_community="AG (Agroclimatology)",
    ),
    Variable(
        variable_id="EVPTRNS",
        display_name="Evapotranspiration Energy Flux",
        unit="W/m²",
        category=VariableCategory.HYDROLOGY,
        provider=DataSourceProvider.NASA_POWER,
        description="Total latent energy flux consumed by land evaporation and plant transpiration.",
        spatial_resolution="0.5° x 0.625°",
        temporal_range="1981-01 to 2025-12",
        source_model_or_sensor="MERRA-2 Land Model",
        data_community="AG (Agroclimatology)",
    ),
    Variable(
        variable_id="MOD13Q1_NDVI",
        display_name="MODIS Normalized Difference Vegetation Index (NDVI)",
        unit="index",
        category=VariableCategory.VEGETATION,
        provider=DataSourceProvider.NASA_APPEEARS,
        description="Satellite-derived green vegetation density and canopy photosynthetic activity.",
        spatial_resolution="250m",
        temporal_range="2000-02 to 2025-12",
        source_model_or_sensor="Terra MODIS Instrument",
        data_community="LP DAAC",
    ),
    Variable(
        variable_id="MOD11A1_LST",
        display_name="MODIS Land Surface Temperature (Daytime)",
        unit="°C",
        category=VariableCategory.LAND_SURFACE,
        provider=DataSourceProvider.NASA_APPEEARS,
        description="Radiometric skin temperature of the land surface measured from thermal infrared bands.",
        spatial_resolution="1000m",
        temporal_range="2000-02 to 2025-12",
        source_model_or_sensor="Terra MODIS Instrument",
        data_community="LP DAAC",
    ),
    Variable(
        variable_id="NCEI_TAVG",
        display_name="NOAA Ground Station Average Temperature",
        unit="°C",
        category=VariableCategory.ATMOSPHERE,
        provider=DataSourceProvider.NOAA_NCEI,
        description="Direct physical thermometer measurements from surface meteorological station records.",
        spatial_resolution="Point Station Location",
        temporal_range="1950-01 to 2025-12",
        source_model_or_sensor="NOAA Global Historical Climatology Network (GHCN)",
        data_community="NCEI",
    ),
]

CURATED_PRODUCTS: list[SatelliteProduct] = [
    SatelliteProduct(
        product_id="MOD13Q1.061",
        platform="Terra MODIS",
        description="MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061",
        resolution="250m",
        temporal_granularity="16 day",
        available_layers=["_250m_16_days_NDVI", "_250m_16_days_EVI", "_250m_16_days_VI_Quality"],
    ),
    SatelliteProduct(
        product_id="MOD11A1.061",
        platform="Terra MODIS",
        description="MODIS/Terra Land Surface Temperature/Emissivity Daily L3 Global 1km Grid V061",
        resolution="1000m",
        temporal_granularity="Daily",
        available_layers=["LST_Day_1km", "LST_Night_1km", "QC_Day", "QC_Night"],
    ),
    SatelliteProduct(
        product_id="SPL4SMGP.007",
        platform="SMAP",
        description="SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root-Zone Soil Moisture Geophysical Data",
        resolution="9000m",
        temporal_granularity="3-hourly",
        available_layers=["sm_surface", "sm_rootzone", "soil_temp_layer1"],
    ),
]


class CatalogService:
    """Service providing variable definitions and satellite product metadata."""

    def list_variables(
        self,
        category: VariableCategory | None = None,
        provider: DataSourceProvider | None = None,
    ) -> list[Variable]:
        results = CURATED_VARIABLES
        if category:
            results = [v for v in results if v.category == category]
        if provider:
            results = [v for v in results if v.provider == provider]
        return results

    def get_variable_by_id(self, variable_id: str) -> Variable | None:
        for v in CURATED_VARIABLES:
            if v.variable_id.lower() == variable_id.lower():
                return v
        return None

    def list_products(self, platform: str | None = None) -> list[SatelliteProduct]:
        if not platform:
            return CURATED_PRODUCTS
        return [p for p in CURATED_PRODUCTS if platform.lower() in p.platform.lower()]
