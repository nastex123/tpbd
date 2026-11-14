# TPBD — The Pale Blue Dot
## Roadmap técnico y de producto | v2.0 | NASA Space Apps Challenge 2026

**Fecha:** 14 de noviembre de 2026  
**Estado:** planificación revisada; implementación aún no incluida en este repositorio.  
**Reto:** [Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/)  
**Equipo:** Brandon (aplicación y visualización), Daniel (datos y análisis).

## 1. Visión

TPBD convierte la exploración de datos del sistema terrestre en una investigación guiada y accesible. El usuario selecciona una variable y una ubicación, examina una serie histórica, calcula cuánto cambia y ve si la evidencia respalda una tendencia estadísticamente significativa.

**Flujo principal:** elegir variable → elegir lugar → explorar la serie → cuantificar la tendencia → revisar la evidencia y sus límites.

El producto conserva el concepto Mission Control y lo enfoca como **Data Detective**. El globo y las gráficas ayudan a investigar; el análisis estadístico es tan importante como la visualización.

### Preguntas que responde

1. **¿Qué cambia?** Variable, unidad y fuente.
2. **¿Dónde cambia?** Coordenadas o región preparada, con la celda de datos usada.
3. **¿Cuánto cambia?** Pendiente robusta en unidades por década y su intervalo de confianza.
4. **¿La tendencia es significativa?** Prueba, valor p, supuestos y limitaciones en lenguaje claro.

## 2. Alcance priorizado

### P0 — MVP de 30 horas

1. Aplicación de escritorio Windows con Tauri 2, React, TypeScript y Vite; API local FastAPI.
2. Globo 3D con cuatro lugares de ejemplo y selección de coordenadas geográficas.
3. Catálogo curado de variables NASA, con definiciones, unidad, comunidad, resolución, cobertura y fuente.
4. Series históricas mensuales consultables en coordenadas y lugares preparados; faltantes y cobertura explícitos.
5. Visualización de la serie con fecha, unidades, procedencia, período y línea de tendencia.
6. Análisis de tendencia: método estacional para series mensuales, pendiente de Sen, incertidumbre, significancia y revisión de autocorrelación.
7. Comparación de la misma variable entre dos ubicaciones con período, unidad, fuente y resolución compatibles.
8. Veredicto científico comprensible, estados no evaluables y modo demo con un caso validado que compara dos ubicaciones.
9. Documentación metodológica, referencias y demostración reproducible.

**Variables iniciales:** temperatura del aire a 2 m (T2M), precipitación corregida (PRECTOTCORR) y humedad relativa del aire a 2 m (RH2M), sujetas a validar disponibilidad real por lugar y período. **GWETROOT** (fracción de humedad del suelo en zona radicular) y **EVPTRNS** (transpiración) son candidatas del catálogo hidrológico: solo entran al MVP si se valida su comunidad, frecuencia, cobertura, unidades y compatibilidad con el endpoint. No confundir fracción de humedad del suelo con contenido volumétrico.

### P1 — Si el P0 está estable

- Detector estacional de anomalías Z-score como herramienta complementaria a las tendencias.
- Asistente explicativo opcional, anclado en resultados calculados y fuentes visibles.
- Comparador temporal, reproducción de la serie y búsqueda asistida de variables.
- Ampliación del catálogo con datasets NASA ya validados.

### P2 — Después de la hackathon

- Proyecciones NASA POWER CMIP6 hasta 2100, rotuladas como escenarios condicionales.
- Exportación PDF, investigaciones guardadas, análisis por lotes y mapa continuo de tendencias.
- Índices compuestos y simulaciones paramétricas, solo con metodología y datos apropiados.

## 3. Base científica y tratamiento de datos

- **Fuente de MVP:** NASA POWER Monthly Point para variables y períodos disponibles. POWER sirve parámetros de distintas comunidades; la disponibilidad temporal y espacial cambia según parámetro. No asumir que todas las variables empiezan en el mismo año ni comparten resolución.
- **Localización:** la API usa una celda de grilla para las coordenadas solicitadas. Mostrar coordenada consultada, coordenada/celda representativa y resolución cuando la respuesta lo permita; no describir el resultado como medición exacta del punto.
- **Catálogo:** consultar metadatos de comunidad y nivel temporal antes de ofrecer una variable. Para hidrología, registrar fuente, resolución, cobertura y posibles cambios de producto. Si se combinan productos, señalar los límites de comparabilidad.
- **Estacionalidad:** aplicar un método estacional a datos mensuales o retirar/documentar el ciclo estacional antes de evaluar tendencia. No mezclar meses con ciclos distintos en una sola prueba sin ajuste.
- **Autocorrelación:** comprobar dependencia serial (al menos lag 1) y utilizar una corrección estadística documentada compatible con el método. Si no se puede evaluar o corregir de forma defendible, no emitir un veredicto de significancia; mostrar el resultado como exploratorio/no evaluable.
- **Pendiente:** estimador de Sen en unidades originales por década. Mostrar intervalo de confianza del 95% cuando el método lo permita. No presentar una tasa como evidencia por sí sola.
- **Significancia:** nivel nominal inicial alfa=0.05, método y valor p visibles. La significancia estadística no implica importancia práctica, causalidad ni atribución de causa. Advertir sobre pruebas múltiples cuando se exploran muchas variables/lugares.
- **Calidad:** normalizar códigos de ausencia, por ejemplo -999, a null. No interpolar ni rellenar valores en silencio; no incluir ausencias en cálculos. La cobertura corta, huecos, varianza cero o datos insuficientes producen estado no evaluable y motivo.
- **Alcance del método:** el reto admite métodos básicos y cita t-test, Mann–Kendall o intervalos de confianza como ejemplos. TPBD propone una prueba estacional de Mann–Kendall y pendiente de Sen, pero no las presenta como método obligatorio de NASA. La implementación debe fijar y validar el método de ajuste por autocorrelación antes de publicar resultados.

