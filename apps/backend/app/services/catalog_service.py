"""Catalog service aggregating curated variables and satellite products."""
from app.schemas.catalog import Variable, VariableCategory, DataSourceProvider, SatelliteProduct
from app.clients.appeears_client import AppEEARSClient
from app.core.exceptions import NotFoundError, UpstreamServiceError

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

class CatalogService:
    """Service providing supported variable definitions and live NASA products."""

    def __init__(self, appeears_client: AppEEARSClient | None = None) -> None:
        self.appeears_client = appeears_client or AppEEARSClient()

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

    async def list_products(self, platform: str | None = None) -> list[SatelliteProduct]:
        """Return products currently marked available by the NASA AppEEARS API."""
        products = await self.appeears_client.list_products()
        results = []
        for product in products:
            if product.get("Available") is not True or product.get("Deleted") is True:
                continue
            product_platform = product.get("Platform")
            if not isinstance(product_platform, str):
                continue
            if platform and platform.casefold() not in product_platform.casefold():
                continue
            product_id = product.get("ProductAndVersion")
            description = product.get("Description")
            resolution = product.get("Resolution")
            granularity = product.get("TemporalGranularity")
            if not all(isinstance(value, str) and value for value in (product_id, description, resolution, granularity)):
                continue
            results.append(SatelliteProduct(
                product_id=product_id,
                platform=product_platform,
                description=description,
                resolution=resolution,
                temporal_granularity=granularity,
            ))
        return results

    async def get_product(self, product_id: str) -> SatelliteProduct:
        """Return a live AppEEARS product and its available layers."""
        product = next(
            (item for item in await self.appeears_client.list_products()
             if item.get("ProductAndVersion") == product_id
             and item.get("Available") is True
             and item.get("Deleted") is not True),
            None,
        )
        if not product:
            raise NotFoundError(resource="AppEEARS product", identifier=product_id)
        metadata_fields = (
            product.get("ProductAndVersion"), product.get("Platform"),
            product.get("Description"), product.get("Resolution"),
            product.get("TemporalGranularity"),
        )
        if not all(isinstance(value, str) and value for value in metadata_fields):
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="The product catalog entry was missing required metadata.",
            )
        layer_metadata = await self.appeears_client.get_product_layers(product_id)
        layers = sorted(
            layer_name for layer_name, metadata in layer_metadata.items()
            if isinstance(layer_name, str)
            and isinstance(metadata, dict)
            and metadata.get("Available") is True
        )
        return SatelliteProduct(
            product_id=product["ProductAndVersion"],
            platform=product["Platform"],
            description=product["Description"],
            resolution=product["Resolution"],
            temporal_granularity=product["TemporalGranularity"],
            available_layers=layers,
        )
