# Manual del Proyecto BKSync Dashboard

## 1. Resumen Ejecutivo

BKSync Dashboard es una aplicacion web de monitoreo operativo para respaldos ejecutados con AWS DataSync. El sistema permite visualizar el estado de transferencias, historiales de ejecucion, metricas de rendimiento, errores, logs de CloudWatch y separacion funcional por modulos de respaldo.

El proyecto esta construido como una Single Page Application con React 19, Vite, TypeScript y Material UI. Consume una API expuesta por API Gateway que, por el contrato observado, esta respaldada por una funcion AWS Lambda encargada de consultar DataSync y CloudWatch, consolidar la informacion y devolverla en formato JSON.

La aplicacion esta orientada a operaciones de backup institucionales, principalmente:

- Modulo APPROD: monitoreo de discos D, E, F, G, H e I.
- Modulo Oracle: monitoreo del backup Oracle.
- Visualizacion de estado actual y ultimas ejecuciones.
- Deteccion de errores y acceso a evidencias tecnicas.
- Autenticacion opcional mediante Amazon Cognito.

## 2. Objetivo del Sistema

El objetivo del sistema es centralizar en una interfaz web el estado de las tareas AWS DataSync utilizadas para respaldos, evitando que el equipo operativo tenga que revisar manualmente multiples pantallas de AWS.

La plataforma permite responder rapidamente preguntas como:

- Que tareas de backup se ejecutaron correctamente.
- Que discos o modulos presentan errores.
- Cuanto volumen de datos fue transferido.
- Cual fue la velocidad promedio de transferencia.
- Que ejecuciones historicas fallaron.
- Que mensaje tecnico reporto DataSync.
- Si existen logs de CloudWatch relacionados con la falla.

## 3. Stack Tecnologico

| Capa | Tecnologia | Uso |
| --- | --- | --- |
| Frontend | React 19 | Construccion de la SPA |
| Build tool | Vite 6 | Desarrollo local, build y preview |
| Lenguaje | TypeScript 5 | Tipado estricto y mantenibilidad |
| UI | Material UI 7 | Componentes visuales, layout y tema |
| Estilos | Emotion, MUI CSS variables | Theming, modo claro/oscuro |
| Graficos | ApexCharts, react-apexcharts | Widgets y graficas compactas |
| Routing | react-router / react-router-dom 7 | Rutas publicas, privadas y lazy loading |
| Autenticacion | Amazon Cognito, OIDC | Login/logout opcional |
| Backend consumido | API Gateway + Lambda | Endpoint de datos DataSync |
| AWS monitoreado | DataSync, CloudWatch Logs | Tareas, ejecuciones, errores y logs |
| Calidad | ESLint, Prettier, TypeScript | Linting, formato y chequeo de tipos |
| Hosting | Vercel compatible | Rewrites para SPA |

## 4. Estructura General del Proyecto

```text
datasync-ui/
  public/
    assets/
      aws/                  # Iconos AWS usados en el dashboard
      logo/                 # Logos institucionales
      images/               # Assets heredados del template Minimal UI
      icons/                # Iconos de navegacion y UI
  src/
    _mock/                  # Datos demo heredados del template
    auth/                   # Configuracion Cognito y guard de rutas
    components/             # Componentes reutilizables
    layouts/                # Layouts de dashboard, auth y estructura base
    pages/                  # Paginas enrutadas
    routes/                 # Definicion de rutas y helpers
    sections/               # Vistas funcionales por seccion
    theme/                  # Tema MUI, paleta, tipografia, sombras
    utils/                  # Formateadores numericos y de fecha
    app.tsx                 # Wrapper raiz de la app
    main.tsx                # Punto de entrada React
  dist/                     # Build generado
  .env                      # Variables de entorno locales
  package.json              # Dependencias y scripts
  vite.config.ts            # Configuracion Vite
  vercel.json               # Rewrites para despliegue SPA
  tsconfig.json             # Configuracion TypeScript
  eslint.config.mjs         # Configuracion ESLint
```

## 5. Flujo de Arranque de la Aplicacion

El arranque inicia en `src/main.tsx`.

Flujo principal:

1. React monta la aplicacion en el elemento `#root` del `index.html`.
2. Se crea un `createBrowserRouter` con `routesSection`.
3. Se envuelve todo con `App`, que aplica el tema global y resetea el scroll al cambiar de ruta.
4. Si Cognito esta configurado y habilitado, se envuelve el router con `AuthProvider` de `react-oidc-context`.
5. Si Cognito no esta habilitado, la aplicacion funciona sin autenticacion.

