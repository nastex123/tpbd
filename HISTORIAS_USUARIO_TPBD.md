# TPBD — Historias de Usuario y Backlog
## Requisitos funcionales, criterios de aceptación y tareas técnicas

**Versión:** 1.0  
**Fecha:** 14 de noviembre de 2026  
**Priorización:** P0 = MVP; P1 = mejora si hay tiempo; P2 = siguiente versión.  
**Estimaciones:** horas-persona de trabajo, no duración secuencial. El evento dura 30 horas de reloj con tres personas.

## Estructura y lenguaje

- `CA`: criterio de aceptación verificable.
- `Dado / Cuando / Entonces`: escenario de aceptación.
- Las HU de P0 suman **78 horas-persona**; dejan aproximadamente **12 horas-persona** de reserva frente al máximo teórico de 90.
- Cada HU hereda esta definición de terminado: tipado/validación, tratamiento de errores, integración, prueba reproducible y revisión por un compañero.

---

## Épica E1 — Plataforma y experiencia visual

### HU-00 — Sistema visual Mission Control [P0]
**Como** investigador, **quiero** una interfaz coherente que muestre el globo, el timeline y el panel científico, **para** estudiar una región sin perder el contexto.

- **Responsable:** Dylan. **Estimación:** 5 h. **Depende de:** ninguna.
- **Tareas:** wireframe de pantalla principal, layout adaptable a escritorio, escala tipográfica, sistema de colores y alertas, diseño de tarjetas/gráficos, estados vacío/cargando/error; componentes reutilizables.
- **CA-01:** En resolución de demo, globo, timeline y panel son visibles y accesibles sin superponerse.
- **CA-02:** Cada variable tiene nombre, unidad y leyenda; no se comunica severidad solo por color.
- **CA-03:** Hay estados explícitos para sin selección, cargando, error de red y datos no disponibles.
- **CA-04:** Los controles son navegables con ratón y tienen foco visible para teclado.
- **Prueba:** capturas en tamaño de ventana de presentación y ventana reducida; recorrido manual de estados.

### HU-01 — Inicio y estructura Tauri [P0]
**Como** usuario, **quiero** abrir TPBD como aplicación de escritorio, **para** explorar información sin depender de una pestaña del navegador.

- **Responsable:** Brandon. **Estimación:** 5 h. **Depende de:** ninguna.
- **Tareas:** monorepo básico, Tauri 2 + React TS + Vite, scripts de desarrollo, ventana y título, configuración inicial de seguridad, smoke test de WebGL y spike de sidecar FastAPI/PyInstaller.
- **CA-01:** `npm run tauri dev` abre la app con navegación básica.
- **CA-02:** El frontend compila sin errores de TypeScript y puede consumir el backend en desarrollo.
- **CA-03:** Se registra decisión de empaquetado: sidecar validado o plan B documentado antes de H02.
- **CA-04:** El repositorio contiene README de arranque y `.gitignore`, sin secretos.
- **Prueba:** arranque limpio desde terminal en Windows del equipo de demo.

### HU-05 — Globo planetario 3D [P0]
**Como** investigador, **quiero** rotar y acercar un globo terráqueo, **para** localizar visualmente zonas de interés.

- **Responsable:** Brandon. **Estimación:** 7 h. **Depende de:** HU-01.
- **Tareas:** integrar `react-globe.gl`, cámara, textura liviana con atribución, cuatro puntos, interacción de selección, resaltado del punto seleccionado, perfil de calidad baja.
- **CA-01:** El globo rota, admite zoom controlado y muestra 4 marcadores con etiquetas.
- **CA-02:** Al seleccionar un marcador se emite `selectedRegionId` sin recargar la aplicación.
- **CA-03:** No genera instancias nuevas de renderizador en cada cambio de fecha/escenario.
- **CA-04:** Si falla WebGL, aparece selector alternativo de regiones utilizable.
- **Prueba:** seleccionar los 4 puntos consecutivamente y mover cámara en el equipo de presentación.

### HU-06 — Selección de regiones [P0]
**Como** usuario, **quiero** elegir una de cuatro regiones precargadas, **para** consultar rápidamente su información.

