// Generazione PDF reale (pdf-lib) per i prospetti F24 e Quadro LM.
// Sostituisce il semplice "Stampa" del browser con un file PDF scaricabile.
// pdf-lib è importato dinamicamente (code-splitting): il peso extra viene
// caricato solo quando l'utente scarica davvero un PDF.
//
// I documenti sono "prospetti" di appoggio: il pagamento avviene via home banking
// o F24 web (D-003) e l'invio telematico resta a carico dell'utente (D-002).

import type { Color, PDFFont, PDFPage } from 'pdf-lib'
import { F24Doc, ProfiloFiscale, TipoF24 } from '../types'
import { QuadroLM } from '../engine/quadroLM'

const PAGE_W = 595.28 // A4 portrait
const PAGE_H = 841.89
const MARGIN = 56

function etichetta(t: TipoF24): string {
  return t === 'saldo_acconto1' ? 'Saldo + 1° acconto' : t === 'acconto2' ? '2° acconto' : 'Bollo virtuale'
}

function fmtEuro(n: number): string {
  const [int, dec] = n.toFixed(2).split('.')
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`
}

function fmtData(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('it-IT')
}

interface Ctx {
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  y: number
  ink: Color
  muted: Color
  faint: Color
}

function text(
  ctx: Ctx,
  s: string,
  opts: { size?: number; font?: PDFFont; x?: number; gap?: number; color?: Color } = {}
) {
  const { size = 10, font = ctx.font, x = MARGIN, gap = size + 4, color = ctx.ink } = opts
  ctx.page.drawText(s, { x, y: ctx.y, size, font, color })
  ctx.y -= gap
}

function drawRow(
  ctx: Ctx,
  cells: { text: string; width: number; align?: 'left' | 'right'; bold?: boolean }[],
  y: number,
  size = 9
) {
  let x = MARGIN
  for (const c of cells) {
    const font = c.bold ? ctx.bold : ctx.font
    if (c.align === 'right') {
      const w = font.widthOfTextAtSize(c.text, size)
      ctx.page.drawText(c.text, { x: x + c.width - w, y, size, font, color: ctx.ink })
    } else {
      ctx.page.drawText(c.text, { x, y, size, font, color: ctx.ink })
    }
    x += c.width
  }
}

async function download(bytes: Uint8Array, nomeFile: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  a.click()
  URL.revokeObjectURL(url)
}

// ————— F24 —————
export async function generaPdfF24(doc: F24Doc, profilo: ProfiloFiscale): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ctx: Ctx = {
    page,
    font,
    bold,
    y: PAGE_H - 64,
    ink: rgb(0.1, 0.1, 0.1),
    muted: rgb(0.35, 0.35, 0.35),
    faint: rgb(0.5, 0.5, 0.5),
  }

  text(ctx, `Prospetto F24 — ${etichetta(doc.tipo)}`, { size: 16, font: bold })
  text(ctx, `${profilo.denominazione} · P.IVA ${profilo.piva} · C.F. ${profilo.cf}`, { size: 9, color: ctx.muted })
  text(ctx, `Anno d'imposta ${doc.anno_riferimento} · Scadenza ${fmtData(doc.data_scadenza)}`, { size: 10, gap: 16 })

  const sezioni: { titolo: string; righe: F24Doc['righe'] }[] = [
    { titolo: 'Sezione ERARIO', righe: doc.righe.filter((r) => r.sezione === 'erario') },
    { titolo: 'Sezione INPS', righe: doc.righe.filter((r) => r.sezione === 'inps') },
  ]

  for (const sez of sezioni) {
    if (sez.righe.length === 0) continue
    text(ctx, sez.titolo, { size: 11, font: bold, gap: 10 })
    const headY = ctx.y
    drawRow(
      ctx,
      [
        { text: 'Codice', width: 90, bold: true },
        { text: 'Anno', width: 60, bold: true },
        { text: 'Descrizione', width: 250, bold: true },
        { text: 'Importo', width: 130, align: 'right', bold: true },
      ],
      headY
    )
    ctx.y -= 16
    for (const r of sez.righe) {
      drawRow(
        ctx,
        [
          { text: r.codice, width: 90 },
          { text: r.anno, width: 60 },
          { text: r.descrizione, width: 250 },
          { text: fmtEuro(r.importo), width: 130, align: 'right' },
        ],
        ctx.y
      )
      ctx.y -= 15
    }
    ctx.y -= 10
  }

  // Totale
  ctx.y -= 4
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 8 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 8 },
    thickness: 1,
    color: ctx.ink,
  })
  text(ctx, 'SALDO FINALE DA VERSARE', { size: 12, font: bold, gap: 8 })
  text(ctx, fmtEuro(doc.totale), { size: 16, font: bold, x: PAGE_W - MARGIN - 140, gap: 18 })

  text(ctx, 'Istruzioni di pagamento', { size: 11, font: bold, gap: 10 })
  const istruzioni = [
    '1. Accedi al tuo home banking (sezione F24) oppure a "F24 web" nell\'area riservata dell\'Agenzia delle Entrate.',
    '2. Compila le sezioni con i codici e gli importi riportati sopra (anno di riferimento incluso).',
    `3. Effettua il pagamento entro il ${fmtData(doc.data_scadenza)}.`,
    '4. Torna nell\'app e segna l\'F24 come "Pagato" per aggiornare lo storico versamenti.',
  ]
  for (const i of istruzioni) text(ctx, i, { size: 9, color: ctx.muted })

  text(ctx, 'Documento di appoggio generato da VELTRA by Neurora — non è un modello F24 ufficiale.', {
    size: 8,
    color: ctx.faint,
    gap: 24,
  })

  return pdf.save()
}