## 4. Arquitectura propuesta

~~~mermaid
flowchart TD
    U[Usuario Data Detective] --> T[Tauri 2 / WebView]
    T --> R[React + TypeScript]
    R --> V[Globo + selector + series + comparador]
    R --> F[FastAPI local en 127.0.0.1]
    F --> C[Catálogo, validación y procedencia]
    C --> D[Cliente NASA POWER histórico]
    C --> K[Caché local SQLite o JSON]
    D --> N[Normalización y control de calidad]
    N --> S[Prueba estacional + pendiente de Sen]
    S --> R
    F -. P1 .-> A[Explicación asistida opcional]
    F -. P2 .-> P[NASA POWER CMIP6]
~~~

**Seguridad local:** API enlazada únicamente a 127.0.0.1; validar entradas, limitar CORS, no incluir secretos en frontend, repositorio o instalador.

### Estructura sugerida

~~~text
TPBD/
├── apps/desktop/            # Tauri 2 + React + TypeScript
├── services/climate-engine/ # FastAPI, clientes, análisis y pruebas
├── data/fixtures/            # Ejemplos con procedencia
├── docs/                     # contrato API, catálogo y metodología
└── README.md
~~~

### Contratos de datos

- **Variable:** identificador, nombre legible, unidad, comunidad, resolución, período y fuente.
- **Serie:** parámetro, ubicación, coordenada/celda consultada, fechas, valores nullable, calidad y procedencia.
- **Resultado de tendencia:** dirección (increasing, decreasing, no_trend, not_evaluable), método, pendiente/unidad/década, intervalo, estadístico, p-valor, alfa, cobertura y diagnóstico de autocorrelación.
- **Comparación:** dos resultados calculados con el mismo parámetro, método, unidades compatibles y período comparable.

## 5. Capacidad y estimación inicial

El evento dura 30 horas. El equipo dispone de 60 horas-persona y planifica 56 para P0, con 4 de margen.

| Integrante | Foco | Horas P0 |
|---|---|---:|
| Brandon | Tauri, globo, coordenadas, interfaz, gráficas, comparación, integración y QA | 28 |
| Daniel | API, catálogo, series, caché, estadística, datos de demo y QA | 28 |
| **Total** | | **56** |

Las estimaciones son horas-persona orientativas, no resultados ni garantía de entrega. Si el análisis estadístico o los datos reales fallan, reducir variables y casos antes que simular significancia.

## 6. Plan de ejecución por ventanas

### H00–H02 | Validar riesgos

- Daniel: consultar disponibilidad real de T2M, PRECTOTCORR, RH2M y candidatas hidrológicas en dos coordenadas; registrar unidades, comunidad, cobertura y resolución.
- Brandon: crear shell Tauri, probar WebGL, selector de coordenadas y riesgo de sidecar.
- Brandon: bosquejar una sola pantalla de investigación con catálogo corto y estados de evidencia.
- **Gate G0:** fuente y variables mínimas confirmadas; método estadístico preliminar documentado; aplicación arranca.

### H02–H07 | Contratos y primera vertical

- Congelar contrato de variable, serie, ubicación y procedencia.
- Consultar una variable histórica de un punto y verla en el panel.
- Selección del globo vinculada al estado de ubicación.
- **Gate G1:** una consulta verificable se puede explorar sin refrescar la app.

### H07–H13 | Histórico y geografía

- Añadir normalización, faltantes, caché y catálogo curado.
- Seleccionar lugar preparado o coordenadas; mostrar resolución y período.
- Graficar fechas, unidades, fuente y huecos.
- **Gate G2:** dos lugares y una variable, con respuestas trazables y compatibles.

### H13–H19 | Estadística

- Implementar prueba estacional, ajuste/diagnóstico de autocorrelación y pendiente de Sen.
- Validar series con tendencia positiva, negativa, nula, autocorrelación, faltantes y cobertura insuficiente.
- Mostrar pendiente por década, intervalo, p-valor, método y limitaciones.
- **Gate G3:** el resultado se reproduce desde fixtures y está respaldado por metodología explicable.

