export function traducirMemo(tipo, valor) {
  const tipoOriginal = tipo ?? null
  const nombre = typeof tipo === 'string' ? tipo.trim().toUpperCase() : ''
  const tipoNormalizado = nombre.startsWith('MEMO_') ? nombre.slice(5) : nombre
  const valorOriginal = valor ?? null
  const hayValor = valorOriginal !== null && valorOriginal !== ''

  const base = {
    tipoOriginal,
    valorOriginal,
    copiable: false,
    textoLegible: false,
  }

  const tipoAusente = tipo == null || (typeof tipo === 'string' && !nombre)
  if ((tipoNormalizado === 'NONE' || tipoAusente) && !hayValor) {
    return {
      ...base,
      etiqueta: 'Sin memo',
      descripcion: 'Esta transacción no incluye memo.',
    }
  }

  switch (tipoNormalizado) {
    case 'TEXT':
      return {
        ...base,
        etiqueta: 'Memo de texto',
        descripcion: 'Texto adjunto a la transacción. Es el único tipo de memo que se lee directamente como mensaje.',
        textoLegible: true,
      }
    case 'ID':
      return {
        ...base,
        etiqueta: 'Memo de identificación',
        descripcion: 'Identificador numérico. Se muestra tal como llegó, sin interpretarlo como un mensaje.',
      }
    case 'HASH':
      return {
        ...base,
        etiqueta: 'Memo hash',
        descripcion: 'Dato codificado. Se conserva tal como llegó, sin interpretarlo como texto.',
        copiable: hayValor,
      }
    case 'RETURN':
      return {
        ...base,
        etiqueta: 'Memo de retorno',
        descripcion: 'Dato codificado de retorno. Se conserva tal como llegó, sin interpretarlo como texto.',
        copiable: hayValor,
      }
    default:
      return {
        ...base,
        etiqueta: 'Tipo de memo no reconocido',
        descripcion: 'Se conserva el valor original sin interpretarlo.',
        copiable: hayValor,
      }
  }
}