- **Responsable:** Brandon. **Estimación:** 3 h. **Depende de:** HU-02, HU-05.
- **Tareas:** catálogo tipado de regiones, selector lateral y enlace bidireccional con marcadores del globo.
- **CA-01:** Seleccionar desde lista o globo produce exactamente el mismo estado de región.
- **CA-02:** El panel muestra nombre, coordenadas aproximadas y contexto de la ubicación.
- **CA-03:** Al cambiar región se cancelan o ignoran respuestas tardías de la región anterior.
- **Prueba:** hacer cambios rápidos A→B→C y confirmar que no quedan datos mezclados.

### HU-07 — Timeline 1990–2050 [P0]
**Como** investigador, **quiero** desplazarme por el tiempo, **para** comparar el histórico y los escenarios futuros.

- **Responsable:** Brandon. **Estimación:** 5 h. **Depende de:** HU-03, HU-11 (consumir mocks antes de integración).
- **Tareas:** estado global año/mes/escenario, slider/timeline, etiquetas histórico/proyección, selección de valores, debounce o filtro local.
- **CA-01:** Desde 1990 hasta el último mes histórico disponible se muestran datos históricos cuando existen.
- **CA-02:** Desde 2027 hasta 2050 se muestran proyecciones identificadas con SSP y modelo; el intervalo entre fuentes no se rellena con valores inventados.
- **CA-03:** El cambio de fecha actualiza tarjetas y gráficos sin peticiones por cada píxel del arrastre.
- **CA-04:** Meses no disponibles aparecen como «Sin datos» y no como cero.
- **Prueba:** recorrer 1990, 2010, 2025, 2035 y 2050 observando la fuente correcta.

### HU-08 — Capas ambientales y leyendas [P0]
**Como** investigador, **quiero** alternar indicadores ambientales, **para** examinar distintos aspectos de una región.

- **Responsable:** Dylan. **Estimación:** 5 h. **Depende de:** HU-00, HU-05, HU-03.
- **Tareas:** conmutador `T2M`, `PRECTOTCORR`, `RH2M`, colores por indicador, leyenda con unidades y escala documentada, cambio de símbolo del marcador.
- **CA-01:** Cada selección muestra nombre legible, valor, unidad y escala.
- **CA-02:** Cambiar indicador no modifica región ni fecha seleccionadas.
- **CA-03:** Se evita comparar visualmente intensidades con escalas incongruentes.
- **CA-04:** Si falta el parámetro elegido se indica ausencia sin interpolar silenciosamente.
- **Prueba:** recorrer tres indicadores para cuatro regiones y dos fechas.

### HU-09 — Panel científico de series [P0]
**Como** usuario, **quiero** consultar cifras, curvas históricas y fuentes, **para** entender los cambios ambientales.

- **Responsable:** Dylan. **Estimación:** 5 h. **Depende de:** HU-00, HU-03.
- **Tareas:** Recharts, gráfica mensual, tarjetas de resumen, tooltip de fecha, variable y unidad, fuente NASA, distinción visual observación/proyección.
- **CA-01:** Cada punto del gráfico puede asociarse a un valor exacto de la respuesta API.
- **CA-02:** Las series con `null` muestran discontinuidades; no trazan valores falsos.
- **CA-03:** El tooltip distingue fecha, unidad, fuente y SSP cuando corresponda.
- **CA-04:** El panel responde a la región, variable y fecha seleccionadas.
- **Prueba:** contrastar 3 puntos de la gráfica con respuesta JSON normalizada.

### HU-12 — Selector de escenarios [P0]
**Como** investigador, **quiero** alternar escenarios de bajas, medias y altas emisiones, **para** comparar trayectorias futuras bajo hipótesis climáticas diferentes.

- **Responsable:** Dylan. **Estimación:** 3 h. **Depende de:** HU-11.
- **Tareas:** control de `ssp126`, `ssp245`, `ssp370`, leyenda explicativa, curvas simultáneas y resaltado de escenario activo.
- **CA-01:** El usuario puede elegir los tres SSP y ver qué curva corresponde a cada uno.
- **CA-02:** El selector únicamente afecta datos proyectados, no sobrescribe el histórico.
- **CA-03:** Se muestra un aviso visible: «Escenarios climáticos, no predicciones exactas».
- **Prueba:** comparar respuesta del endpoint y el escenario seleccionado.

### HU-13 — Flujo integrado Mission Control [P0]
**Como** evaluador, **quiero** completar un flujo guiado de investigación, **para** comprender el valor de TPBD en menos de dos minutos.

