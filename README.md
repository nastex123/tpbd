# TPBD — The Pale Blue Dot

TPBD es el concepto de un observatorio ambiental interactivo para explorar datos climáticos históricos, detectar anomalías estadísticas y comparar escenarios de cambio climático hasta 2050. La propuesta plantea una aplicación de escritorio para Windows con un globo 3D y un panel científico.

> **Estado:** planificación del MVP para una hackathon de 30 horas. Este repositorio contiene el roadmap y el backlog de producto; todavía no incluye la aplicación ni una implementación ejecutable.

## Qué propone el MVP

- Explorar cuatro ubicaciones de estudio en un globo 3D.
- Consultar series mensuales históricas de temperatura, precipitación y humedad relativa.
- Revisar anomalías estacionales con una línea base 1991–2020 y z-scores documentados.
- Comparar proyecciones CMIP6 bajo SSP1-2.6, SSP2-4.5 y SSP3-7.0 hasta 2050.
- Consultar procedencia, unidades, calidad y valores ausentes; usar datos en caché para una demostración sin conexión.

Las ubicaciones propuestas son la Amazonía (Manaos), La Guajira (Riohacha), el Sahel (Níger) y el sureste de Australia. Se deben validar las series disponibles antes de presentarlas como parte de la demo.

## Diseño previsto

- **Aplicación de escritorio:** Tauri 2, React, TypeScript y Vite.
- **Motor de datos:** Python y FastAPI.
- **Visualización:** `react-globe.gl` y Recharts.
- **Caché local:** SQLite o archivos JSON, según la decisión de implementación.
- **Fuentes climáticas:** NASA POWER Monthly Point para el contexto histórico y NASA POWER Projection API basada en NEX-GDDP-CMIP6 para escenarios futuros.

La arquitectura, el stack y las rutas de API descritos en los documentos son propuestas de planificación, no componentes ya implementados.

## Documentos

- [Roadmap técnico y de producto](ROADMAP_TPBD.md): visión, alcance, arquitectura propuesta, fases de trabajo, riesgos y criterios de entrega.
- [Historias de usuario y backlog](HISTORIAS_USUARIO_TPBD.md): requisitos, criterios de aceptación, estimaciones, dependencias y casos de prueba.

## Consideraciones científicas

- Los escenarios CMIP6 son resultados condicionales de modelos, no predicciones exactas.
- Los datos históricos pueden combinar observaciones, satélites y reanálisis según la variable; no se deben describir todos como mediciones directas.
- Una anomalía estadística señala un patrón inusual y no demuestra su causa ni confirma un desastre.
- Los códigos de ausencia, como `-999`, deben normalizarse a valores nulos y excluirse de cálculos.
- Temperatura del aire no mide directamente el deshielo glaciar ni la temperatura del mar.
- Resolución espacial, incertidumbre, período disponible, modelo y fuente deben mostrarse junto a los resultados.

## Fuentes de referencia

- [NASA POWER — Monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA POWER — Projection API](https://power.larc.nasa.gov/docs/services/api/projection/)
- [Tauri — Sidecars](https://v2.tauri.app/develop/sidecar/)

## Próximos pasos propuestos

1. Validar disponibilidad, unidades y períodos de las variables para cada ubicación.
2. Definir contratos API y fixtures tipados.
3. Probar el riesgo de empaquetar FastAPI como sidecar de Tauri.
4. Implementar una primera experiencia vertical: seleccionar una región y visualizar una serie verificable.
5. Avanzar por las prioridades y criterios de aceptación documentados en el backlog.

## Licencia

No se ha definido una licencia todavía.
