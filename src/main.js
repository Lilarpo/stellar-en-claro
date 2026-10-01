import './styles.css'
import { buscarEnRedAlternativa, obtenerTransaccion, obtenerOperaciones } from './api/horizon.js'
import { DEMO_TRANSACTION_HASH } from './data/demo.js'
import transaccionRespaldo from '../tests/fixtures/testnet-transaction.json'
import operacionesRespaldo from '../tests/fixtures/testnet-operations.json'
import { traducirMemo } from './translators/memo.js'
import { traducirOperaciones } from './translators/operations.js'
import { traducirTransaccion } from './translators/transaction.js'
import { limpiarResultado, limpiarSugerenciaRed, renderApp, renderResultado, renderSugerenciaRed } from './ui/render.js'
import { validarHash, validarRed } from './utils/validators.js'

renderApp(document.querySelector('#app'))

const form = document.querySelector('#transaction-form')
const hashInput = form.elements.hash
hashInput.placeholder = DEMO_TRANSACTION_HASH
const networkInput = form.elements.network
const analyzeButton = document.querySelector('#analyze-button')
const exampleButton = document.querySelector('#example-button')
const demoModeNotice = document.querySelector('#demo-mode-notice')
const loadingStatus = document.querySelector('#loading-status')
const errorMessage = document.querySelector('#error-message')
const suggestionContainer = document.querySelector('#network-suggestion')
const resultContainer = document.querySelector('#result')
let sugerenciaActual = null
const modoRespaldo = new URLSearchParams(window.location.search).get('demo') === 'backup'

if (modoRespaldo) {
  exampleButton.textContent = 'Usar ejemplo guardado'
  demoModeNotice.hidden = false
}

function nombreRed(red) {
  return red === 'mainnet' ? 'Mainnet' : 'Testnet'
}

function limpiarSugerencia() {
  sugerenciaActual = null
  limpiarSugerenciaRed(suggestionContainer)
}

function limpiarMensajes() {
  errorMessage.hidden = true
  errorMessage.textContent = ''
  hashInput.removeAttribute('aria-invalid')
  networkInput.removeAttribute('aria-invalid')
  hashInput.setAttribute('aria-describedby', 'hash-help')
  networkInput.removeAttribute('aria-describedby')
}

function mostrarError(mensaje, campo = null) {
  errorMessage.textContent = mensaje
  errorMessage.hidden = false
  if (campo) {
    campo.setAttribute('aria-invalid', 'true')
    campo.setAttribute('aria-describedby', campo === hashInput ? 'hash-help error-message' : 'error-message')
    campo.focus()
  }
}

function cambiarCarga(activa) {
  if (activa) loadingStatus.textContent = 'Cargando transacción…'
  loadingStatus.hidden = !activa
  analyzeButton.disabled = activa
  exampleButton.disabled = activa
  hashInput.disabled = activa
  networkInput.disabled = activa
  form.setAttribute('aria-busy', String(activa))
}

function mensajeConsulta(resultado, red, etapa) {
  if (resultado.estado === 'no_encontrado' && etapa === 'transaccion') {
    return 'No encontramos esa transacción en ' + red + ' (HTTP 404). Revisa el hash y la red.'
  }
  if (resultado.estado === 'no_encontrado') {
    return 'Encontramos la transacción, pero Horizon no encontró sus operaciones (HTTP 404). Intenta de nuevo.'
  }
  const detalle = resultado.error?.mensaje || 'Error desconocido'
  return etapa === 'operaciones'
    ? 'No pudimos cargar las operaciones: ' + detalle + '. Intenta de nuevo.'
    : 'No pudimos consultar la transacción: ' + detalle + '. Intenta de nuevo.'
}

function mostrarDatos(transaccionOriginal, operacionesOriginales, red, originales, modo, enfocar = true) {
  renderResultado(resultContainer, {
    transaccion: traducirTransaccion(transaccionOriginal),
    operaciones: traducirOperaciones(operacionesOriginales),
    memo: traducirMemo(transaccionOriginal.memo_type, transaccionOriginal.memo),
    red,
    originales,
    modo,
    enfocar,
  })
}

