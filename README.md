# TPBD — The Pale Blue Dot

**Data Detective para explorar tendencias en datos del sistema terrestre.**

TPBD es una propuesta de aplicación de escritorio para el reto [NASA Space Apps Challenge 2026: Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/). Ayudará a elegir variables y ubicaciones, explorar series históricas, cuantificar tendencias y revisar su significancia estadística.

> **Estado:** planificación v2.0. Este repositorio contiene el roadmap y el backlog; todavía no incluye una implementación ejecutable.

## Qué responderá

1. **¿Qué cambia?** Catálogo de variables con definición, unidad y fuente.
2. **¿Dónde cambia?** Globo 3D, lugares de ejemplo y selección de coordenadas.
3. **¿Cuánto cambia?** Pendiente robusta en unidades por década e intervalo de confianza.
4. **¿Es significativa la tendencia?** Método, evidencia, supuestos y límites en lenguaje claro.

## MVP propuesto

- Aplicación Windows con Tauri 2, React, TypeScript y Vite; API local FastAPI.
- Series históricas NASA POWER con períodos y faltantes explícitos.
- Catálogo inicial curado: temperatura a 2 m (T2M), precipitación corregida (PRECTOTCORR) y humedad relativa a 2 m (RH2M), sujetas a validación por ubicación y período.
- Análisis de tendencias mensuales que trata estacionalidad y autocorrelación, con pendiente de Sen y significancia estadística.
- Comparación de la misma variable entre dos ubicaciones compatibles.
- Caché y casos de demostración verificables.

GWETROOT y EVPTRNS son candidatas hidrológicas, sujetas a validar disponibilidad, resolución, comunidad, cobertura y unidades antes de incorporarlas. CMIP6 pasa a P2; anomalías Z-score y explicación asistida pasan a P1.

## Documentos

- [Roadmap técnico y de producto v2.0](ROADMAP_TPBD.md)
- [Historias de usuario y backlog v2.0](HISTORIAS_USUARIO_TPBD.md)

## Criterios científicos

- Las coordenadas se asocian a celdas y resoluciones de la fuente; no equivalen a mediciones exactas del punto.
- Los códigos de ausencia se convierten a valores nulos y no entran en los cálculos.
- Un resultado no significativo no demuestra que no haya cambio; datos o supuestos insuficientes producen “no evaluable”.
- La significancia estadística no demuestra causalidad ni importancia práctica.
- Cada resultado muestra fuente, período, método, unidad y limitaciones.

## Fuentes

- [Desafío oficial](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/)
- [NASA POWER Monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [Comunidades de datos NASA POWER](https://power.larc.nasa.gov/docs/methodology/communities/)
- [Fuentes hidrológicas NASA POWER](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/)
- [Artículo SeaWiFS/Giovanni de NASA NTRS](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf)

## Licencia

Pendiente de definir.