Archivo clave:

```tsx
src/main.tsx
```

La decision de activar Cognito depende de `isCognitoConfigured()`, definida en `src/auth/cognito.ts`.

## 6. Rutas del Proyecto

Las rutas estan definidas en `src/routes/sections.tsx`.

| Ruta | Componente | Funcion |
| --- | --- | --- |
| `/` | Redirect | Redirige a `/approd` |
| `/approd` | `ApprodPage` | Dashboard de backups APPROD |
| `/oracle` | `OraclePage` | Dashboard del backup Oracle |
| `/user` | `UserPage` | Pagina heredada/demo del template |
| `/products` | `ProductsPage` | Pagina heredada/demo del template |
| `/blog` | `BlogPage` | Pagina heredada/demo del template |
| `/sign-in` | `SignInPage` | Pantalla de login Cognito |
| `/login` | Redirect | Redirige a `/sign-in` |
| `/auth/callback` | `AuthCallbackPage` | Callback post-login OIDC |
| `/404` | `Page404` | Pagina no encontrada |
| `*` | `Page404` | Fallback de rutas inexistentes |

Las paginas principales del negocio son `/approd` y `/oracle`. Las rutas `user`, `products` y `blog` provienen del template Minimal UI y no forman parte central del monitoreo DataSync.

## 7. Layout y Navegacion

El layout principal esta en `src/layouts/dashboard/layout.tsx`.

Componentes principales:

- `DashboardLayout`: estructura general para paginas autenticadas o protegidas.
- `HeaderSection`: barra superior.
- `NavDesktop`: menu lateral fijo en pantallas grandes.
- `NavMobile`: drawer lateral en pantallas pequenas.
- `AccountPopover`: menu de usuario y logout.
- `DashboardContent`: contenedor visual del contenido principal.

El menu de navegacion se configura en `src/layouts/nav-config-dashboard.tsx`.

Opciones activas:

| Titulo | Ruta | Descripcion |
| --- | --- | --- |
| APPROD | `/approd` | Monitoreo de discos del ambiente APPROD |
| Oracle | `/oracle` | Monitoreo del respaldo Oracle |

## 8. Autenticacion con Cognito

La autenticacion es opcional. El archivo responsable es `src/auth/cognito.ts`.

Variables utilizadas:

| Variable | Descripcion |
| --- | --- |
| `VITE_AUTH_ENABLED` | Activa o desactiva autenticacion Cognito |
| `VITE_COGNITO_REGION` | Region AWS del User Pool |
| `VITE_COGNITO_USER_POOL_ID` | ID del User Pool |
| `VITE_COGNITO_CLIENT_ID` | App Client ID |
| `VITE_COGNITO_DOMAIN` | Dominio de Cognito Hosted UI |
| `VITE_COGNITO_REDIRECT_SIGN_IN` | URL de retorno post-login |
| `VITE_COGNITO_REDIRECT_SIGN_OUT` | URL de retorno post-logout |
| `VITE_COGNITO_SCOPES` | Scopes OIDC solicitados |

Importante: aunque `client_id` de Cognito no es una clave secreta, el archivo `.env` no deberia manejarse como documentacion publica. Para ambientes productivos se recomienda no versionar `.env` y usar variables del proveedor de hosting.

### 8.1 Comportamiento con Cognito Desactivado

Si `VITE_AUTH_ENABLED=false`, `isCognitoConfigured()` devuelve `false` y:

- No se monta `AuthProvider`.
- `AuthGuard` permite pasar directamente al dashboard.
- La aplicacion se puede usar sin login.

### 8.2 Comportamiento con Cognito Activado

Si `VITE_AUTH_ENABLED=true` y todas las variables requeridas existen:

- `main.tsx` monta `AuthProvider`.
- `AuthGuard` protege las rutas del dashboard.
- Si el usuario no esta autenticado, se ejecuta `signinRedirect()`.
- El login ocurre en Cognito Hosted UI.
- El callback vuelve a `/auth/callback` o a la URL definida.
- `AuthCallbackPage` redirige al inicio cuando detecta sesion autenticada.

### 8.3 Login Manual

La pantalla `src/sections/auth/sign-in-view.tsx` permite ingresar un usuario y enviarlo como `login_hint` a Cognito. Esto ayuda a prellenar o guiar el login en Hosted UI.

### 8.4 Logout

El logout esta en `src/layouts/components/account-popover.tsx`.

Proceso:

1. Cierra el popover.
2. Limpia `localStorage` y `sessionStorage`.
3. Si Cognito esta activo, redirige a la URL Hosted UI de logout.
4. Si Cognito no esta activo, vuelve a `/`.

## 9. Dashboard DataSync

La vista central esta en:

```text
src/sections/overview/view/overview-analytics-view.tsx
```

Este componente concentra la logica principal del producto:

- Llama al endpoint de DataSync.
- Valida que el payload tenga estructura esperada.
- Cachea la respuesta en memoria.
- Filtra tareas por modulo `APPROD` u `ORACLE`.
- Ordena las tareas dando prioridad a errores.
- Calcula resumen operativo.
- Renderiza tarjetas de estado.
- Renderiza detalle expandible por tarea.
- Renderiza historial de ejecuciones.
- Permite ver logs de CloudWatch.
- Permite traducir errores AWS comunes al espanol.
- Permite refresco manual.
- Ejecuta auto-refresh cada 5 horas.
- Permite cambiar modo claro/oscuro.

## 10. Endpoint de Datos

La URL de API se define asi:

```ts
const DATASYNC_API_URL =
  import.meta.env.VITE_DATASYNC_API_URL ??
  'https://kyk7nif0tj.execute-api.us-east-1.amazonaws.com/';
```

Esto significa:

- Si existe `VITE_DATASYNC_API_URL`, se usa esa URL.
- Si no existe, se usa el endpoint por defecto hardcodeado.

La aplicacion hace un `GET` con header `Accept: application/json`.

Si la respuesta HTTP no es exitosa, muestra:

```text
No se pudo cargar el dashboard: La API respondio con estado <status>
```

Si el JSON no cumple el contrato esperado, muestra:

```text
El payload recibido no coincide con el formato esperado
```

## 11. Funcion Lambda e Integracion AWS

No existe codigo fuente de la funcion Lambda dentro de este repositorio. La Lambda se documenta aqui a partir del contrato real consumido por la UI y la respuesta observada del endpoint API Gateway.

Arquitectura inferida:

```text
React/Vite SPA
  -> API Gateway HTTPS GET
    -> AWS Lambda
      -> AWS DataSync
      -> CloudWatch Logs
      -> JSON consolidado
```

Responsabilidades inferidas de la Lambda:

- Consultar tareas AWS DataSync monitoreadas.
- Clasificar tareas por modulo, como `APPROD` y `ORACLE`.
- Obtener estado de la tarea DataSync (`AVAILABLE`, `RUNNING`, etc.).
- Obtener la ultima ejecucion por tarea.
- Obtener historial reciente de ejecuciones.
- Calcular o exponer metricas como duracion, archivos transferidos, bytes transferidos, throughput y porcentaje de cambio.
- Extraer errores reportados por DataSync.
- Consultar CloudWatch Logs cuando hay errores.
- Generar una URL directa a la consola de CloudWatch.
- Devolver un timestamp `generated_at` con hora local de Lima.

### 11.1 Contrato de Respuesta de la Lambda

La Lambda debe devolver un JSON con esta forma general:

```json
{
  "tasks": [
    {
      "name": "APPROD - D",
      "module": "APPROD",
      "disco": "D",
      "gb": 731,
      "snapshot": "5h",
      "schedule": {
        "script": "22:00 PM",
        "datasync": "22:15 PM",
        "cron": "15 3 * * ? *"
      },
      "task_status": "AVAILABLE",
      "last_exec": {
        "arn": "exec-...",
        "execution_id": "exec-...",
        "status": "SUCCESS",
        "start_time": "23/04/2026 22:15",
        "duration": "12m 59s",
        "duration_secs": 779,
        "files_transferred": 631,
        "files_skipped": 970121,
        "pct_changed": 0.07,
        "bytes_transferred": 3619989455,
        "bytes_source": "written",
        "throughput_mbs": 19.62,
        "file_throughput": 3.59,
        "error": "",
        "cloudwatch": null
      },
      "history": [],
      "cloudwatch_log_group": "/aws/datasync",
      "cloudwatch_console_url": "https://..."
    }
  ],
  "generated_at": "24/04/2026 09:38 Lima"
}
```

### 11.2 Campos del Nivel Principal

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `tasks` | array | Lista de tareas DataSync monitoreadas |
| `generated_at` | string | Fecha/hora en que Lambda genero la respuesta |

La UI valida que `tasks` sea un array y `generated_at` sea string mediante `isDatasyncResponse()`.