- **Responsable:** Brandon. **Estimación:** 4 h. **Depende de:** HU-06, HU-07, HU-09, HU-10, HU-11, HU-12.
- **Tareas:** conectar navegación, selección, anomalía, timeline, escenarios; mensaje contextual y transiciones de estado.
- **CA-01:** Desde pantalla inicial se puede seleccionar Amazonas, ver una anomalía, consultar variables y entrar a 2045.
- **CA-02:** En cada paso se distingue claramente información histórica, resultado estadístico y proyección.
- **CA-03:** Un error en un módulo no bloquea toda la aplicación.
- **CA-04:** El flujo completo se demuestra sin refrescar la app.
- **Prueba:** guion de demo de 120 segundos con acciones manuales y sin red.

---

## Épica E2 — Datos, estadística y clima

### HU-02 — Contratos y API base [P0]
**Como** desarrollador de frontend, **quiero** endpoints estables y documentados, **para** implementar la interfaz sin depender de cambios improvisados del backend.

- **Responsable:** Daniel. **Estimación:** 4 h. **Depende de:** ninguna.
- **Tareas:** FastAPI, Pydantic, CORS local, validación de query, `/health`, `/api/regions`, esquemas de series y errores.
- **CA-01:** `/health` retorna 200 y JSON con estado y versión.
- **CA-02:** `/api/regions` retorna cuatro entradas con ID, nombre, latitud y longitud válidos.
- **CA-03:** Parámetros inválidos (latitud fuera de rango, fechas inválidas, SSP desconocido) reciben error 4xx descriptivo.
- **CA-04:** Se publica `docs/api-contract.md` y ejemplos JSON para frontend.
- **Prueba:** pruebas FastAPI `TestClient` para rutas normales y validaciones.

### HU-03 — Consulta de datos históricos NASA [P0]
**Como** investigador, **quiero** consultar series mensuales históricas verificables, **para** analizar cómo variaron las condiciones ambientales.

- **Responsable:** Daniel. **Estimación:** 5 h. **Depende de:** HU-02.
- **Tareas:** cliente HTTP NASA POWER Monthly Point, validación de respuesta, reintentos limitados, conversión de estructura `parameter/date`, captura de procedencia, endpoint `/api/history`.
- **CA-01:** Para cada región P0 se obtienen las variables disponibles de la NASA, nunca valores sintetizados.
- **CA-02:** Respuesta normalizada contiene fecha, unidad, fuente y campo `quality`.
- **CA-03:** Una respuesta de error, ausencia o timeout no tumba FastAPI; se sirve caché verificable o mensaje de error.
- **CA-04:** Se registra el período real de datos disponible; no prometer automáticamente 2026 completo.
- **Prueba:** comparar una fecha y variable con JSON original descargado de NASA y testear respuesta incompleta.

### HU-04 — Normalización y caché [P0]
**Como** usuario, **quiero** consultar rápido datos previamente descargados, **para** utilizar la aplicación aunque NASA tarde o falle.

- **Responsable:** Daniel. **Estimación:** 4 h. **Depende de:** HU-03.
- **Tareas:** caché SQLite/JSON para cuatro puntos, conversión de `-999`/faltantes a `null`, manejo de unidades, metadatos de actualización, fallback.
- **CA-01:** La segunda consulta del mismo rango se responde desde caché.
- **CA-02:** Los valores de ausencia no entran en promedios ni se muestran como números reales.
- **CA-03:** Cada fixture conserva región, fecha de descarga, endpoint, variables y unidades.
- **CA-04:** En modo sin red se entrega lo cacheado con aviso «datos guardados».
- **Prueba:** consultar, cortar internet, repetir y confirmar origen cacheado.

### HU-10 — Detector estacional de anomalías [P0]
**Como** investigador, **quiero** detectar meses con calor anómalo y déficit relativo de precipitación, **para** identificar períodos que merecen atención.

- **Responsable:** Daniel. **Estimación:** 6 h. **Depende de:** HU-03, HU-04.
- **Tareas:** baseline 1991–2020 por mes, media, desviación estándar, z-score de cada variable, umbrales compuestos, severidad, explicación estadística y endpoint `/api/anomalies`.
- **CA-01:** Para un agosto se compara contra agostos de la baseline, no contra todos los meses.
- **CA-02:** Se calculan `z_t2m` y `z_precipitation`, con la fórmula documentada `z=(x-μ)/σ`.
- **CA-03:** Compuesta = `z_t2m >= 2` y `z_precipitation <= -1.5`; los umbrales se muestran en la metodología.
- **CA-04:** Si `σ=0`, faltan muestras suficientes o faltan datos, se devuelve `not_evaluable` y motivo, nunca NaN/Infinity.
- **CA-05:** La explicación no afirma que una anomalía causó incendios, pérdidas ni sequías confirmadas.
- **Prueba:** tests unitarios con fixtures fabricados para normal, positiva, compuesta, cero desviación y datos faltantes; contraste posterior con datos NASA reales.

