# TPBD — Historias de Usuario y Backlog
## Data Detective | Requisitos funcionales y criterios de aceptación | v2.0

**Fecha:** 14 de noviembre de 2026  
**Estado:** planificación revisada para NASA Space Apps Challenge 2026; el repositorio aún no incluye la aplicación.  
**Prioridades:** P0 = MVP de 30 horas; P1 = mejora si el P0 está estable; P2 = posterior a la hackathon.  
**Capacidad:** 60 horas-persona. P0: 56 horas-persona (28 por integrante), con 4 de margen.

## Objetivo y definición compartida

TPBD ayuda a explorar variables NASA, elegir un lugar, ver una serie temporal y evaluar cuánto cambia y si la tendencia es estadísticamente significativa. La experiencia conserva Mission Control y posiciona el flujo como **Data Detective**.

Cada historia hereda esta definición de terminado: criterios verificables, manejo de errores/faltantes, integración, procedencia de datos, método documentado y revisión de otra persona. Ninguna cifra del panel puede separarse de la serie y fuente que la produjeron.

## Épica E1 — Aplicación, geografía y visualización

### HU-00 — Sistema visual Data Detective [P0]
**Como** estudiante o persona interesada en ciencias, **quiero** una interfaz clara para investigar variables, ubicaciones y tendencias, **para** entender la evidencia sin perder el contexto.

- **Responsable:** Brandon. **Estimación:** 2 h. **Depende de:** ninguna.
- **Tareas:** una pantalla de investigación, jerarquía de serie/resultados, leyendas, unidades, glosario breve y estados de carga/error/no evaluable.
- **CA-01:** la ubicación, variable, período, gráfico y resumen de tendencia se distinguen sin superposición en la resolución de demo.
- **CA-02:** toda cifra incluye unidad; la severidad o significancia no se comunica solo por color.
- **CA-03:** existe explicación textual para resultados significativos, no significativos y no evaluables.
- **CA-04:** controles principales se pueden usar con ratón y muestran foco visible.

### ~~HU-01 — Inicio y estructura Electron [P0]~~

**Estado:** completada. La ventana de Electron abre en Windows. La comprobación con la API real se retoma cuando HU-02 exponga `GET /health`.
**Como** usuario, **quiero** abrir TPBD como aplicación de escritorio, **para** explorar el análisis sin depender de una pestaña web.

- **Responsable:** Brandon. **Estimación:** 4 h. **Depende de:** ninguna.
- **Tareas:** Electron + React/TypeScript/Vite, scripts, ventana, seguridad inicial y prueba de WebGL y conexión con FastAPI.
- **CA-01:** el comando de desarrollo abre la aplicación con navegación inicial.
- **CA-02:** el frontend compila y puede llamar al backend local en desarrollo.
- **CA-03:** se documenta el arranque independiente de FastAPI para desarrollo y demo.
- **CA-04:** configuración inicial no contiene secretos.

### HU-05 — Globo planetario 3D [P0]
**Como** investigador, **quiero** explorar un globo y ubicar puntos, **para** dar contexto espacial a una serie ambiental.

- **Responsable:** Brandon. **Estimación:** 4 h. **Depende de:** HU-01.
- **Tareas:** integrar react-globe.gl, cámara, cuatro lugares preparados, interacción y perfil de gráficos reducido.
- **CA-01:** globo rota, admite zoom controlado y muestra los cuatro lugares con etiquetas.
- **CA-02:** elegir un lugar actualiza el estado geográfico compartido.
- **CA-03:** cambios de variable/fecha no crean renderizadores nuevos.
- **CA-04:** si WebGL falla, el selector geográfico 2D sigue siendo utilizable.

### HU-06 — Ubicaciones preparadas y coordenadas [P0]
**Como** usuario, **quiero** elegir un lugar preparado o coordenadas geográficas, **para** investigar cualquier punto compatible con la fuente.

- **Responsable:** Brandon. **Estimación:** 3 h. **Depende de:** HU-02, HU-05.
- **Tareas:** lista de regiones, selección en globo, entrada/selección de latitud-longitud, validación y estado bidireccional.
- **CA-01:** las coordenadas se validan dentro de latitud [-90, 90] y longitud [-180, 180].
- **CA-02:** lista, globo y coordenadas actualizan el mismo estado geográfico.
- **CA-03:** se muestra la coordenada solicitada y la celda/resolución de la fuente cuando esté disponible.
- **CA-04:** al cambiar ubicación se cancelan o ignoran respuestas tardías previas.
- **CA-05:** la interfaz no presenta la celda de grilla como medición puntual exacta.