async function consultarYMostrar(hash, red, transaccionConocida = null) {
  cambiarCarga(true)
  try {
    const transaccion = transaccionConocida ?? await obtenerTransaccion(hash, red)
    if (transaccion.estado !== 'encontrado') {
      if (transaccion.estado === 'no_encontrado' && transaccion.error?.status === 404) {
        const alternativa = await buscarEnRedAlternativa(hash, red, transaccion)
        if (alternativa?.respuesta.estado === 'encontrado') {
          sugerenciaActual = { hash, red: alternativa.red, transaccion: alternativa.respuesta }
          renderSugerenciaRed(suggestionContainer, red, alternativa.red, aceptarSugerencia)
          return
        }
        if (alternativa?.respuesta.estado === 'no_encontrado' && alternativa.respuesta.error?.status === 404) {
          mostrarError('No encontramos este hash ni en Testnet ni en Mainnet. Revisa el hash.')
          return
        }
        if (alternativa) {
          const detalle = alternativa.respuesta.error?.mensaje || 'Error desconocido'
          mostrarError('No encontramos este hash en ' + nombreRed(red) + ' (HTTP 404). No pudimos comprobar ' + nombreRed(alternativa.red) + ': ' + detalle + '. Intenta de nuevo.')
          return
        }
      }
      mostrarError(mensajeConsulta(transaccion, red, 'transaccion'))
      return
    }

    let operaciones = []
    let paginasOperaciones = []
    if (transaccion.datos.successful === true) {
      const respuestaOperaciones = await obtenerOperaciones(hash, red)
      if (respuestaOperaciones.estado !== 'encontrado') {
        mostrarError(mensajeConsulta(respuestaOperaciones, red, 'operaciones'))
        return
      }
      operaciones = respuestaOperaciones.datos
      paginasOperaciones = respuestaOperaciones.original
    }

    mostrarDatos(
      transaccion.datos,
      operaciones,
      red,
      { transaccion: transaccion.original, paginasOperaciones },
      'real',
    )
  } catch (error) {
    mostrarError('Ocurrió un error al mostrar la transacción: ' + error.message + '. Intenta de nuevo.')
  } finally {
    cambiarCarga(false)
  }
}

async function aceptarSugerencia() {
  if (!sugerenciaActual || analyzeButton.disabled) return
  const { hash, red, transaccion } = sugerenciaActual
  limpiarSugerencia()
  limpiarMensajes()
  limpiarResultado(resultContainer)
  hashInput.value = hash
  networkInput.value = red
  await consultarYMostrar(hash, red, transaccion)
}

async function analizar(usarRespaldo = false) {
  if (analyzeButton.disabled) return

  limpiarMensajes()
  limpiarSugerencia()
  limpiarResultado(resultContainer)

  const hash = validarHash(hashInput.value)
  hashInput.value = hash.valor
  if (!hash.valido) {
    mostrarError(hash.mensaje, hashInput)
    return
  }

  const red = validarRed(networkInput.value)
  if (!red.valido) {
    mostrarError(red.mensaje, networkInput)
    return
  }

  if (usarRespaldo) {
    const registros = operacionesRespaldo._embedded?.records
    if (
      red.valor !== 'testnet' || hash.valor !== DEMO_TRANSACTION_HASH ||
      transaccionRespaldo.hash !== DEMO_TRANSACTION_HASH || transaccionRespaldo.successful !== true ||
      !Array.isArray(registros) || registros.length !== transaccionRespaldo.operation_count ||
      registros.some(operacion => operacion.transaction_hash !== DEMO_TRANSACTION_HASH)
    ) {
      mostrarError('El ejemplo guardado no coincide con el hash de Testnet. Actualiza el respaldo antes de usarlo.')
      return
    }
    try {
      mostrarDatos(
        transaccionRespaldo,
        registros,
        red.valor,
        { transaccion: transaccionRespaldo, paginasOperaciones: [operacionesRespaldo] },
        'backup',
      )
    } catch (error) {
      mostrarError('No pudimos mostrar el ejemplo guardado: ' + error.message)
    }
    return
  }

  await consultarYMostrar(hash.valor, red.valor)
}

form.addEventListener('submit', event => {
  event.preventDefault()
  void analizar()
})
form.addEventListener('input', () => {
  limpiarMensajes()
  limpiarSugerencia()
})
form.addEventListener('change', () => {
  limpiarMensajes()
  limpiarSugerencia()
})
exampleButton.addEventListener('click', () => {
  if (analyzeButton.disabled) return
  hashInput.value = DEMO_TRANSACTION_HASH
  networkInput.value = 'testnet'
  if (modoRespaldo) {
    void analizar(true)
  } else {
    form.requestSubmit()
  }
})