### HU-11 — Escenarios NASA CMIP6 [P0]
**Como** investigador, **quiero** consultar tres trayectorias de clima futuro publicadas, **para** explorar resultados bajo distintos escenarios de emisiones.

- **Responsable:** Daniel. **Estimación:** 6 h. **Depende de:** HU-02, HU-04.
- **Tareas:** cliente Projection API Monthly Point, escenario/modelo `ensemble`, parser `parameter -> scenario -> date`, validación de disponibilidad, endpoint `/api/projections`, caché, etiquetado de procedencia.
- **CA-01:** Para una región validada se retorna al menos una serie 2027–2050 por los SSP disponibles.
- **CA-02:** `ssp126`, `ssp245`, `ssp370` corresponden a datos reales de la API y conservan identificador de escenario/modelo.
- **CA-03:** El año proyectado nunca se etiqueta como observación medida.
- **CA-04:** Datos faltantes y escenarios no disponibles se indican expresamente; no se interpolan valores sin método registrado.
- **CA-05:** La descripción advierte sobre resolución espacial, incertidumbre y carácter condicional de los escenarios.
- **Prueba:** cotejar respuesta normalizada de un mes 2045 con el JSON original de proyecciones y prueba de 422/timeout.

---

## Épica E3 — Demostración y calidad

### HU-14 — Modo demo sin internet [P0]
**Como** presentador, **quiero** ejecutar casos de estudio precargados, **para** demostrar TPBD sin depender de la conectividad del evento.

- **Responsable:** Dylan. **Estimación:** 3 h. **Depende de:** HU-04, HU-11, HU-13.
- **Tareas:** preparar cuatro presets reproducibles, verificar fixtures, avisos de fuente, guion de acciones y estado offline.
- **CA-01:** Los cuatro presets muestran historial y proyecciones verificadas desde disco.
- **CA-02:** La app informa cuándo usa caché y cuándo falta algún indicador.
- **CA-03:** El escenario principal de demo se ejecuta con internet desactivado.
- **CA-04:** Existen capturas/video y datos de respaldo si se avería el dispositivo.
- **Prueba:** cerrar la app, desconectar internet, abrirla y completar flujo de 2 minutos.

### HU-15 — Integración, QA y entrega [P0]
**Como** equipo, **queremos** una aplicación estable y presentable, **para** entregar una demostración reproducible al jurado.

- **Responsables:** Daniel (2 h), Brandon (3 h), Dylan (3 h). **Estimación total:** 8 h. **Depende de:** todas las P0.
- **Tareas:** smoke tests, validación cruzada de series, prueba de WebGL/bajo rendimiento, arranque de FastAPI sidecar, revisión de permisos Tauri, documentación, congelación de versión y ensayo.
- **CA-01:** No hay errores críticos que impidan completar el recorrido principal.
- **CA-02:** La app puede abrirse con el procedimiento de instalación/arranque documentado en el PC de demo.
- **CA-03:** Si se entrega instalador autónomo, Python arranca como sidecar y no requiere instalación separada; si no se logra, el límite se documenta y existe un lanzador de demo probado.
- **CA-04:** Hay README con fuentes, metodología, limitaciones y pasos de ejecución.
- **CA-05:** La demo funciona tres veces seguidas y una vez sin internet.
- **Prueba:** checklist firmada por los tres integrantes antes de la entrega.

---

## Épica E4 — Mejoras condicionales

### HU-16 — Diagnóstico explicativo con IA [P1, 5 h]
**Como** investigador, **quiero** un resumen entendible de una anomalía, **para** interpretar los indicadores sin analizar manualmente todas las cifras.
- **Responsables propuestos:** Daniel API (3 h), Dylan UI (2 h). **Depende de:** HU-10, HU-13.
- **Tareas:** servicio LLM opcional, prompt con valores exactos y referencia temporal, respuesta estructurada (hallazgo, evidencia, limitaciones), botón de generar, timeout y texto determinista alternativo.
- **CA-01:** El informe cita región, coordenadas, mes, z-scores, variables y baseline recibidos, sin alterar cifras.
- **CA-02:** No atribuye causalidad ni inventa eventos externos; si no hay evidencia, lo declara.
- **CA-03:** Sin API key o red, la UI presenta explicación estadística local.
- **CA-04:** No exponer claves en frontend, commits o instalador distribuido; usar proxy seguro o credencial aportada por usuario solo en demo controlada.

