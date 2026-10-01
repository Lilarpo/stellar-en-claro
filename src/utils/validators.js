export const MENSAJES_VALIDACION = Object.freeze({
  hashVacio: 'Ingresa el hash de la transacción.',
  hashFormato: 'El hash debe tener exactamente 64 caracteres hexadecimales (0-9 y A-F).',
  hashCuenta: 'Eso parece una cuenta pública que empieza con G. Una cuenta y un hash de transacción son identificadores distintos.',
  redInvalida: 'Selecciona una red válida: Testnet o Mainnet.',
})

export function validarHash(entrada) {
  const valor = typeof entrada === 'string' ? entrada.trim() : ''

  if (!valor) {
    return { valido: false, valor, codigo: 'vacio', mensaje: MENSAJES_VALIDACION.hashVacio }
  }

  if (!/^[0-9a-fA-F]{64}$/.test(valor)) {
    const esCuenta = valor.startsWith('G')
    return {
      valido: false,
      valor,
      codigo: esCuenta ? 'cuenta' : 'formato',
      mensaje: esCuenta ? MENSAJES_VALIDACION.hashCuenta : MENSAJES_VALIDACION.hashFormato,
    }
  }

  return { valido: true, valor, codigo: null, mensaje: null }
}

export function validarRed(entrada) {
  const valido = entrada === 'testnet' || entrada === 'mainnet'
  return {
    valido,
    valor: entrada,
    codigo: valido ? null : 'red_invalida',
    mensaje: valido ? null : MENSAJES_VALIDACION.redInvalida,
  }
}