### H19–H25 | Comparación y flujo

- Comparar dos ubicaciones para una variable y período compatibles.
- Distinguir diferencias en dirección y magnitud sin atribución causal.
- Integrar catálogo → mapa → serie → resultado → comparación.
- **Gate G4:** demo completa en menos de 2 minutos y con resultado honesto si no hay evidencia.

### H25–H30 | Resiliencia y entrega

- Daniel prepara los datos del caso de demo y Brandon lo integra en la interfaz. Ambos revisan el flujo, los estados de error y la alternativa a WebGL.
- Verificar metadatos, unidades, faltantes, metodología y documentación.
- Congelar alcance, ensayar pitch y preparar video/capturas de respaldo.
- **Gate G5:** aplicación demostrable con datos y resultados precargados verificables.

## 7. Dependencias

~~~mermaid
flowchart LR
  A[HU-01 Shell] --> B[HU-05 Globo]
  C[HU-02 API y catálogo] --> D[HU-03 Histórico]
  D --> E[HU-04 Calidad y caché]
  B --> F[HU-06 Ubicación]
  D --> G[HU-09 Series]
  E --> H[HU-25 Tendencias]
  G --> H
  F --> I[HU-18 Comparación]
  H --> I
  G --> J[HU-08 Veredicto UI]
  H --> J
  I --> K[HU-13 Flujo Data Detective]
  J --> K
  K --> L[HU-14 Demo]
  L --> M[HU-15 QA y entrega]
~~~

## 8. Rendimiento y degradación

- Perfil gráfico bajo; cuatro presets y consulta por coordenadas.
- Catálogo pequeño y validado, no un selector de cientos de variables sin soporte.
- Debounce del mapa/selector y caché local para la demo.
- Sin red: etiquetar datos precargados como demo y conservar procedencia.
- Sin WebGL: lista/selector 2D mantiene acceso a las mismas series y resultados.
- Sin cobertura, sin muestras suficientes o con supuestos no válidos: explicar “no evaluable”.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación | Plan B |
|---|---|---|
| Parámetro ausente para lugar/período | Validar temprano por comunidad y nivel temporal | Reducir catálogo a parámetros probados |
| Resolución o fuente inconsistente | Mostrar metadata y bloquear comparaciones incompatibles | Comparar solo series homologables |
| Estacionalidad/autocorrelación distorsionan p | Método y corrección documentados; pruebas y diagnóstico | Resultado exploratorio o no evaluable |
| Huecos o registro demasiado corto | Reportar cobertura y requerir mínimo documentado | Mostrar serie sin significancia |
| Sidecar de Python falla | Probarlo en H00–H02 | Demo en equipo configurado con backend local |
| WebGL/GPU no disponible | Perfil bajo y fallback | Lista geográfica 2D |
| Alcance excedido | Proteger el P0 y las gates | Retirar IA, CMIP6 y variables no validadas |
| Narrativa causal sin evidencia | Redacción de asociación/tendencia únicamente | Retirar explicaciones causales |

## 10. Definición de terminado

Una historia se cierra cuando sus criterios son reproducibles, los errores y faltantes son visibles, tipos y contratos coinciden, los datos llevan procedencia, el análisis tiene método documentado y otro integrante revisa el resultado. Toda cifra de tendencia debe poder rastrearse a la serie y versión de datos que la originaron.

### Entregables

- Aplicación Tauri/React ejecutable para la demo y API FastAPI.
- Catálogo de variables realmente validadas, fixtures con procedencia y método estadístico reproducible.
- README, contrato API, metodología y limitaciones.
- Guion Data Detective de 2 minutos, modo demo local y video de respaldo.

## 11. Indicadores de éxito

1. Elegir variable y ubicación actualiza serie, unidades, fuente y cobertura.
2. Una serie mensual válida muestra tendencia, pendiente por década, incertidumbre y prueba.
3. La salida distingue tendencia significativa, no significativa y no evaluable.
4. La autocorrelación y estacionalidad se controlan o se declaran limitaciones.
5. Dos regiones se comparan con variable, unidades, período y método compatibles.
6. Los datos del demo y resultados estadísticos se reproducen sin red.
7. La demo responde las cuatro preguntas del reto sin atribuir causas no demostradas.

## 12. Después de la hackathon

- **P1:** anomalías estacionales, asistente basado en evidencia, catálogo extendido.
- **P2:** proyecciones CMIP6, mapa continuo, exportación e investigaciones guardadas.
- Investigar variables y productos hidrológicos de mayor resolución con comparabilidad y cobertura documentadas.

**Fuentes principales:** [Desafío oficial](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/), [NASA POWER Monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/), [comunidades de datos POWER](https://power.larc.nasa.gov/docs/methodology/communities/), [fuentes hidrológicas POWER](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/), [artículo SeaWiFS/Giovanni de NASA NTRS](https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf).