### HU-17 — Comparador temporal [P1, 4 h]
**Como** usuario, **quiero** escoger dos meses/años de una misma región, **para** observar diferencias cuantitativas.
- **Responsable propuesto:** Dylan. **Depende de:** HU-09.
- **CA-01:** Permite elegir fechas válidas y la misma variable.
- **CA-02:** Muestra diferencia absoluta y, cuando tenga sentido, relativa con unidad y fórmula.
- **CA-03:** No calcula diferencias si faltan valores o las series no son comparables.

### HU-18 — Comparador de regiones [P1, 5 h]
**Como** investigador, **quiero** comparar dos regiones, **para** contrastar su comportamiento con escalas equivalentes.
- **Responsable propuesto:** Brandon/Dylan. **Depende de:** HU-09, HU-06.
- **CA-01:** Se escogen regiones A/B e indicador común.
- **CA-02:** Los gráficos usan período, unidad y escala coherentes.
- **CA-03:** No se concluye automáticamente que las diferencias tengan una causa determinada.

### HU-19 — Informes PDF [P2, 6 h]
**Como** investigador, **quiero** exportar un resumen en PDF, **para** compartir los resultados.
- **Responsables propuestos:** Daniel/Dylan. **Depende de:** HU-09, HU-10, HU-11.
- **CA-01:** PDF incluye región, fechas, métricas, gráficos, fuentes, metodología y limitaciones.
- **CA-02:** Los datos y las proyecciones mantienen sus etiquetas y unidades.
- **CA-03:** Exportación funciona sin conexión cuando toda la evidencia está cacheada.

### HU-20 — Investigaciones guardadas [P2, 4 h]
**Como** usuario, **quiero** guardar mis regiones, escenarios y observaciones, **para** retomar la investigación.
- **Responsable propuesto:** Brandon. **Depende de:** HU-13.
- **CA-01:** Guarda/restaura región, variable, rango y escenario sin corromper datos.
- **CA-02:** Permite ver y borrar entradas guardadas.
- **CA-03:** La persistencia es local y documentada.

### HU-21 — Radar global y puntos de inflexión [P2, 8 h]
**Como** investigador, **quiero** ver una vista espacial de múltiples anomalías y cambios de tendencia, **para** priorizar regiones para investigar.
- **Responsable propuesto:** Daniel/Brandon. **Depende de:** HU-10, HU-05.
- **CA-01:** Todo punto representado tiene datos geográficos y período conocido; no se infieren áreas globales desde cuatro puntos.
- **CA-02:** Los puntos de cambio usan un método estadístico especificado y muestran incertidumbre.
- **CA-03:** El mapa diferencia cobertura muestreada de áreas sin datos.

### HU-22 — Reproducción histórica animada [P1, 3 h]
**Como** investigador, **quiero** reproducir los años de forma automática, **para** observar la evolución temporal.
- **Responsable propuesto:** Brandon. **Depende de:** HU-07.
- **CA-01:** Botones reproducir/pausar y velocidad tienen efecto real y no bloquean la interfaz.
- **CA-02:** La animación utiliza datos cargados previamente y puede detenerse sin perder fecha.

### HU-23 — Simulador paramétrico de intervención [P2, investigación adicional]
**Como** investigador, **quiero** experimentar con hipótesis de intervención, **para** comprender sensibilidades hipotéticas.
- **Responsable propuesto:** Equipo de datos/IA. **Depende de:** definir un modelo causal calibrado y fuentes externas suficientes.
- **CA-01:** Cada slider identifica qué variable altera, el modelo utilizado y sus supuestos.
- **CA-02:** No se mapea arbitrariamente «-20 % de deforestación» a «-X °C» como si NASA POWER lo estimara.
- **CA-03:** Los resultados se rotulan como escenarios hipotéticos, no predicciones verificadas.