export async function scaricaPdfF24(doc: F24Doc, profilo: ProfiloFiscale) {
  const bytes = await generaPdfF24(doc, profilo)
  await download(bytes, `F24_${doc.tipo}_${doc.anno_riferimento}.pdf`)
}

// ————— Quadro LM —————
export async function generaPdfQuadroLM(quadro: QuadroLM, profilo: ProfiloFiscale): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ctx: Ctx = {
    page,
    font,
    bold,
    y: PAGE_H - 64,
    ink: rgb(0.1, 0.1, 0.1),
    muted: rgb(0.35, 0.35, 0.35),
    faint: rgb(0.5, 0.5, 0.5),
  }

  text(ctx, `Quadro LM — pre-compilazione anno ${quadro.anno}`, { size: 16, font: bold })
  text(ctx, `${profilo.denominazione} · P.IVA ${profilo.piva} · C.F. ${profilo.cf}`, { size: 9, color: ctx.muted })
  text(ctx, 'Regime forfettario — la trasmissione telematica resta a carico del contribuente via Fisconline (D-002).', {
    size: 8,
    color: ctx.faint,
    gap: 16,
  })

  const headY = ctx.y
  drawRow(
    ctx,
    [
      { text: 'Rigo', width: 80, bold: true },
      { text: 'Descrizione', width: 330, bold: true },
      { text: 'Valore', width: 120, align: 'right', bold: true },
    ],
    headY
  )
  ctx.y -= 16

  for (const r of quadro.righe) {
    const valore = typeof r.valore === 'number' ? fmtEuro(r.valore) : String(r.valore)
    drawRow(
      ctx,
      [
        { text: r.rigo, width: 80 },
        { text: r.descrizione, width: 330 },
        { text: valore, width: 120, align: 'right' },
      ],
      ctx.y
    )
    ctx.y -= 15
  }

  ctx.y -= 8
  const saldoTesto =
    quadro.saldo >= 0
      ? `Saldo a debito: ${fmtEuro(quadro.saldo)} — da versare con F24 (codice 1790).`
      : `Credito d'imposta: ${fmtEuro(Math.abs(quadro.saldo))} — compensabile o riportabile.`
  text(ctx, saldoTesto, { size: 11, font: bold, gap: 20 })

  text(ctx, 'Nota: contributi dedotti per cassa (versati nell\'anno), non per competenza (D-012).', {
    size: 8,
    color: ctx.faint,
  })
  text(ctx, 'Documento di appoggio generato da VELTRA by Neurora — non è un modello Redditi ufficiale.', {
    size: 8,
    color: ctx.faint,
  })

  return pdf.save()
}

export async function scaricaPdfQuadroLM(quadro: QuadroLM, profilo: ProfiloFiscale) {
  const bytes = await generaPdfQuadroLM(quadro, profilo)
  await download(bytes, `QuadroLM_${quadro.anno}.pdf`)
}