### HU-07 — Selector temporal histórico [P0]
**Como** investigador, **quiero** elegir período histórico, **para** observar cambios a lo largo del tiempo.

- **Responsable:** Brandon. **Estimación:** 3 h. **Depende de:** HU-03.
- **Tareas:** selector de rango dentro del período disponible, etiquetas de cobertura y filtro/debounce.
- **CA-01:** el selector muestra únicamente fechas consultables según el parámetro.
- **CA-02:** faltantes permanecen como ausencias, nunca como cero.
- **CA-03:** ajustar el rango no dispara una petición por píxel de arrastre.
- **CA-04:** cambios de período refrescan gráfico, estadísticas y metadatos coherentemente.

### HU-08 — Catálogo y selector de variables [P0]
**Como** usuario, **quiero** buscar una variable y entender qué mide, **para** escoger datos adecuados a mi pregunta.

- **Responsable:** Brandon. **Estimación:** 2 h. **Depende de:** HU-00, HU-02.
- **Tareas:** catálogo corto de variables validadas, categorías sencillas, definiciones, unidades, comunidad, disponibilidad y glosario.
- **CA-01:** cada opción visible tiene identificador de fuente, nombre legible, unidad y definición.
- **CA-02:** el catálogo consulta/respeta disponibilidad por comunidad, nivel temporal y fuente.
- **CA-03:** parámetros no validados no aparecen como disponibles.
- **CA-04:** GWETROOT y EVPTRNS solo se habilitan después de validar endpoint, cobertura, unidades y resolución; RZMC volumétrico se distingue de fracción de humedad.
- **CA-05:** cambiar la variable conserva ubicación y rango temporal si son compatibles; en caso contrario explica la limitación.

### HU-09 — Panel de series y visualización de tendencia [P0]
**Como** usuario, **quiero** explorar la serie histórica con metadatos y una referencia de tendencia, **para** ver el comportamiento antes de interpretar el resultado estadístico.

- **Responsable:** Brandon. **Estimación:** 3 h. **Depende de:** HU-00, HU-03.
- **Tareas:** gráfica mensual, huecos, tooltip, unidades, fuente, período, coordenada/celda y superposición de pendiente cuando exista resultado válido.
- **CA-01:** cada punto representa el valor exacto de la respuesta normalizada.
- **CA-02:** los null producen discontinuidades y no líneas o valores falsos.
- **CA-03:** tooltip y resumen distinguen variable, unidad, ubicación, fecha y procedencia.
- **CA-04:** la línea de tendencia solo aparece para resultados evaluables y tiene leyenda.
- **CA-05:** la UI no etiqueta la pendiente como predicción ni como causalidad.

### HU-13 — Flujo integrado Mission Control / Data Detective [P0]
**Como** evaluador, **quiero** completar una investigación guiada, **para** entender cómo TPBD responde qué cambia, dónde, cuánto y con qué evidencia.

- **Responsable:** Brandon. **Estimación:** 2 h. **Depende de:** HU-06, HU-07, HU-08, HU-09, HU-18, HU-25.
- **Tareas:** conectar selección, consulta, gráfico, análisis, comparación y explicaciones.
- **CA-01:** desde inicio se elige una variable y ubicación sin refrescar la aplicación.
- **CA-02:** el usuario llega al resultado estadístico con método, cobertura y procedencia visibles.
- **CA-03:** comparación entre dos lugares mantiene parámetro/período compatibles.
- **CA-04:** un error de consulta no bloquea el resto de la aplicación.
- **CA-05:** el recorrido de demo puede completarse en menos de dos minutos.

## Épica E2 — Datos y análisis científico

