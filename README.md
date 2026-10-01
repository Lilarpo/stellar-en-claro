# Stellar en Claro

Aplicación web educativa y **de solo lectura** que explica una transacción de
Stellar a partir de su hash. Muestra estado, participantes, operaciones, activos,
memo, comisión y datos técnicos. **No es una billetera:** no conecta cuentas, no
firma ni envía operaciones y no solicita claves privadas o frases semilla.

Usa HTML, CSS y JavaScript vanilla con Vite. No hay backend ni base de datos.
El navegador consulta directamente los datos públicos de Stellar Horizon.

## Requisitos

- Node.js **24.x** y npm. Se verificó con Node.js 24.18.0 y npm 11.16.0.
  Vite 8.3.1 declara compatibilidad con Node.js `^20.19.0 || >=22.12.0`,
  pero Node 24 reproduce también el comando de pruebas de este proyecto.
- Conexión a Internet para las consultas en vivo. El respaldo guardado puede
  mostrarse sin conexión después de cargar la aplicación.

## Instalar y ejecutar desde el código fuente

Desde la carpeta que contiene `package.json`:

```bash
npm ci
npm run dev
```

Abre la URL local que imprima Vite (normalmente `http://localhost:5173/`).
Si ese puerto está ocupado, usa la URL que Vite indique. No hay un sitio
publicado configurado en este repositorio.

## Uso

1. Elige **Testnet** o **Mainnet**.
2. Pega un hash de transacción de 64 caracteres hexadecimales y pulsa
   **Analizar transacción**. Los espacios al inicio o al final se eliminan.
   Una dirección pública que empieza con `G` es una cuenta, no un hash.
3. Lee el resumen, las tarjetas de operaciones, participantes, comisión y memo.
   Las direcciones abreviadas tienen un botón **Copiar** para obtener el valor
   completo. **Datos técnicos** permanece cerrado hasta que lo abras.
4. **Usar ejemplo** coloca el hash real de Testnet y ejecuta la misma consulta
   en vivo. Si falta en la red elegida, solo un HTTP 404 activa una comprobación
   única en la otra red; una desconexión u otro error muestra un mensaje.

Las redes permitidas son:

| Red | Horizon |
| --- | --- |
| Testnet | `https://horizon-testnet.stellar.org` |
| Mainnet | `https://horizon.stellar.org` |

La aplicación consulta `/transactions/:hash` y, para una transacción exitosa,
`/transactions/:hash/operations?order=asc&limit=200`. No usa el SDK de Stellar
para estas consultas. La comisión `fee_charged` llega en stroops y se convierte
con 10 000 000 stroops por XLM; los montos `amount` de operaciones ya vienen
listos para mostrar y no se dividen.

## Hash de demostración y respaldo

`DEMO_TRANSACTION_HASH` está en `src/data/demo.js`:

```text
e4cba9d19f3614dbf1f30069fe797c110426a90a584eecd670b5eddc0581d055
```

Es una transacción pública de **Testnet** consultable en
[Horizon Testnet](https://horizon-testnet.stellar.org/transactions/e4cba9d19f3614dbf1f30069fe797c110426a90a584eecd670b5eddc0581d055). Su transacción y
sus operaciones originales están guardadas en
`tests/fixtures/testnet-transaction.json` y
`tests/fixtures/testnet-operations.json`. El botón, el placeholder y los
fixtures deben referirse al mismo hash; `npm test` comprueba esa coherencia.

La URL normal siempre intenta Horizon. Para una demostración explícita con
los datos guardados, abre `http://localhost:5173/?demo=backup` (o añade
`?demo=backup` a la URL local que indique Vite) y pulsa **Usar ejemplo
guardado**. La pantalla indica que no consultó Horizon. Las búsquedas manuales
siguen intentando Horizon incluso en esa URL; el respaldo nunca oculta un error.

Testnet puede reiniciarse. Antes de presentar, comprueba **Usar ejemplo** en la
URL normal. Si el hash ya no existe, elige otra transacción reciente de Testnet,
cambia `DEMO_TRANSACTION_HASH` y guarda los JSON nuevos de estos endpoints:

```text
https://horizon-testnet.stellar.org/transactions/NUEVO_HASH
https://horizon-testnet.stellar.org/transactions/NUEVO_HASH/operations?order=asc&limit=200
```

Después ejecuta `npm test` y `npm run build`. Nunca sustituyas un fallo en vivo
por el respaldo sin avisar.

## Arquitectura

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | Entrada de Vite y favicon. |
| `src/main.js` | Validación, estado de carga, consultas y coordinación de la vista. |
| `src/api/horizon.js` | Redes, solicitudes HTTP, 404 y paginación de operaciones. |
| `src/translators/` | Traducción de transacción, memo y operaciones a lenguaje claro. |
| `src/utils/validators.js` | Validación pura del hash y la red. |
| `src/ui/render.js` | DOM accesible; los datos externos se insertan como texto. |
| `src/styles.css` | Diseño adaptable y variables de color. |
| `src/data/demo.js` | Única constante del hash de demostración. |
| `public/` | Logo y favicon SVG originales. |
| `tests/` | Pruebas, lista manual y fixtures públicos. |

## Pruebas, compilación y vista previa

```bash
npm test
npm run build
npm run preview
```

`npm test` ejecuta las pruebas de Node. La lista para comprobar el formulario,
la red y la desconexión está en `tests/MANUAL.md`. `npm run build` genera la
versión final en `dist/`; `npm run preview` la sirve en la URL local que muestre
Vite (normalmente `http://localhost:4173/`). Abre esa URL para revisar la
compilación. No abras `dist/index.html` con `file://`, porque sus recursos se
cargan desde rutas HTTP como `/assets/`.

## Límites y seguridad

- Horizon puede estar temporalmente indisponible o limitar solicitudes. La
  aplicación muestra el error y permite reintentar.
- Una transacción fallida no se presenta como transferencia realizada. Los
  tipos de operación desconocidos se muestran como operaciones avanzadas.
- Testnet puede reiniciarse y dejar obsoleto el hash de ejemplo. Los fixtures
  son un respaldo de demostración, no datos en vivo.
- El proyecto no contiene claves privadas, frases semilla ni tokens. Las
  respuestas de Horizon y los fixtures son datos públicos. No se necesita
  conectar una billetera.

## Entrega

Incluye en Git `index.html`, `package.json`, `package-lock.json`, `README.md`,
`.gitignore`, `src/`, `public/` y `tests/` **con fixtures**. `dist/` se genera
localmente con `npm run build` y está excluido de Git, al igual que
`node_modules/`, archivos temporales y datos personales. Otro integrante puede
usar `npm ci` y los comandos anteriores para reproducir la aplicación; también
puede servir `dist/` con un servidor HTTP estático después de compilar. No hay
hosting ni enlace publicado definido aquí.
