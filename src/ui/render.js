function elemento(etiqueta, contenido, clase) {
  const nodo = document.createElement(etiqueta)
  if (contenido !== undefined && contenido !== null) nodo.textContent = String(contenido)
  if (clase) nodo.className = clase
  return nodo
}

function panel(titulo, id, clase = '') {
  const seccion = elemento('section', null, `panel ${clase}`.trim())
  const encabezado = elemento('h3', titulo)
  encabezado.id = id
  seccion.setAttribute('aria-labelledby', id)
  seccion.append(encabezado)
  return seccion
}

function abreviarDireccion(valor) {
  return valor.length > 22 ? `${valor.slice(0, 8)}…${valor.slice(-6)}` : valor
}

function agregarDato(lista, etiqueta, valor, { direccion = false, clase = '' } = {}) {
  const fila = elemento('div', null, clase)
  const descripcion = elemento('dd')
  if (direccion && typeof valor === 'string' && valor) {
    const grupo = elemento('span', null, 'address-group')
    const abreviada = elemento('code', abreviarDireccion(valor), 'address-short')
    abreviada.title = valor
    abreviada.setAttribute('aria-hidden', 'true')
    const completa = elemento('span', valor, 'sr-only')
    const copiar = elemento('button', 'Copiar', 'secondary copy-button')
    copiar.type = 'button'
    copiar.setAttribute('aria-label', `Copiar ${etiqueta.toLowerCase()} ${abreviarDireccion(valor)}`)
    const respuesta = elemento('span', null, 'copy-feedback')
    respuesta.setAttribute('role', 'status')
    respuesta.setAttribute('aria-live', 'polite')
    respuesta.hidden = true
    copiar.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(valor)
        respuesta.textContent = 'Valor completo copiado.'
      } catch {
        abreviada.textContent = valor
        abreviada.className = 'address-full'
        respuesta.textContent = 'No se pudo copiar. Selecciona el valor completo mostrado.'
      }
      respuesta.hidden = false
    })
    grupo.append(abreviada, completa, copiar)
    descripcion.append(grupo, respuesta)
  } else {
    descripcion.textContent = valor === undefined || valor === null || valor === '' ? 'No disponible' : String(valor)
  }
  fila.append(elemento('dt', etiqueta), descripcion)
  lista.append(fila)
}

function descripcionBreve(operacion) {
  let descripcion = operacion.descripcion
  for (const cuenta of new Set([operacion.origenOperacion, operacion.emisor, operacion.receptor])) {
    if (typeof cuenta === 'string' && cuenta.length > 22) {
      descripcion = descripcion.replaceAll(cuenta, abreviarDireccion(cuenta))
    }
  }
  return descripcion
}

export function limpiarResultado(contenedor) {
  contenedor.replaceChildren()
  contenedor.hidden = true
}

export function limpiarSugerenciaRed(contenedor) {
  contenedor.replaceChildren()
  contenedor.hidden = true
}

export function renderSugerenciaRed(contenedor, redActual, redAlternativa, alAceptar) {
  const nombreActual = redActual === 'mainnet' ? 'Mainnet' : 'Testnet'
  const nombreAlternativo = redAlternativa === 'mainnet' ? 'Mainnet' : 'Testnet'
  const mensaje = elemento(
    'p',
    'No encontramos este hash en ' + nombreActual + ', pero sí en ' + nombreAlternativo + '.',
  )
  const boton = elemento('button', 'Analizar en ' + nombreAlternativo)
  boton.id = 'switch-network-button'
  boton.type = 'button'
  boton.addEventListener('click', alAceptar)
  contenedor.replaceChildren(mensaje, boton)
  contenedor.hidden = false
}

export function renderMemo(contenedor, memo) {
  const etiqueta = elemento('p', memo.etiqueta, 'memo-label')
  const descripcion = elemento('p', memo.descripcion, 'help')
  contenedor.replaceChildren(etiqueta)

  if (memo.valorOriginal !== null) {
    const valor = elemento(memo.textoLegible ? 'p' : 'code', memo.valorOriginal, 'memo-value')
    contenedor.append(valor)
  }

  contenedor.append(descripcion)

  if (memo.copiable) {
    const boton = elemento('button', 'Copiar valor', 'secondary memo-copy')
    boton.type = 'button'
    const estado = elemento('p', null, 'help')
    estado.setAttribute('role', 'status')
    estado.setAttribute('aria-live', 'polite')
    estado.hidden = true

    boton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(String(memo.valorOriginal))
        estado.textContent = 'Valor copiado.'
      } catch {
        estado.textContent = 'No se pudo copiar automáticamente. Selecciona el valor mostrado.'
      }
      estado.hidden = false
    })
    contenedor.append(boton, estado)
  }
}

