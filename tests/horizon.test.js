import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarEnRedAlternativa, consultarTransaccion, obtenerOperaciones, obtenerTransaccion } from '../src/api/horizon.js'

const HASH = 'a'.repeat(64)

test('red equivocada: un 404 comprueba la otra red exactamente una vez', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    const esTestnet = new URL(url).host === 'horizon-testnet.stellar.org'
    return new Response(JSON.stringify(esTestnet ? { hash: HASH } : {}), { status: esTestnet ? 200 : 404 })
  })

  const principal = await obtenerTransaccion(HASH, 'mainnet')
  assert.equal(principal.estado, 'no_encontrado')
  const alternativa = await buscarEnRedAlternativa(HASH, 'mainnet', principal)
  assert.equal(alternativa.red, 'testnet')
  assert.equal(alternativa.respuesta.estado, 'encontrado')
  assert.equal(alternativa.respuesta.original.hash, HASH)
  assert.equal(urls.length, 2)
  assert.equal(new URL(urls[1]).host, 'horizon-testnet.stellar.org')
})

test('ambas redes con 404 terminan después de dos consultas', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    return new Response('{}', { status: 404 })
  })
  const principal = await obtenerTransaccion(HASH, 'testnet')
  const alternativa = await buscarEnRedAlternativa(HASH, 'testnet', principal)
  assert.equal(alternativa.respuesta.estado, 'no_encontrado')
  assert.equal(urls.length, 2)
})

test('HTTP 503 y ausencia de conexión no activan la red alternativa', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    return new Response('{}', { status: 503 })
  })
  const servicio = await obtenerTransaccion(HASH, 'testnet')
  assert.equal(servicio.estado, 'error')
  assert.equal(servicio.error.status, 503)
  assert.equal(await buscarEnRedAlternativa(HASH, 'testnet', servicio), null)
  assert.equal(urls.length, 1)

  t.mock.restoreAll()
  const intentos = []
  t.mock.method(globalThis, 'fetch', async url => {
    intentos.push(String(url))
    throw new TypeError('sin conexión')
  })
  const desconectada = await obtenerTransaccion(HASH, 'testnet')
  assert.equal(desconectada.estado, 'error')
  assert.equal(desconectada.error.tipo, 'red')
  assert.equal(await buscarEnRedAlternativa(HASH, 'testnet', desconectada), null)
  assert.equal(intentos.length, 1)
})

test('operaciones usa orden ascendente, límite 200 y conserva JSON original', async t => {
  const urls = []
  const pagina = { _embedded: { records: [{ type: 'payment', amount: '25' }] } }
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    return new Response(JSON.stringify(pagina), { status: 200 })
  })
  const respuesta = await obtenerOperaciones(HASH, 'testnet')
  assert.equal(respuesta.estado, 'encontrado')
  assert.equal(respuesta.datos[0].amount, '25')
  assert.deepEqual(respuesta.original, [pagina])
  assert.equal(new URL(urls[0]).searchParams.get('order'), 'asc')
  assert.equal(new URL(urls[0]).searchParams.get('limit'), '200')
})

test('una transacción fallida no consulta ni presenta operaciones aplicadas', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    if (String(url).includes('/operations')) return new Response('{}', { status: 503 })
    return new Response(JSON.stringify({ hash: HASH, successful: false, fee_charged: '100' }), { status: 200 })
  })

  const respuesta = await consultarTransaccion(HASH, 'testnet')
  assert.equal(respuesta.estado, 'encontrado')
  assert.equal(respuesta.datos.transaccion.successful, false)
  assert.deepEqual(respuesta.datos.operaciones, [])
  assert.deepEqual(respuesta.original.paginasOperaciones, [])
  assert.equal(urls.length, 1)
})

test('una transacción exitosa sigue consultando y conservando sus operaciones', async t => {
  const urls = []
  t.mock.method(globalThis, 'fetch', async url => {
    urls.push(String(url))
    const datos = String(url).includes('/operations')
      ? { _embedded: { records: [{ type: 'payment', amount: '25' }] } }
      : { hash: HASH, successful: true, fee_charged: '100' }
    return new Response(JSON.stringify(datos), { status: 200 })
  })

  const respuesta = await consultarTransaccion(HASH, 'testnet')
  assert.equal(respuesta.estado, 'encontrado')
  assert.equal(respuesta.datos.operaciones[0].amount, '25')
  assert.equal(respuesta.original.paginasOperaciones.length, 1)
  assert.equal(urls.length, 2)
})