### 11.3 Campos de Cada Tarea

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `name` | string | Nombre visible de la tarea |
| `module` | string | Modulo funcional, por ejemplo `APPROD` u `ORACLE` |
| `disco` | string | Disco asociado, usado principalmente en APPROD |
| `gb` | number | Capacidad del disco en GB |
| `snapshot` | string | Ventana o frecuencia estimada de snapshot |
| `schedule` | object | Horarios de script, DataSync y cron AWS |
| `task_status` | string | Estado actual de la tarea DataSync |
| `last_exec` | object | Ultima ejecucion registrada |
| `history` | array | Historial reciente, la UI muestra hasta las ultimas 5 |
| `cloudwatch_log_group` | string | Log group asociado |
| `cloudwatch_console_url` | string | Link a CloudWatch Logs |

### 11.4 Campos de Ejecucion

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `arn` | string | Identificador/ARN abreviado de ejecucion |
| `execution_id` | string | ID de ejecucion DataSync |
| `status` | string | `SUCCESS`, `ERROR`, `RUNNING` u otro estado |
| `start_time` | string | Inicio de ejecucion formateado |
| `duration` | string | Duracion legible |
| `duration_secs` | number | Duracion en segundos |
| `files_transferred` | number | Archivos transferidos |
| `files_skipped` | number | Archivos omitidos |
| `pct_changed` | number | Porcentaje incremental cambiado |
| `bytes_transferred` | number | Bytes transferidos |
| `bytes_source` | string | Fuente de medicion, por ejemplo `written` o `compressed` |
| `throughput_mbs` | number | Velocidad MB/s |
| `file_throughput` | number | Archivos por segundo |
| `error` | string | Error DataSync si existe |
| `cloudwatch` | object/null | Datos de logs de CloudWatch si aplica |

### 11.5 Campos de CloudWatch

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `has_logs` | boolean | Indica si hay eventos relacionados |
| `log_group` | string | Log group consultado |
| `events_count` | number | Cantidad de eventos devueltos |
| `events` | array | Eventos de log filtrados |
| `console_url` | string | URL directa a CloudWatch |
| `query_error` | string | Error si Lambda no pudo consultar logs |

Cada evento contiene:

| Campo | Tipo | Descripcion |
| --- | --- | --- |
| `timestamp` | string | Fecha/hora del evento |
| `message` | string | Mensaje del log |
| `stream` | string | Log stream |

La UI clasifica los eventos como `ERROR` si el mensaje inicia con `[ERROR]`; en cualquier otro caso los trata como `INFO`.

## 12. Modulos Funcionales

### 12.1 Modulo APPROD

Archivo de pagina:

```text
src/pages/approd.tsx
```

La pagina renderiza:

```tsx
<OverviewAnalyticsView moduleFilter="APPROD" />
```

Esto filtra la respuesta de la API para mostrar solo tareas cuyo modulo resuelve como `APPROD`.

Caracteristicas especificas:

- Muestra disco asociado.
- Muestra capacidad `gb`.
- Muestra snapshot estimado.
- Muestra horario de script Windows.
- Muestra horario DataSync.
- Muestra cron AWS.
- Calcula proxima ejecucion a partir del horario DataSync.

Tareas observadas en la API:

| Tarea | Disco | Capacidad | Snapshot | Modulo |
| --- | --- | --- | --- | --- |
| `APPROD - D` | D | 731 GB | 5h | APPROD |
| `APPROD - F` | F | 335 GB | 3h | APPROD |
| `APPROD - G` | G | 306 GB | 3h | APPROD |
| `APPROD - H` | H | 286 GB | 2.5h | APPROD |
| `APPROD - E` | E | 15 GB | 1h | APPROD |
| `APPROD - I` | I | 22 GB | 1h | APPROD |

### 12.2 Modulo Oracle

Archivo de pagina:

```text
src/pages/oracle.tsx
```

La pagina renderiza:

```tsx
<OverviewAnalyticsView moduleFilter="ORACLE" />
```

Caracteristicas especificas:

- Muestra el respaldo Oracle como tarea independiente.
- No muestra disco APPROD ni capacidad operativa relevante.
- Usa etiqueta `Respaldo Oracle`.
- Se apoya en el mismo historial, estados, errores y logs.

Tarea observada:

| Tarea | Modulo | Estado observado |
| --- | --- | --- |
| `URP-BACKUP-ORACLE` | ORACLE | ERROR |

## 13. Calculos y Reglas de Negocio en Frontend

Las funciones estan en `src/sections/overview/datasync-format.ts`.

### 13.1 Validacion del Payload