function renderOperaciones(contenedor, transaccion, operaciones) {
  if (transaccion.operacionesAplicadas === false) {
    contenedor.append(elemento('p', 'La transacción falló. Sus operaciones no se aplicaron; no hay transferencias realizadas que mostrar.'))
    return
  }
  if (transaccion.operacionesAplicadas === null) {
    contenedor.append(elemento('p', 'No se conoce el resultado de las operaciones.'))
    return
  }
  if (operaciones.length === 0) {
    contenedor.append(elemento('p', 'Horizon no devolvió operaciones para esta transacción.'))
    return
  }

  const lista = elemento('ol', null, 'operation-list')
  lista.id = 'operations-list'
  for (const operacion of operaciones) {
    const tarjeta = elemento('li', null, 'operation-card')
    tarjeta.append(
      elemento('h4', String(operacion.numero) + '. ' + operacion.titulo),
      elemento('p', descripcionBreve(operacion), 'operation-description'),
    )
    const datos = elemento('dl', null, 'facts operation-facts')
    const pagoSimple = operacion.tipo === 'payment' || operacion.tipo === 'create_account'
    if (operacion.enviado) {
      agregarDato(datos, pagoSimple ? 'Monto y activo' : 'Envió', String(operacion.enviado.monto ?? 'Monto no disponible') + ' ' + operacion.enviado.activo, { clase: 'fact-amount' })
      agregarDato(datos, 'Remitente', operacion.emisor, { direccion: true })
    }
    if (operacion.recibido && !pagoSimple) {
      agregarDato(datos, 'Recibió', String(operacion.recibido.monto ?? 'Monto no disponible') + ' ' + operacion.recibido.activo, { clase: 'fact-amount' })
    }
    if (operacion.recibido) agregarDato(datos, 'Destinatario', operacion.receptor, { direccion: true })
    if (!operacion.enviado && !operacion.recibido) {
      agregarDato(datos, 'Cuenta que realizó la operación', operacion.origenOperacion, { direccion: true })
      if (operacion.emisor && operacion.emisor !== operacion.origenOperacion) {
        agregarDato(datos, 'Cuenta relacionada', operacion.emisor, { direccion: true })
      }
    }
    if (operacion.origenOperacion && operacion.origenOperacion !== operacion.emisor) {
      agregarDato(datos, 'Origen de la operación', operacion.origenOperacion, { direccion: true, clase: 'fact-secondary' })
    }
    for (const detalle of operacion.detalles) {
      agregarDato(datos, detalle.etiqueta, detalle.valor, { direccion: detalle.etiqueta === 'Emisor del activo' })
    }
    tarjeta.append(datos)
    lista.append(tarjeta)
  }
  contenedor.append(lista)
}