### ~~HU-02 — Contratos, API y metadatos de catálogo [P0]~~
**Estado:** completada (PR #3). FastAPI en `apps/backend/`, esquemas Pydantic v2 derivados de OpenAPI 3.1, endpoints `/health`, `/api/v1/catalog/variables`, `/api/v1/catalog/products`, `/api/v1/regions`, y suite de pruebas pasando al 100%.

**Como** frontend, **quiero** contratos estables para variables, ubicaciones, series y resultados, **para** integrar UI y backend sin supuestos improvisados.

- **Responsable:** Daniel. **Estimación:** 5 h. **Depende de:** ninguna.
- **Tareas:** FastAPI, Pydantic, CORS local, /health, catálogo, consulta de metadatos, validación y errores.
- **CA-01:** /health retorna estado y versión.
- **CA-02:** cada variable documenta unidad, comunidad, resolución, disponibilidad temporal y fuente cuando esos metadatos existan.
- **CA-03:** coordenadas, parámetros y fechas inválidas devuelven errores 4xx descriptivos.
- **CA-04:** se publica contrato API y ejemplos JSON.
- **CA-05:** respuestas conservan procedencia y calidad.

### HU-03 — Consulta de series históricas NASA [P0]
**Como** investigador, **quiero** consultar series históricas documentadas, **para** analizar valores reales de NASA y sus modelos.

- **Responsable:** Daniel. **Estimación:** 6 h. **Depende de:** HU-02.
- **Tareas:** cliente NASA POWER Monthly Point, validación de parámetros y respuesta, reintentos limitados, endpoint histórico y metadatos de origen.
- **CA-01:** no se generan valores sintéticos para completar una serie.
- **CA-02:** respuesta incluye fecha, unidad, fuente, coordenada/celda y campo quality.
- **CA-03:** período disponible se registra por parámetro y no se asume el mismo inicio para todas las series.
- **CA-04:** timeout, ausencia o error no tumban FastAPI; se sirve caché verificable o mensaje claro.
- **CA-05:** una muestra se contrasta con la respuesta original del proveedor.

### HU-04 — Normalización, faltantes y caché [P0]
**Como** usuario, **quiero** consultar datos con rapidez y conocer su calidad, **para** explorar incluso con conectividad intermitente.

- **Responsable:** Daniel. **Estimación:** 4 h. **Depende de:** HU-03.
- **Tareas:** caché SQLite/JSON, normalización de ausencias y unidades, timestamp y procedencia.
- **CA-01:** la segunda consulta equivalente puede servirse desde caché y lo indica.
- **CA-02:** códigos como -999 se convierten a null antes de estadísticas.
- **CA-03:** fixtures conservan variable, fuente, resolución, ubicación, período y fecha de descarga.
- **CA-04:** modo sin red entrega solo datos guardados y los etiqueta.
- **CA-05:** productos/resoluciones incompatibles no se fusionan silenciosamente.

### HU-25 — Tendencia histórica y significancia [P0]
**Como** investigador, **quiero** cuantificar una tendencia y evaluar su evidencia, **para** distinguir una señal sostenida de fluctuaciones temporales.

- **Responsable:** Daniel. **Estimación:** 10 h. **Depende de:** HU-03, HU-04.
- **Tareas:** diseñar metodología; método estacional para datos mensuales; diagnóstico y ajuste documentado de autocorrelación; pendiente de Sen; intervalo de confianza; p-valor y explicación.
- **CA-01:** el resultado identifica serie, parámetro, ubicación, período, método, alfa y número/cobertura de muestras.
- **CA-02:** la prueba mensual trata la estacionalidad explícitamente (por ejemplo, Mann–Kendall estacional o método equivalente documentado).
- **CA-03:** se evalúa autocorrelación temporal; se aplica una corrección validada para el método o el resultado de significancia se marca exploratorio/no evaluable.
- **CA-04:** pendiente robusta se expresa en unidad original por década, con intervalo de confianza cuando esté disponible.
- **CA-05:** dirección usa estados diferenciados: tendencia significativa creciente/decreciente, sin evidencia suficiente de tendencia o no evaluable. No se equipara “no significativa” con “sin cambio”.
- **CA-06:** p-valor, alfa, método y advertencia sobre múltiples comparaciones se muestran en resultado.
- **CA-07:** longitud insuficiente, datos faltantes excesivos, varianza cero o supuestos no evaluables devuelven motivo legible, nunca NaN/Infinity ni una conclusión fabricada.
- **CA-08:** fixtures cubren tendencia positiva y negativa, serie sin tendencia, estacionalidad, autocorrelación, empates, faltantes y longitud insuficiente.
- **CA-09:** comparación con una herramienta estadística de referencia documentada antes de publicar el método.
- **Nota:** Mann–Kendall estacional + Sen es una decisión propuesta por TPBD, no una exigencia literal de NASA. El método de autocorrelación y el intervalo deben seleccionarse y probarse en la implementación.

### HU-18 — Comparador regional [P0]
**Como** usuario, **quiero** comparar la tendencia de una variable en dos lugares, **para** explorar cambios de dirección o magnitud entre regiones.

- **Responsable:** Brandon. **Estimación:** 3 h. **Depende de:** HU-06, HU-07, HU-08, HU-09, HU-25.
- **Tareas:** segunda ubicación, comparación de metadatos, dos series/resultados y diseño de diferencias.
- **CA-01:** ambas series usan el mismo parámetro y unidades compatibles.
- **CA-02:** período, frecuencia temporal, fuente y resolución se muestran y sus diferencias se explican.
- **CA-03:** cada ubicación conserva pendiente, intervalo, método y p-valor propios.
- **CA-04:** si períodos o productos no son comparables, se impide el veredicto conjunto y se informa por qué.
- **CA-05:** diferencias entre tendencias se describen sin atribuir una causa común ni implicar causalidad.

## Épica E3 — Demo, integración y calidad

### HU-14 — Modo demo sin internet [P0]
**Como** presentador, **quiero** ejecutar una investigación precargada de dos ubicaciones, **para** demostrar la aplicación sin depender de la red.

- **Responsable:** Daniel. **Estimación:** 1 h. **Depende de:** HU-04, HU-13, HU-25.
- **CA-01:** el caso preparado conserva fuente, fecha, parámetro, período y método.
- **CA-02:** la UI los marca como datos guardados/demo.
- **CA-03:** el resultado estadístico se reproduce a partir del fixture.
- **CA-04:** si fixture o método no son evaluables, la demo no muestra un veredicto de significancia.

### HU-15 — Integración, QA y entrega [P0]
**Como** equipo, **quiero** una aplicación estable y una investigación reproducible, **para** entregar una demo defendible.

- **Responsable:** Brandon y Daniel. **Estimación:** 4 h. **Depende de:** todas las demás historias P0. Brandon y Daniel dedican 2 h cada uno.
- **Tareas:** integración, contraste de respuestas, fallos de red, WebGL, fixtures, documentación y ensayo.
- **CA-01:** se realiza un recorrido de variable → lugar → serie → tendencia → comparación.
- **CA-02:** se revisan datos de origen, unidades, faltantes, procedencia y cálculo.
- **CA-03:** se ensaya con una serie con tendencia, otra no significativa y otra no evaluable.
- **CA-04:** la aplicación ofrece fallback si WebGL o la red no están disponibles.
- **CA-05:** README, contrato, metodología, límites y fuentes quedan actualizados.

## Épica E4 — Mejoras posteriores

### HU-10 — Detector estacional de anomalías [P1]
**Como** usuario, **quiero** identificar meses inusuales respecto a meses comparables, **para** explorar eventos que merecen análisis.

- Mantener como análisis complementario; no sustituye el análisis de tendencia.
- Baseline 1991–2020 cuando esté completa y disponible; z=(x−μ)/σ por mes calendario.
- Umbrales compuestos solo visibles y configurables; σ=0/muestras insuficientes/faltantes producen no evaluable.
- No inferir incendios, sequía confirmada ni causalidad a partir de Z-scores.

### HU-11 — Escenarios NASA CMIP6 [P2]
**Como** usuario, **quiero** explorar escenarios futuros publicados, **para** complementar el análisis histórico en una fase posterior.

- Integrar solo parámetros y escenarios disponibles y etiquetarlos como proyecciones de modelos.
- Conservar modelo, escenario, unidad, resolución, incertidumbre y fuente.
- No presentar proyecciones como observaciones o predicciones exactas.

### HU-12 — Selector SSP [P2]
- Selector para los escenarios realmente disponibles (ssp126, ssp245, ssp370).
- Afecta únicamente a datos proyectados; el histórico permanece separado.
- Mostrar “escenarios condicionales, no predicciones exactas”.

### HU-16 — Explicación científica asistida [P1]
- Resumir solo estadísticas y metadata recibidas; no inventar datos ni causalidad.
- Incluir citas/procedencia del resultado y alternativa determinista si el servicio no responde.

### HU-17 — Comparador temporal [P1]
- Contrastar dos rangos para el mismo lugar/variable con reglas explícitas de período y cobertura.

### HU-19 — Informes PDF [P2]
- Exportar series, método, resultados, fuentes y limitaciones en un informe trazable.

### HU-20 — Investigaciones guardadas [P2]
- Guardar consultas, variables, ubicaciones, rangos y referencias sin secretos.

### HU-21 — Radar global de tendencias [P2]
- Explorar tendencias en una malla solo después de validar costo estadístico, pruebas múltiples y resolución.

### HU-22 — Reproducción histórica animada [P1]
- Recorrer períodos disponibles con controles de reproducción; no inventar fechas faltantes.

### HU-23 — Simulador de intervención [P2]
- Investigación posterior; no modificar valores observados ni prometer causalidad sin modelo validado.

### HU-24 — Índice de estrés ambiental [P2]
- Requiere metodología publicada, variables compatibles y trazabilidad; no crear un índice ad hoc para el MVP.

## Matriz de planificación P0

| HU | Nombre | Responsable | Horas | Dependencias |
|---|---|---|---:|---|
| HU-00 | Sistema visual Data Detective | Brandon | 2 | — |
| ~~HU-01~~ | ~~Base Electron~~ | Brandon | 4 | Completada |
| ~~HU-02~~ | ~~API y catálogo~~ | Daniel | 5 | Completada |
| HU-03 | Series históricas | Daniel | 6 | HU-02 |
| HU-04 | Calidad y caché | Daniel | 4 | HU-03 |
| HU-05 | Globo 3D | Brandon | 4 | HU-01 |
| HU-06 | Lugares y coordenadas | Brandon | 3 | HU-02, HU-05 |
| HU-07 | Selector histórico | Brandon | 3 | HU-03 |
| HU-08 | Selector de variables | Brandon | 2 | HU-02 |
| HU-09 | Series y tendencia visual | Brandon | 3 | HU-03, HU-00 |
| HU-25 | Tendencia y significancia | Daniel | 10 | HU-03, HU-04 |
| HU-18 | Comparador regional | Brandon | 3 | HU-06, HU-07, HU-08, HU-09, HU-25 |
| HU-13 | Flujo Data Detective | Brandon | 2 | HU-06, HU-07, HU-08, HU-09, HU-18, HU-25 |
| HU-14 | Demo offline | Daniel | 1 | HU-04, HU-13, HU-25 |
| HU-15 | Integración y QA | Brandon y Daniel | 4 | Todas las P0 |
| **Total** | | | **56** | |

## Orden recomendado de implementación

1. Validar dataset, cobertura, comunidades, método y variables candidatas (Gate G0).
2. Avanzar HU-00 y HU-02 en paralelo y acordar contratos y fixtures. La base Electron de HU-01 ya está completada.
3. HU-03/04 y HU-05/06: vertical slice de datos y geografía.
4. HU-07/08/09: período, catálogo y series.
5. HU-25: método estadístico reproducible; bloquear el veredicto hasta cerrar validación.
6. HU-18/13: comparación y flujo de investigación.
7. HU-14/15: demo offline, QA y documentación; no agregar funciones al final.

**Kanban:** Backlog → Ready → In Progress → Review → QA → Done → Blocked. Etiquetas sugeridas: priority:P0, type:frontend/backend/data/stats/qa, owner:nombre, epic:E1..E4.

## Casos de aceptación integrales

1. Temperatura mensual en lugar A: el gráfico concuerda con los datos originales, metadatos y faltantes.
2. Serie con tendencia creciente: pendiente/unidad/década, método y evidencia se reproducen.
3. Serie estacional autocorrelacionada: se aplica la corrección documentada o no se declara significancia.
4. Serie corta o incompleta: se muestra no evaluable y su motivo.
5. Comparar dos puntos: variable, unidades, fuente, período y resolución se verifican antes de mostrar diferencias.
6. Cambiar rápido ubicación/variable no mezcla respuestas tardías.
7. Sin red: demo precargada conserva procedencia y resultado reproducible.
8. Sin WebGL: flujo 2D sigue accesible.
9. No se afirma que correlaciones o tendencias prueben causalidad.

## Nota de producto

TPBD es una herramienta exploratoria educativa, no un sistema de alerta temprana. “Significativo” describe evidencia estadística bajo un método y unos supuestos; no demuestra la causa, la importancia práctica ni el efecto futuro.