### HU-24 — Índice exploratorio de estrés ambiental [P2, 5 h]
**Como** investigador, **quiero** un indicador compuesto y explicable, **para** identificar meses con señales concurrentes de calor y falta de agua atmosférica.
- **Responsable propuesto:** Daniel. **Depende de:** HU-10, HU-09.
- **Tareas:** normalización estacional, selección de variables, regla de puntuación visible, representación y prueba de sensibilidad.
- **CA-01:** Se muestran fórmula, umbrales, baseline, variables y pesos del índice.
- **CA-02:** El indicador se rotula «índice exploratorio», no como una métrica oficial de NASA ni diagnóstico de sequía validado.
- **CA-03:** Si falta un componente esencial, se indica «no evaluable» en vez de producir una puntuación aparentemente exacta.
- **CA-04:** Los valores pueden rastrearse a sus series climáticas y período de referencia.

---

## Matriz de planificación P0

| HU | Nombre | Owner | Horas | Dependencias |
|---|---|---|---:|---|
| HU-00 | Sistema visual | Dylan | 5 | — |
| HU-01 | Base Tauri/React | Brandon | 5 | — |
| HU-02 | API y contrato | Daniel | 4 | — |
| HU-03 | Histórico NASA | Daniel | 5 | HU-02 |
| HU-04 | Normalización/caché | Daniel | 4 | HU-03 |
| HU-05 | Globo 3D | Brandon | 7 | HU-01 |
| HU-06 | Regiones | Brandon | 3 | HU-02, HU-05 |
| HU-07 | Timeline | Brandon | 5 | HU-03, HU-11 (mocks) |
| HU-08 | Capas | Dylan | 5 | HU-00, HU-05, HU-03 |
| HU-09 | Gráficas | Dylan | 5 | HU-00, HU-03 |
| HU-10 | Anomalías | Daniel | 6 | HU-03, HU-04 |
| HU-11 | CMIP6 | Daniel | 6 | HU-02, HU-04 |
| HU-12 | Selector SSP | Dylan | 3 | HU-11 (mocks) |
| HU-13 | Mission Control | Brandon | 4 | HU-06, HU-07, HU-09, HU-10, HU-11, HU-12 |
| HU-14 | Demo offline | Dylan | 3 | HU-04, HU-11, HU-13 |
| HU-15 | QA/release | Equipo | 8 | Todas las P0 |
| **Total** | | | **78** | |

## Orden recomendado de tickets (GitHub Projects o tablero Kanban)

1. Abrir tickets de HU-00, HU-01 y HU-02 como trabajo paralelo inicial.
2. Congelar contratos y fixtures. Marcar G0 antes de avanzar.
3. Crear rama principal protegida y ramas `feat/HU-XX-nombre` con PR pequeños.
4. Durante H02–H12: HU-03/04/05/06/08/09; abrir HU-07 con mocks.
5. Durante H12–H18: HU-10/11/12, integrar gráfica histórica/proyección.
6. Durante H18–H23: HU-13/14.
7. Durante H23–H30: HU-15 y demo, sin agregar features.

**Estados Kanban:** Backlog → Ready → In Progress → Review → QA → Done → Blocked (solo cuando haya impedimento real).

**Etiqueta recomendada:** `priority:P0`, `type:frontend|backend|data|qa`, `owner:<nombre>`, `epic:E1..E4`.

## Casos de prueba integrales

1. Seleccionar la región Amazonas, temperatura, agosto 2019: el UI coincide con JSON histórico o indica que no existe.
2. Consultar anomalías: el cálculo usa exactamente el mes calendario y baseline 1991–2020.
3. Ir a 2045 y alternar SSP: la gráfica distingue resultados de escenarios; nunca aparece como «dato medido».
4. Seleccionar una región y cambiar rápidamente de año: no deben quedar valores de la región anterior.
5. Cambiar a precipitación: unidad, escala, leyenda y tooltip cambian correctamente.
6. Simular `-999` y fallo NASA: nunca se dibuja un extremo falso o `NaN`.
7. Desconectar internet, reiniciar y hacer recorrido de los cuatro presets.
8. Probar WebGL inhabilitado: se mantiene selección y panel.
9. Ejecutar la aplicación tres veces y comprobar que no quedan procesos backend duplicados.
10. Ensayar pitch de máximo 120 segundos con un único caso y un escenario alternativo.

## Nota final de producto

No prometer detección de incendios, estado de arrecifes o pérdida de hielo sin sensores/datasets específicos. Una anomalía estadística en temperatura + precipitación permite señalar un patrón inusual, no demostrar su causa. El valor del proyecto está en hacer entendible, reproducible y explorable una evidencia climática auténtica.