export function renderResultado(contenedor, { transaccion, operaciones, memo, red, originales, modo = 'real', enfocar = true }) {
  limpiarResultado(contenedor)
  contenedor.dataset.mode = modo
  const nombreRed = red === 'mainnet' ? 'Mainnet' : 'Testnet'
  const esSimulado = modo === 'demo'
  const esRespaldo = modo === 'backup'

  const cabecera = elemento('div', null, 'result-heading')
  const titulos = elemento('div')
  const titulo = elemento('h2', esSimulado ? 'Transacción de ejemplo' : 'Resultado de la transacción')
  titulo.id = 'result-title'
  titulo.tabIndex = -1
  titulos.append(elemento('p', esSimulado ? 'Vista previa del resultado' : esRespaldo ? 'Demostración con respaldo' : 'Resultado de Horizon', 'eyebrow'), titulo)
  cabecera.append(titulos, elemento('span', esSimulado ? 'Datos simulados' : esRespaldo ? 'Datos guardados' : 'Datos de Horizon', esSimulado || esRespaldo ? 'demo-badge' : 'real-badge'))

  const aviso = elemento(
    'p',
    esSimulado
      ? 'Este ejemplo es inventado. No se ha consultado Horizon.'
      : esRespaldo
        ? 'Respaldo de una respuesta pública de Horizon Testnet. No se ha consultado Horizon en esta demostración.'
      : 'Datos consultados en Horizon ' + nombreRed + '.',
    'result-note',
  )
  aviso.id = 'mode-status'

  const rejilla = elemento('div', null, 'result-grid')

  const resumen = panel('Resumen', 'summary-title', 'summary-panel')
  const estado = elemento('p', `Estado: ${transaccion.estado === 'exitosa' ? 'Exitosa' : transaccion.estado === 'fallida' ? 'Fallida' : 'Desconocido'}`, `transaction-status status-${transaccion.estado}`)
  resumen.append(estado, elemento('p', transaccion.estadoTexto, 'status-description'))
  const datosResumen = elemento('dl', null, 'facts summary-facts')
  agregarDato(datosResumen, 'Comisión', transaccion.comision.texto)
  agregarDato(datosResumen, 'Fecha', transaccion.fecha)
  agregarDato(datosResumen, 'Red', nombreRed)
  agregarDato(datosResumen, 'Operaciones declaradas', transaccion.cantidadOperaciones)
  resumen.append(datosResumen)

  const participantes = panel('Participantes', 'participants-title', 'participants-panel')
  const datosParticipantes = elemento('dl', null, 'facts')
  agregarDato(datosParticipantes, 'Inició la transacción', transaccion.iniciador, { direccion: true })
  agregarDato(datosParticipantes, 'Pagó la comisión', transaccion.pagadorComision, { direccion: true })
  if (transaccion.operacionesAplicadas === true) {
    const movimientos = operaciones.filter(operacion => operacion.enviado && operacion.recibido)
    const emisores = [...new Set(movimientos.map(operacion => operacion.emisor).filter(Boolean))]
    const receptores = [...new Set(movimientos.map(operacion => operacion.receptor).filter(Boolean))]
    for (const emisor of emisores) agregarDato(datosParticipantes, 'Envió activos', emisor, { direccion: true })
    for (const receptor of receptores) agregarDato(datosParticipantes, 'Recibió activos', receptor, { direccion: true })
  }
  participantes.append(datosParticipantes)

  const seccionOperaciones = panel('Operaciones', 'operations-title', 'operations-panel')
  renderOperaciones(seccionOperaciones, transaccion, operaciones)

  const comision = panel('Comisión', 'fee-title', 'fee-panel')
  comision.append(elemento('p', transaccion.comision.texto, 'fee-value'))
  const datosComision = elemento('dl', null, 'facts')
  agregarDato(datosComision, 'Costo en stroops', transaccion.comision.stroops)
  agregarDato(datosComision, 'Pagador', transaccion.pagadorComision, { direccion: true })
  comision.append(datosComision)

  const seccionMemo = panel('Memo', 'memo-title', 'memo-panel')
  const contenidoMemo = elemento('div')
  contenidoMemo.id = 'memo-content'
  renderMemo(contenidoMemo, memo)
  seccionMemo.append(contenidoMemo)

  const tecnica = panel('Datos técnicos', 'technical-title', 'technical-panel')
  const detalles = elemento('details')
  detalles.id = 'technical-details'
  detalles.append(elemento('summary', 'Mostrar datos técnicos'))
  const datosTecnicos = elemento('dl', null, 'facts technical-facts')
  agregarDato(datosTecnicos, 'Red', nombreRed)
  agregarDato(datosTecnicos, 'Hash', transaccion.original.hash, { direccion: true })
  agregarDato(datosTecnicos, 'Ledger', transaccion.ledger)
  agregarDato(datosTecnicos, 'Comisión en stroops', transaccion.comision.stroops)
  detalles.append(datosTecnicos)
  detalles.append(elemento('h4', esSimulado ? 'Datos originales simulados' : esRespaldo ? 'Respuesta guardada de Horizon' : 'Respuesta original de Horizon'))
  detalles.append(elemento('pre', JSON.stringify(originales, null, 2), 'raw-data'))
  tecnica.append(detalles)

  rejilla.append(resumen, seccionOperaciones, participantes, comision, seccionMemo, tecnica)
  contenedor.append(cabecera, aviso, rejilla)
  contenedor.hidden = false
  if (enfocar) titulo.focus()
}

export function renderApp(contenedor) {
  // Esta plantilla es estática. Los datos de Horizon se añaden con textContent.
  contenedor.innerHTML = `
    <main class="page">
      <header class="intro">
        <img class="brand-logo" src="/logo-stellar-en-claro.svg" alt="Stellar en Claro: una estrella dentro de una lupa y una órbita" width="500" height="96" />
        <h1 class="sr-only">Stellar en Claro</h1>
        <p class="eyebrow">Explorador educativo · solo lectura</p>
        <p>Comprende quién participó, qué ocurrió y cuánto costó una transacción de Stellar.</p>
      </header>

      <section class="panel search" aria-labelledby="search-title">
        <h2 id="search-title">Buscar una transacción</h2>
        <p class="section-intro">Elige una red e introduce el hash de la transacción que quieres entender.</p>
        <form id="transaction-form" novalidate>
          <div class="fields">
            <div class="field">
              <label for="network">Red</label>
              <select id="network" name="network">
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
              </select>
            </div>
            <div class="field hash-field">
              <label for="transaction-hash">Hash de la transacción</label>
              <input id="transaction-hash" name="hash" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="64 caracteres hexadecimales" aria-describedby="hash-help" required />
              <p class="help" id="hash-help">Puedes copiarlo desde un explorador de Stellar.</p>
            </div>
          </div>
          <div class="actions">
            <button type="submit" id="analyze-button">Analizar transacción</button>
            <button type="button" class="secondary" id="example-button">Usar ejemplo</button>
          </div>
        </form>
        <p id="loading-status" class="message" role="status" aria-live="polite" hidden>Cargando transacción…</p>
        <p id="demo-mode-notice" class="message" role="status" hidden>Modo respaldo activo: «Usar ejemplo guardado» muestra datos guardados sin consultar Horizon. Las búsquedas manuales siguen consultando Horizon en vivo.</p>
        <p id="error-message" class="message error" role="alert" hidden></p>
        <div id="network-suggestion" class="message network-suggestion" role="status" aria-live="polite" hidden></div>
      </section>

      <div id="result" class="result" hidden></div>
    </main>
  `
}