`isDatasyncResponse()` valida que:

- Exista un objeto.
- `tasks` sea un array.
- `generated_at` sea string.

### 13.2 Resumen Operativo

`summarizeDatasync()` calcula:

- `monitoredDisks`: cantidad de tareas.
- `successCount`: tareas cuya ultima ejecucion fue exitosa.
- `errorCount`: tareas cuya ultima ejecucion esta en error.
- `totalTransferredBytes`: suma de bytes transferidos.
- `avgThroughputMbs`: promedio de MB/s.

### 13.3 Orden de Tareas

`sortTasksByName()` ordena asi:

1. Tareas con ultima ejecucion en error.
2. Tareas con errores recientes en historial.
3. Tareas estables.
4. Orden alfabetico por nombre dentro de cada grupo.

Esta regla hace que los problemas aparezcan arriba.

### 13.4 Estado Real de Ejecucion

`getExecutionDisplayStatus()` normaliza estados:

- Si `status` es `RUNNING` o la duracion contiene `en curso`, se muestra `RUNNING`.
- Si `status` es `SUCCESS`, se muestra `SUCCESS`.
- Cualquier otro caso se trata como `ERROR`.

### 13.5 Validacion por Tarea

`getValidationMessage()` muestra:

- Error si `last_exec.error` tiene contenido.
- Warning si existen errores en el historial.
- Success si no hay errores.

### 13.6 Traduccion de Errores AWS

`translateAwsErrorToEs()` traduce frases comunes como:

- `Task failed to access location` -> `La tarea no pudo acceder a la ubicacion`.
- `No such file or directory` -> `No existe el archivo o directorio`.
- `Permission denied` -> `Permiso denegado`.
- `mount error(...)` -> `error de montaje (...)`.

La UI permite alternar entre mensaje original y traducido por cada error.

## 14. Componentes Visuales del Dashboard

### 14.1 Cabecera del Dashboard

Muestra:

- Titulo `BKSync Dashboard - <Modulo>`.
- Descripcion de monitoreo.
- Cantidad de tareas monitoreadas.
- Timestamp `generated_at`.
- URL de API Gateway usada.
- Indicador de auto-refresh 5h.
- Selector Claro/Oscuro.
- Boton `Actualizar`.

### 14.2 Widgets Resumen

Los widgets usan `AnalyticsWidgetSummary`.

Indicadores:

- Tareas o discos monitoreados.
- Exitosos.
- Con errores.
- Total transferido.
- Velocidad promedio.

El componente soporta graficos compactos, aunque en esta implementacion se ocultan con `showChart={false}` para una lectura mas directa.

### 14.3 Tarjetas de Tareas

Cada tarea se muestra como tarjeta con:

- Estado visual de transferencia origen -> S3.
- Nombre de tarea.
- Disco/capacidad/snapshot si aplica.
- Estado normalizado.
- Ultima ejecucion.
- Datos transferidos.
- Velocidad.
- Boton para expandir detalle.

Colores principales:

- Verde: operacion estable.
- Rojo: error actual.
- Azul: ejecucion en curso.
- Amarillo: historial con alertas.

### 14.4 Detalle Expandible

Al expandir una tarea se muestra:

- Configuracion y validacion.
- Horarios de script/DataSync/cron.
- Proxima ejecucion calculada.
- Snapshot estimado.
- Capacidad del disco.
- Duracion.
- Datos transferidos.
- Velocidad de datos.
- Velocidad de archivos.
- Porcentaje incremental.
- Estado de tarea AWS.
- ARN/ID de ejecucion.
- Mensaje de validacion.
- Tabla de historial.

### 14.5 Historial de Ejecuciones

La tabla muestra:

- Inicio.
- Estado.
- Duracion.
- Archivos transferidos.
- Archivos omitidos.
- Porcentaje de cambio.
- Datos transferidos.
- MB/s.
- Archivos/s.
- Boton de logs si hay error o logs disponibles.

Si una ejecucion tiene error, se agrega una fila adicional con el mensaje.

### 14.6 Dialogo de CloudWatch

Cuando una ejecucion tiene logs o error, se puede abrir el dialogo `Logs CloudWatch`.

Incluye:

- Nombre de tarea e ID de ejecucion.
- Filtros `Todos`, `INFO`, `ERROR`.
- Error principal traducible.
- Lista de eventos con timestamp, stream y mensaje.
- Boton `Abrir CloudWatch`.
- Boton `Cerrar`.

## 15. Manejo de Cache y Refresco

El dashboard usa cache simple en memoria de modulo JavaScript:

```ts
let datasyncResponseCache: DatasyncResponse | null = null;
let datasyncFetchPromise: Promise<DatasyncResponse> | null = null;
```

Comportamiento:

- Si ya existe cache y no se fuerza refresh, se reutiliza la respuesta.
- Si ya hay un request en curso, se reutiliza la misma promesa.
- Si el usuario presiona `Actualizar`, se fuerza nueva consulta.
- El auto-refresh ocurre cada 5 horas.

Ventajas:

- Evita llamadas duplicadas al endpoint.
- Mejora velocidad al cambiar entre `/approd` y `/oracle`.
- Reduce costo/carga sobre API Gateway y Lambda.

Limitacion:

- El cache vive solo mientras la pagina esta cargada. Al recargar el navegador, se pierde.

## 16. Tema, Estilos y Experiencia Visual

El tema se define en `src/theme`.

Archivos clave:

- `theme-provider.tsx`: instala `ThemeProvider` y `CssBaseline`.
- `create-theme.ts`: crea el tema base con MUI.
- `core/palette.ts`: paletas light/dark.
- `core/typography.ts`: tipografias.
- `core/shadows.ts`: sombras.
- `core/components.tsx`: overrides de componentes MUI.

Caracteristicas:

- Modo claro por defecto.
- Modo oscuro disponible desde la cabecera del dashboard.
- Uso de CSS variables de MUI.
- Componentes con gradientes sutiles y bordes semanticos por estado.
- Iconografia visual para origen/carpeta y destino S3.

## 17. Configuracion de Build y Desarrollo

### 17.1 Requisitos

- Node.js `>=20`.
- Yarn 1.22.22 recomendado por `packageManager`.
- Tambien existe `package-lock.json`, por lo que npm puede funcionar, pero conviene estandarizar un solo gestor.

### 17.2 Scripts

| Script | Comando | Uso |
| --- | --- | --- |
| `dev` | `vite` | Servidor local |
| `start` | `vite preview` | Preview del build |
| `build` | `tsc && vite build` | Compilacion TypeScript y build productivo |
| `lint` | `eslint "src/**/*.{js,jsx,ts,tsx}"` | Validar lint |
| `lint:fix` | `eslint --fix ...` | Corregir lint automatico |
| `fm:check` | `prettier --check ...` | Validar formato |
| `fm:fix` | `prettier --write ...` | Formatear codigo |
| `fix:all` | `npm run lint:fix && npm run fm:fix` | Lint + formato |
| `clean` | `rm -rf node_modules .next out dist build` | Limpieza estilo Unix |
| `re:dev` | `yarn clean && yarn install && yarn dev` | Reinstalar y levantar dev |
| `re:build` | `yarn clean && yarn install && yarn build` | Reinstalar y compilar |

Nota para Windows: el script `clean` usa `rm -rf`, que no siempre esta disponible en PowerShell puro. Puede funcionar si el entorno tiene Git Bash, WSL o herramientas Unix.

### 17.3 Desarrollo Local

```bash
yarn install
yarn dev
```

URL local por defecto:

```text
http://localhost:5173
```

El puerto esta definido en `vite.config.ts`.

### 17.4 Build Productivo

```bash
yarn build
```

Genera salida en `dist/`.

### 17.5 Preview Local del Build

```bash
yarn start
```

## 18. Configuracion Vite

Archivo:

```text
vite.config.ts
```

Configuracion principal:

- Plugin React SWC.
- `vite-plugin-checker` para TypeScript y ESLint durante desarrollo.
- Alias `src/...` hacia la carpeta `src`.
- Servidor y preview en puerto `5173`.
- Host habilitado con `host: true`.

## 19. Despliegue

El archivo `vercel.json` contiene:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

Esto es necesario para una SPA con rutas de navegador. Permite que al entrar directamente a `/approd`, `/oracle` o `/auth/callback`, Vercel sirva `index.html` y React Router resuelva la ruta.

Para despliegue en otros hostings, se debe configurar un fallback equivalente a `index.html`.

## 20. Calidad de Codigo

### 20.1 TypeScript

El proyecto tiene `strict: true` y `strictNullChecks: true`. Esto es positivo porque reduce errores por valores nulos o estructuras inesperadas.

### 20.2 ESLint

La configuracion esta en `eslint.config.mjs`.

Incluye:

- Reglas recomendadas JS.
- Reglas recomendadas TypeScript.
- Reglas React.
- Reglas React Hooks.
- Ordenamiento de imports con `perfectionist`.
- Deteccion de imports sin usar.

