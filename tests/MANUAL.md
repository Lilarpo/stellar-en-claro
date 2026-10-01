# Comprobación manual reproducible

Ejecuta `npm run dev` y abre la URL que muestre Vite. Usa la URL normal, sin
`?demo=backup`, para comprobar las consultas en vivo. El hash de **Usar ejemplo**
está en `src/data/demo.js`; comprueba que siga disponible en Testnet antes de
probar la red equivocada. Si Testnet se reinició, renueva el hash según `README.md`.
`quality-cases.json` reúne casos sintéticos independientes para las funciones
puras; sus siete operaciones no corresponden a la transacción de una operación.

| Caso | Pasos | Resultado esperado |
| --- | --- | --- |
| Hash vacío | Borra el campo y pulsa Analizar. | Mensaje «Ingresa el hash»; no comienza la carga. |
| Hash inválido | Escribe 63 caracteres `a` y pulsa Analizar. Después prueba una cuenta que empiece por `G`. | Dos mensajes distintos: formato incorrecto y cuenta pública distinta del hash. |
| Red equivocada | Pulsa Usar ejemplo, copia el hash mostrado, elige Mainnet y pulsa Analizar. | Tras el 404, aparece una sugerencia para Testnet. Al aceptarla, el hash permanece y se muestra el resultado allí. |
| Sin conexión | Con la página ya abierta, activa **Offline** en las herramientas de red del navegador. Pulsa Analizar con un hash válido. | Error de conexión visible; no aparece sugerencia de otra red. El formulario queda disponible para reintentar. Desactiva **Offline** al terminar. |
| Pago, comisión, memos y operaciones | Ejecuta `npm test` y revisa los casos con esos nombres. El archivo `quality-cases.json` contiene los datos mínimos usados. | 25 XLM permanece 25; 100 stroops se muestra como 0.00001 XLM; cada memo y operación conserva tipo, valor y orden. |
| Transacción fallida | Ejecuta `npm test` y revisa el caso «transacción fallida». | El estado indica que las operaciones no se aplicaron. |
| Datos técnicos | Abre un resultado y pulsa «Mostrar datos técnicos». | El bloque está cerrado inicialmente y muestra el JSON original al abrirlo. |

Si el servicio devuelve otro error HTTP, la aplicación debe mostrarlo como error
de consulta; solo un 404 de la transacción activa la comprobación de otra red.
