export const NETWORKS = Object.freeze({
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
})

// Todas las funciones devuelven { estado, datos, original, error }.
// "original" conserva la respuesta de Horizon para la sección técnica.
function resultado(estado, datos = null, original = null, error = null) {
  return { estado, datos, original, error }
}

function urlTransaccion(hash, red, ruta = '') {
  if (!Object.hasOwn(NETWORKS, red)) {
    return resultado('error', null, null, {
      tipo: 'entrada',
      status: null,
      mensaje: 'La red debe ser testnet o mainnet.',
      detalles: null,
    })
  }

  if (typeof hash !== 'string' || !hash.trim()) {
    return resultado('error', null, null, {
      tipo: 'entrada',
      status: null,
      mensaje: 'Falta el hash de la transacción.',
      detalles: null,
    })
  }

  return new URL(`/transactions/${encodeURIComponent(hash.trim())}${ruta}`, NETWORKS[red])
}

async function solicitar(url) {
  let respuesta
  try {
    respuesta = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch (fallo) {
    return resultado('error', null, null, {
      tipo: 'red',
      status: null,
      mensaje: fallo.message,
      detalles: null,
    })
  }

  let texto
  try {
    texto = await respuesta.text()
  } catch (fallo) {
    return resultado('error', null, null, {
      tipo: 'red',
      status: respuesta.status,
      mensaje: fallo.message,
      detalles: null,
    })
  }

  let cuerpo
  try {
    cuerpo = JSON.parse(texto)
  } catch {
    cuerpo = texto
  }

  if (!respuesta.ok) {
    const error = {
      tipo: 'http',
      status: respuesta.status,
      mensaje: `HTTP ${respuesta.status}${respuesta.statusText ? ` ${respuesta.statusText}` : ''}`,
      detalles: cuerpo,
    }
    return resultado(respuesta.status === 404 ? 'no_encontrado' : 'error', null, cuerpo, error)
  }

  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    return resultado('error', null, cuerpo, {
      tipo: 'respuesta',
      status: respuesta.status,
      mensaje: 'Horizon devolvió una respuesta JSON inesperada.',
      detalles: cuerpo,
    })
  }

  return resultado('encontrado', cuerpo, cuerpo)
}

export async function obtenerTransaccion(hash, red) {
  const url = urlTransaccion(hash, red)
  return url instanceof URL ? solicitar(url) : url
}

export async function buscarEnRedAlternativa(hash, redActual, respuestaActual) {
  if (respuestaActual?.estado !== 'no_encontrado' || respuestaActual.error?.status !== 404) {
    return null
  }

  const otraRed = redActual === 'testnet'
    ? 'mainnet'
    : redActual === 'mainnet' ? 'testnet' : null
  if (!otraRed) return null

  return { red: otraRed, respuesta: await obtenerTransaccion(hash, otraRed) }
}

export async function obtenerOperaciones(hash, red) {
  const url = urlTransaccion(hash, red, '/operations')
  if (!(url instanceof URL)) return url

  url.search = new URLSearchParams({ order: 'asc', limit: '200' }).toString()
  const operaciones = []
  const paginas = []
  const cursores = new Set()

  while (true) {
    const pagina = await solicitar(url)
    if (pagina.estado !== 'encontrado') {
      return resultado(pagina.estado, null, [...paginas, pagina.original], pagina.error)
    }

    paginas.push(pagina.original)
    const registros = pagina.datos._embedded?.records
    if (!Array.isArray(registros)) {
      return resultado('error', null, paginas, {
        tipo: 'respuesta',
        status: 200,
        mensaje: 'Horizon no devolvió una lista de operaciones.',
        detalles: pagina.original,
      })
    }

    operaciones.push(...registros)
    if (registros.length < 200) return resultado('encontrado', operaciones, paginas)

    const cursor = registros.at(-1)?.paging_token
    if (!cursor || cursores.has(cursor)) {
      return resultado('error', null, paginas, {
        tipo: 'respuesta',
        status: 200,
        mensaje: 'No se pudo continuar la paginación de operaciones.',
        detalles: pagina.original,
      })
    }
    cursores.add(cursor)
    url.searchParams.set('cursor', cursor)
  }
}

export async function consultarTransaccion(hash, red) {
  const transaccion = await obtenerTransaccion(hash, red)
  if (transaccion.estado !== 'encontrado') return transaccion

  if (transaccion.datos.successful !== true) {
    return resultado('encontrado', {
      transaccion: transaccion.datos,
      operaciones: [],
    }, {
      transaccion: transaccion.original,
      paginasOperaciones: [],
    })
  }

  const operaciones = await obtenerOperaciones(hash, red)
  if (operaciones.estado !== 'encontrado') {
    return resultado(operaciones.estado, null, {
      transaccion: transaccion.original,
      paginasOperaciones: operaciones.original,
    }, { ...operaciones.error, etapa: 'operaciones' })
  }

  return resultado('encontrado', {
    transaccion: transaccion.datos,
    operaciones: operaciones.datos,
  }, {
    transaccion: transaccion.original,
    paginasOperaciones: operaciones.original,
  })
}