### 20.3 Prettier

Existe `prettier.config.mjs` y scripts para validar/formatear archivos `src/**/*.{js,jsx,ts,tsx}`.

## 21. Assets

Assets relevantes:

- `public/assets/aws/amazon_s_icon_130997.svg`: icono S3 para modo claro.
- `public/assets/aws/amazon_s_icon_130997-transparent.svg`: icono S3 para modo oscuro.
- `public/assets/aws/3643772-archive-archives-document-folder-open_113445.svg`: icono de carpeta origen.
- `public/assets/logo/urp-logo1.png`: logo institucional.
- `public/assets/logo/urp-logo2.svg`: logo institucional alternativo.

Tambien existen imagenes, avatars, products y blog heredados del template Minimal UI.

## 22. Paginas Heredadas del Template

El proyecto parte de Minimal UI Free. Todavia conserva paginas y secciones de demostracion:

- `src/pages/user.tsx`
- `src/pages/products.tsx`
- `src/pages/blog.tsx`
- `src/sections/user/*`
- `src/sections/product/*`
- `src/sections/blog/*`
- `src/_mock/*`

Estas paginas no estan en el menu principal actual, pero siguen registradas en rutas. Si el producto final solo sera BKSync, se recomienda eliminarlas o deshabilitarlas para reducir superficie, peso y confusion documental.

## 23. Fortalezas del Proyecto

- Arquitectura simple y entendible: SPA que consume un endpoint JSON.
- Buen uso de TypeScript con tipos explicitos para DataSync.
- Separacion clara entre rutas, layouts, auth, tema y vista funcional.
- Dashboard operativo bien enfocado en errores y estado real.
- Priorizacion visual de tareas con problemas.
- Cache en memoria para evitar llamadas duplicadas.
- Autenticacion Cognito opcional, util para alternar desarrollo y produccion.
- Modo claro/oscuro integrado.
- Acceso a CloudWatch desde la UI.
- Traduccion de errores AWS comunes al espanol.
- Buen contrato de datos entre Lambda y frontend.
- Compatible con despliegue SPA en Vercel.

## 24. Riesgos y Puntos de Mejora

| Area | Riesgo | Recomendacion |
| --- | --- | --- |
| `.env` | El archivo no esta ignorado actualmente porque las lineas estan comentadas en `.gitignore` | Ignorar `.env` y usar `.env.example` sin valores reales |
| Gestor de paquetes | Existen `yarn.lock` y `package-lock.json` | Elegir Yarn o npm y mantener un solo lockfile |
| Endpoint por defecto | La URL de API Gateway esta hardcodeada como fallback | Mover a `VITE_DATASYNC_API_URL` obligatorio por ambiente |
| Lambda | El codigo fuente no esta en el repo | Versionar Lambda/IaC o documentar repositorio backend |
| Paginas demo | Rutas heredadas siguen accesibles | Eliminar o proteger `user`, `products`, `blog` si no son necesarias |
| Tests | No se observan pruebas automatizadas | Agregar tests para formateadores, filtros y contrato de API |
| Error handling | La validacion del payload es minima | Validar estructura profunda o usar schema runtime |
| Refresh | Auto-refresh de 5h puede ser largo para operacion critica | Evaluar variable configurable por ambiente |
| Seguridad API | La UI consume endpoint publico si API Gateway no exige auth | Validar CORS, authorizer o proteccion por Cognito/IAM/API key |

## 25. Recomendaciones Operativas

- Definir claramente si produccion debe tener `VITE_AUTH_ENABLED=true`.
- Proteger API Gateway si contiene informacion operativa sensible.
- Mantener documentado el mapeo entre tareas DataSync y discos/sistemas.
- Definir responsable de corregir errores DataSync por tipo de mensaje.
- Monitorear CloudWatch tambien con alarmas, no solo dashboard manual.
- Asegurar que Lambda tenga permisos minimos necesarios.
- Versionar el codigo de Lambda o infraestructura como codigo.
- Crear un `.env.example` con nombres de variables sin valores reales.

## 26. Permisos AWS Requeridos por Lambda

Aunque el codigo Lambda no esta en el repositorio, por funcionalidad observada probablemente requiere permisos de solo lectura sobre:

- `datasync:ListTasks`
- `datasync:DescribeTask`
- `datasync:ListTaskExecutions`
- `datasync:DescribeTaskExecution`
- `logs:DescribeLogGroups`
- `logs:DescribeLogStreams`
- `logs:FilterLogEvents`
- `logs:GetLogEvents`

