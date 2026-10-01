import test from 'node:test'
import assert from 'node:assert/strict'
import casos from './fixtures/quality-cases.json' with { type: 'json' }
import transaccionEjemplo from './fixtures/testnet-transaction.json' with { type: 'json' }
import operacionesEjemplo from './fixtures/testnet-operations.json' with { type: 'json' }
import { DEMO_TRANSACTION_HASH } from '../src/data/demo.js'
import { validarHash, validarRed } from '../src/utils/validators.js'
import { convertirStroopsAXlm, traducirTransaccion } from '../src/translators/transaction.js'
import { traducirMemo } from '../src/translators/memo.js'
import { nombreActivo, traducirOperaciones } from '../src/translators/operations.js'

test('hash vacío, formato inválido y cuenta pública tienen mensajes distintos', () => {
  assert.equal(validarHash('   ').codigo, 'vacio')
  assert.match(validarHash('   ').mensaje, /Ingresa/)
  assert.equal(validarHash('a'.repeat(63)).codigo, 'formato')
  assert.equal(validarHash('G' + 'A'.repeat(55)).codigo, 'cuenta')
  assert.notEqual(validarHash('a'.repeat(63)).mensaje, validarHash('G' + 'A'.repeat(55)).mensaje)
  assert.equal(validarHash(' ' + 'a'.repeat(64) + ' ').valor, 'a'.repeat(64))
  assert.equal(validarHash('a'.repeat(32) + ' ' + 'a'.repeat(32)).valido, false)
})

test('el hash de demostración es válido y coincide con ambos fixtures de Testnet', () => {
  assert.equal(validarHash(DEMO_TRANSACTION_HASH).valido, true)
  assert.equal(transaccionEjemplo.hash, DEMO_TRANSACTION_HASH)
  const registros = operacionesEjemplo._embedded.records
  assert.equal(registros.length, transaccionEjemplo.operation_count)
  assert.ok(registros.every(operacion => operacion.transaction_hash === DEMO_TRANSACTION_HASH))
})

test('red válida exacta: testnet y mainnet', () => {
  assert.equal(validarRed('testnet').valido, true)
  assert.equal(validarRed('mainnet').valido, true)
  assert.equal(validarRed('Testnet').valido, false)
  assert.equal(validarRed('otra').codigo, 'red_invalida')
})

test('100 stroops equivalen a 0.00001 XLM sin redondeo', () => {
  assert.equal(convertirStroopsAXlm('100'), '0.00001')
  assert.equal(convertirStroopsAXlm('1'), '0.0000001')
  assert.equal(convertirStroopsAXlm('10000000'), '1')
  const presentada = traducirTransaccion(casos.transaction)
  assert.equal(presentada.comision.stroops, '100')
  assert.equal(presentada.comision.texto, '0.00001 XLM')
  assert.equal(presentada.iniciador, 'GINICIADOR')
  assert.equal(presentada.pagadorComision, 'GPAGADOR')
  assert.equal(presentada.original, casos.transaction)
})

test('pagador usa source_account cuando fee_account falta', () => {
  const presentada = traducirTransaccion({ ...casos.transaction, fee_account: undefined })
  assert.equal(presentada.pagadorComision, 'GINICIADOR')
})

test('memos text, id, hash, return, ausente y futuro conservan el valor', () => {
  const texto = traducirMemo('MEMO_TEXT', 'Hola')
  assert.equal(texto.valorOriginal, 'Hola')
  assert.equal(texto.textoLegible, true)

  const id = traducirMemo('id', '123456789')
  assert.equal(id.valorOriginal, '123456789')
  assert.equal(id.textoLegible, false)
  assert.match(id.descripcion, /Identificador numérico/)

  for (const tipo of ['memo_hash', 'MEMO_RETURN']) {
    const memo = traducirMemo(tipo, 'YWJjAA==')
    assert.equal(memo.valorOriginal, 'YWJjAA==')
    assert.equal(memo.textoLegible, false)
    assert.equal(memo.copiable, true)
    assert.match(memo.descripcion, /codificado/)
  }

  assert.equal(traducirMemo('none', null).etiqueta, 'Sin memo')
  const futuro = traducirMemo('MEMO_FUTURO', 'dato')
  assert.equal(futuro.valorOriginal, 'dato')
  assert.equal(futuro.copiable, true)
})

test('pago de 25 XLM conserva amount y diferencia from de source_account', () => {
  const [pago] = traducirOperaciones(casos.operations)
  assert.equal(nombreActivo('native'), 'XLM')
  assert.equal(nombreActivo('credit_alphanum4', 'USD'), 'USD')
  assert.equal(pago.enviado.monto, '25')
  assert.equal(pago.recibido.monto, '25')
  assert.equal(pago.enviado.activo, 'XLM')
  assert.equal(pago.emisor, 'GREMITE')
  assert.equal(pago.receptor, 'GRECIBE')
  assert.equal(pago.origenOperacion, 'GORIGEN')
})

test('ambos pagos por ruta conservan monto enviado y recibido sin dividirlos', () => {
  const operaciones = traducirOperaciones(casos.operations)
  const envioFijo = operaciones[4]
  const recepcionFija = operaciones[5]
  assert.match(envioFijo.titulo, /envío fijo/)
  assert.deepEqual(envioFijo.enviado, { monto: '25', activo: 'XLM' })
  assert.deepEqual(envioFijo.recibido, { monto: '24.5', activo: 'USD' })
  assert.match(recepcionFija.titulo, /recepción fija/)
  assert.deepEqual(recepcionFija.enviado, { monto: '25', activo: 'USD' })
  assert.deepEqual(recepcionFija.recibido, { monto: '24.5', activo: 'XLM' })
})

test('varias operaciones conservan orden y una desconocida no rompe la traducción', () => {
  const traducidas = traducirOperaciones(casos.operations)
  assert.equal(traducidas.length, 7)
  assert.deepEqual(traducidas.map(operacion => operacion.numero), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(traducidas.map(operacion => operacion.tipo), casos.operations.map(operacion => operacion.type))
  assert.equal(traducidas[1].titulo, 'Creación de cuenta')
  assert.equal(traducidas[2].titulo, 'Cambio de confianza')
  assert.equal(traducidas[3].titulo, 'Dato de cuenta')
  assert.equal(traducidas[6].titulo, 'Operación avanzada de tipo future_operation')
  assert.equal(traducidas[6].original, casos.operations[6])
})

test('transacción fallida declara que sus operaciones no se aplicaron', () => {
  const presentada = traducirTransaccion({ ...casos.transaction, successful: false })
  assert.equal(presentada.estado, 'fallida')
  assert.equal(presentada.operacionesAplicadas, false)
  assert.match(presentada.estadoTexto, /no se aplicaron/)
})
