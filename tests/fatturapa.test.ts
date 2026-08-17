import { describe, it, expect } from 'vitest'
import { generaXmlFatturaPA, nomeFileXml } from '../src/services/fatturapa'
import { makeProfilo, makeFattura, makeCliente } from './fixtures'

describe('generaXmlFatturaPA', () => {
  const profilo = makeProfilo()
  const cliente = makeCliente()

  it('genera un XML FatturaPA con i campi obbligatori forfettari', () => {
    const xml = generaXmlFatturaPA(makeFattura(), cliente, profilo, 'ABC12')

    expect(xml).toContain('FPR12')
    expect(xml).toContain('RF19')
    expect(xml).toContain('N2.2')
    expect(xml).toContain('TD01')
    expect(xml).toContain('<ProgressivoInvio>ABC12</ProgressivoInvio>')
    expect(xml).toContain('Operazione effettuata ai sensi')
  })

  it('include il bollo virtuale solo quando dovuto', () => {
    const conBollo = generaXmlFatturaPA(makeFattura({ bollo: true }), cliente, profilo, 'ABC12')
    expect(conBollo).toContain('<BolloVirtuale>1</BolloVirtuale>')
    expect(conBollo).toContain('<ImportoBollo>2.00</ImportoBollo>')

    const senzaBollo = generaXmlFatturaPA(makeFattura({ bollo: false }), cliente, profilo, 'ABC12')
    expect(senzaBollo).not.toContain('<DatiBollo>')
  })

  it('escape dei caratteri XML speciali', () => {
    const xml = generaXmlFatturaPA(
      makeFattura({ descrizione: 'Servizi A&B <test>' }),
      makeCliente({ denominazione: 'Cliente "X"' }),
      profilo,
      'ABC12'
    )
    expect(xml).toContain('Servizi A&amp;B &lt;test&gt;')
    expect(xml).toContain('Cliente &quot;X&quot;')
  })

  it('usa il codice destinatario 0000000 di default', () => {
    const xml = generaXmlFatturaPA(makeFattura(), cliente, profilo, 'ABC12')
    expect(xml).toContain('<CodiceDestinatario>0000000</CodiceDestinatario>')
  })

  it('inserisce la PEC quando non c’è codice destinatario', () => {
    const c = makeCliente({ codice_destinatario: '', pec_destinatario: 'cliente@pec.it' })
    const xml = generaXmlFatturaPA(makeFattura(), c, profilo, 'ABC12')
    expect(xml).toContain('<PECDestinatario>cliente@pec.it</PECDestinatario>')
  })
})

describe('nomeFileXml', () => {
  it('segue la convenzione SDI: IT + CF + _ + progressivo a 5 char', () => {
    const profilo = makeProfilo()
    expect(nomeFileXml(profilo, '1')).toBe('ITPNTDVD88L28F052K_00001.xml')
  })
})