Tambien puede requerir permisos adicionales si Lambda obtiene configuraciones desde Parameter Store, Secrets Manager o variables externas, pero eso no se puede confirmar desde este repositorio.

## 27. Contrato Esperado para CORS

Para que el navegador consuma API Gateway, la API debe permitir CORS desde el dominio donde se despliegue la SPA.

Headers esperados:

```http
Access-Control-Allow-Origin: https://bksync.urp.edu.pe
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Authorization
```

En desarrollo podria permitirse `http://localhost:5173`.

## 28. Flujo Funcional Completo

```text
Usuario abre BKSync Dashboard
  -> React Router carga /approd por defecto
  -> AuthGuard valida Cognito si esta activo
  -> OverviewAnalyticsView inicia fetch
  -> API Gateway recibe GET
  -> Lambda consulta DataSync y CloudWatch
  -> Lambda responde JSON con tasks y generated_at
  -> Frontend valida payload
  -> Frontend guarda cache en memoria
  -> Frontend filtra por modulo APPROD u ORACLE
  -> Frontend calcula resumen
  -> Frontend ordena errores arriba
  -> Usuario revisa tarjetas e historial
  -> Si hay error, usuario abre logs CloudWatch
  -> Usuario puede refrescar manualmente
```

## 29. Glosario

| Termino | Significado |
| --- | --- |
| DataSync | Servicio AWS para transferencia automatizada de datos |
| Task | Tarea DataSync configurada para transferir un origen a destino |
| Execution | Ejecucion concreta de una tarea DataSync |
| CloudWatch Logs | Servicio AWS donde se almacenan logs operativos |
| API Gateway | Servicio AWS que expone la Lambda por HTTP |
| Lambda | Funcion serverless que consolida datos para la UI |
| Cognito | Servicio AWS de autenticacion de usuarios |
| OIDC | OpenID Connect, protocolo usado para login |
| APPROD | Modulo operativo de backups por discos |
| Oracle | Modulo operativo de backup Oracle |

## 30. Checklist para Puesta en Produccion

- Confirmar dominio final de la app.
- Configurar variables de entorno en hosting.
- Activar Cognito si produccion requiere login.
- Configurar redirect sign-in/sign-out en Cognito App Client.
- Configurar CORS de API Gateway para el dominio final.
- Confirmar que Lambda responde el contrato documentado.
- Validar que `VITE_DATASYNC_API_URL` apunte al endpoint correcto.
- Ejecutar `yarn build` antes de publicar.
- Revisar que no se suban `.env` ni valores sensibles.
- Eliminar paginas demo si no aplican al producto.
- Verificar acceso al boton `Abrir CloudWatch` con usuarios autorizados.

## 31. Archivos Clave para Mantenimiento

| Archivo | Importancia |
| --- | --- |
| `src/main.tsx` | Montaje de app, router y Cognito |
| `src/routes/sections.tsx` | Definicion de rutas |
| `src/auth/cognito.ts` | Configuracion OIDC/Cognito |
| `src/auth/auth-guard.tsx` | Proteccion de rutas |
| `src/pages/approd.tsx` | Pagina del modulo APPROD |
| `src/pages/oracle.tsx` | Pagina del modulo Oracle |
| `src/sections/overview/view/overview-analytics-view.tsx` | Dashboard principal |
| `src/sections/overview/datasync-types.ts` | Tipos del contrato API/Lambda |
| `src/sections/overview/datasync-format.ts` | Reglas de formato, resumen y validacion |
| `src/layouts/nav-config-dashboard.tsx` | Menu lateral |
| `src/layouts/components/account-popover.tsx` | Logout y datos de usuario |
| `vite.config.ts` | Configuracion de desarrollo/build |
| `vercel.json` | Rewrites SPA |
| `.env` | Variables locales |

## 32. Conclusion

BKSync Dashboard es una solucion frontend practica para monitorear respaldos AWS DataSync con foco operativo. El valor principal esta en consolidar datos dispersos de DataSync y CloudWatch en una sola pantalla, separada por modulos y priorizada por errores.

La arquitectura actual es adecuada para un dashboard interno: React/Vite para UI, Cognito opcional para acceso, API Gateway como frontera HTTP y Lambda como agregador de datos AWS. Para fortalecer el proyecto antes de una operacion productiva formal, las mejoras mas importantes son versionar o documentar la Lambda real, proteger mejor variables y endpoint, limpiar paginas demo y agregar pruebas sobre el contrato de datos.
