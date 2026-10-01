const STROOPS_POR_XLM = 10_000_000n

export function convertirStroopsAXlm(stroops) {
  if (typeof stroops === 'number' && !Number.isSafeInteger(stroops)) return null

  const valor = String(stroops)
  if (!/^\d+$/.test(valor)) return null

  const unidades = BigInt(valor)
  const parteEntera = unidades / STROOPS_POR_XLM
  const parteDecimal = (unidades % STROOPS_POR_XLM)
    .toString()
    .padStart(7, '0')
    .replace(/0+$/, '')

  return parteDecimal ? `${parteEntera}.${parteDecimal}` : String(parteEntera)
}

function formatearFecha(fechaIso) {
  if (typeof fechaIso !== 'string') return null
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return null

  return `${new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(fecha)} (hora de Bolivia)`
}

export function traducirTransaccion(transaccion) {
  if (!transaccion || typeof transaccion !== 'object' || Array.isArray(transaccion)) {
    throw new TypeError('Se necesita un objeto de transacción de Horizon.')
  }

  const estado = transaccion.successful === true
    ? 'exitosa'
    : transaccion.successful === false ? 'fallida' : 'desconocido'
  const estadoTexto = estado === 'exitosa'
    ? 'La transacción fue exitosa y sus operaciones se aplicaron.'
    : estado === 'fallida'
      ? 'La transacción falló: sus operaciones no se aplicaron.'
      : 'No se conoce el estado de la transacción.'
  const comisionStroops = transaccion.fee_charged ?? null
  const comisionXlm = comisionStroops === null
    ? null
    : convertirStroopsAXlm(comisionStroops)

  return {
    estado,
    estadoTexto,
    operacionesAplicadas: estado === 'desconocido' ? null : estado === 'exitosa',
    fecha: formatearFecha(transaccion.created_at),
    fechaIso: transaccion.created_at ?? null,
    iniciador: transaccion.source_account ?? null,
    pagadorComision: transaccion.fee_account || transaccion.source_account || null,
    cantidadOperaciones: transaccion.operation_count ?? null,
    ledger: transaccion.ledger ?? null,
    comision: {
      stroops: comisionStroops,
      xlm: comisionXlm,
      texto: comisionXlm === null ? 'No disponible' : `${comisionXlm} XLM`,
    },
    original: transaccion,
  }
}
