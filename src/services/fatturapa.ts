// Generatore XML FatturaPA — formato FPR12 (fattura verso privati).
// Regime fiscale RF19 (forfettario), Natura N2.2 (D-013),
// bollo virtuale 2 € su fatture > 77,47 € .
// Specifiche tecniche: v1.9 (dal 1/4/2025), v1.9.1 dal 15/05/2026.

import { Cliente, Fattura, ProfiloFiscale } from '../types'
import { paramStr, param } from '../engine/datiNormativi'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function num(n: number): string {
  return n.toFixed(2)
}

export function generaXmlFatturaPA(
  fattura: Fattura,
  cliente: Cliente,
  profilo: ProfiloFiscale,
  progressivoInvio: string
): string {
  const natura = paramStr('natura_iva_forfettario') // N2.2
  const bollo = fattura.bollo
  const codiceDestinatario = cliente.codice_destinatario || '0000000'
  const conPec = !cliente.codice_destinatario && cliente.pec_destinatario

  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${esc(profilo.cf)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${esc(progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${esc(codiceDestinatario)}</CodiceDestinatario>${
        conPec ? `\n      <PECDestinatario>${esc(cliente.pec_destinatario)}</PECDestinatario>` : ''
      }
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${esc(profilo.piva)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${esc(profilo.cf)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${esc(profilo.denominazione)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF19</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(profilo.indirizzo)}</Indirizzo>
        <CAP>${esc(profilo.cap)}</CAP>
        <Comune>${esc(profilo.comune)}</Comune>
        <Provincia>${esc(profilo.provincia)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${
        cliente.piva
          ? `\n        <IdFiscaleIVA>\n          <IdPaese>IT</IdPaese>\n          <IdCodice>${esc(cliente.piva)}</IdCodice>\n        </IdFiscaleIVA>`
          : ''
      }${cliente.cf ? `\n        <CodiceFiscale>${esc(cliente.cf)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${esc(cliente.denominazione)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${esc(cliente.indirizzo || '-')}</Indirizzo>
        <CAP>${esc(cliente.cap || '00000')}</CAP>
        <Comune>${esc(cliente.comune || '-')}</Comune>${
          cliente.provincia ? `\n        <Provincia>${esc(cliente.provincia)}</Provincia>` : ''
        }
        <Nazione>${esc(cliente.paese || 'IT')}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${fattura.data}</Data>
        <Numero>${esc(fattura.numero)}</Numero>${
          bollo
            ? `\n        <DatiBollo>\n          <BolloVirtuale>1</BolloVirtuale>\n          <ImportoBollo>${num(param('bollo_importo'))}</ImportoBollo>\n        </DatiBollo>`
            : ''
        }
        <ImportoTotaleDocumento>${num(fattura.importo)}</ImportoTotaleDocumento>
        <Causale>Operazione effettuata ai sensi dell'art. 1, commi 54-89, L. 190/2014 - Regime forfettario</Causale>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>${esc(fattura.descrizione || 'Prestazione di servizi')}</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>${num(fattura.importo)}</PrezzoUnitario>
        <PrezzoTotale>${num(fattura.importo)}</PrezzoTotale>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>${natura}</Natura>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>0.00</AliquotaIVA>
        <Natura>${natura}</Natura>
        <ImponibileImporto>${num(fattura.importo)}</ImponibileImporto>
        <Imposta>0.00</Imposta>
        <RiferimentoNormativo>Art. 1, commi 54-89, L. 190/2014 - Regime forfettario</RiferimentoNormativo>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`
}

export function nomeFileXml(profilo: ProfiloFiscale, progressivo: string): string {
  // Convenzione SDI: IT + identificativo + _ + progressivo (5 char alfanumerici) + .xml
  return `IT${profilo.cf}_${progressivo.padStart(5, '0')}.xml`
}

export function scaricaXml(xml: string, nomeFile: string) {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  a.click()
  URL.revokeObjectURL(url)
}
