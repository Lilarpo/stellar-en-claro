export function nombreActivo(tipo, codigo) {
  if (tipo === 'native') return 'XLM'
  return codigo || 'Activo no identificado'
}

function texto(valor, respaldo) {
  return valor === undefined || valor === null || valor === '' ? respaldo : String(valor)
}

function cuentaOrigen(operacion) {
  return operacion.source_account ?? null
}

function traducirPago(operacion) {
  const emisor = operacion.from || cuentaOrigen(operacion)
  const receptor = operacion.to ?? null
  const activo = nombreActivo(operacion.asset_type, operacion.asset_code)
  const monto = operacion.amount ?? null

  return {
    titulo: 'Pago',
    descripcion: `${texto(emisor, 'Cuenta no indicada')} envió ${texto(monto, 'un monto no indicado')} ${activo} a ${texto(receptor, 'una cuenta no indicada')}.`,
    emisor,
    receptor,
    enviado: { monto, activo },
    recibido: { monto, activo },
    detalles: [],
  }
}

function traducirCreacionCuenta(operacion) {
  const emisor = operacion.funder || cuentaOrigen(operacion)
  const receptor = operacion.account ?? null
  const monto = operacion.starting_balance ?? null

  return {
    titulo: 'Creación de cuenta',
    descripcion: `${texto(emisor, 'Una cuenta no indicada')} creó la cuenta ${texto(receptor, 'no indicada')} con ${texto(monto, 'un saldo no indicado')} XLM.`,
    emisor,
    receptor,
    enviado: { monto, activo: 'XLM' },
    recibido: { monto, activo: 'XLM' },
    detalles: [],
  }
}

function traducirConfianza(operacion) {
  const cuenta = operacion.trustor || cuentaOrigen(operacion)
  const activo = nombreActivo(operacion.asset_type, operacion.asset_code)
  const limite = operacion.limit ?? null

  return {
    titulo: 'Cambio de confianza',
    descripcion: `${texto(cuenta, 'Una cuenta no indicada')} cambió su límite para mantener ${activo} a ${texto(limite, 'un valor no indicado')}.`,
    emisor: cuenta,
    receptor: null,
    enviado: null,
    recibido: null,
    detalles: [
      { etiqueta: 'Emisor del activo', valor: operacion.trustee || operacion.asset_issuer || null },
      { etiqueta: 'Límite', valor: limite },
    ],
  }
}

function traducirDato(operacion) {
  const cuenta = cuentaOrigen(operacion)
  const nombre = operacion.name ?? null
  const tieneValor = operacion.value !== undefined && operacion.value !== null

  return {
    titulo: 'Dato de cuenta',
    descripcion: tieneValor
      ? `${texto(cuenta, 'Una cuenta no indicada')} estableció o actualizó el dato ${texto(nombre, 'sin nombre')}.`
      : `${texto(cuenta, 'Una cuenta no indicada')} eliminó el dato ${texto(nombre, 'sin nombre')}.`,
    emisor: cuenta,
    receptor: null,
    enviado: null,
    recibido: null,
    detalles: [
      { etiqueta: 'Nombre', valor: nombre },
      { etiqueta: 'Valor codificado', valor: operacion.value ?? null },
    ],
  }
}

function traducirPagoPorRuta(operacion, envioFijo) {
  const emisor = operacion.from || cuentaOrigen(operacion)
  const receptor = operacion.to ?? null
  const montoEnviado = operacion.source_amount ?? null
  const montoRecibido = operacion.amount ?? null
  const activoEnviado = nombreActivo(operacion.source_asset_type, operacion.source_asset_code)
  const activoRecibido = nombreActivo(operacion.asset_type, operacion.asset_code)
  const enviado = `${texto(montoEnviado, 'un monto no indicado')} ${activoEnviado}`
  const recibido = `${texto(montoRecibido, 'un monto no indicado')} ${activoRecibido}`

  return {
    titulo: envioFijo ? 'Pago por ruta: envío fijo' : 'Pago por ruta: recepción fija',
    descripcion: envioFijo
      ? `${texto(emisor, 'Una cuenta no indicada')} fijó el envío de ${enviado} a ${texto(receptor, 'una cuenta no indicada')}; se recibieron ${recibido}.`
      : `${texto(emisor, 'Una cuenta no indicada')} envió ${enviado} a ${texto(receptor, 'una cuenta no indicada')}; fijó la recepción de ${recibido}.`,
    emisor,
    receptor,
    enviado: { monto: montoEnviado, activo: activoEnviado },
    recibido: { monto: montoRecibido, activo: activoRecibido },
    detalles: envioFijo
      ? [{ etiqueta: 'Mínimo esperado al recibir', valor: operacion.destination_min ?? null }]
      : [{ etiqueta: 'Máximo permitido al enviar', valor: operacion.source_max ?? null }],
  }
}

export function traducirOperacion(operacion, indice = 0) {
  const datos = operacion && typeof operacion === 'object' ? operacion : {}
  const tipo = typeof datos.type === 'string' ? datos.type : 'desconocido'
  const base = {
    numero: indice + 1,
    tipo,
    origenOperacion: cuentaOrigen(datos),
    original: operacion,
  }

  switch (tipo) {
    case 'payment':
      return { ...base, ...traducirPago(datos) }
    case 'create_account':
      return { ...base, ...traducirCreacionCuenta(datos) }
    case 'change_trust':
      return { ...base, ...traducirConfianza(datos) }
    case 'manage_data':
      return { ...base, ...traducirDato(datos) }
    case 'path_payment_strict_send':
      return { ...base, ...traducirPagoPorRuta(datos, true) }
    case 'path_payment_strict_receive':
      return { ...base, ...traducirPagoPorRuta(datos, false) }
    default:
      return {
        ...base,
        titulo: `Operación avanzada de tipo ${tipo}`,
        descripcion: `Operación avanzada de tipo ${tipo}. Requiere una explicación técnica adicional.`,
        emisor: cuentaOrigen(datos),
        receptor: null,
        enviado: null,
        recibido: null,
        detalles: [],
      }
  }
}

export function traducirOperaciones(operaciones) {
  if (!Array.isArray(operaciones)) return []
  return operaciones.map((operacion, indice) => traducirOperacion(operacion, indice))
}
