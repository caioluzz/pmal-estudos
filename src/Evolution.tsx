import { useMemo, useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, GitCompareArrows, ListChecks, Target, TrendingUp } from 'lucide-react'
import { dateLabel, today } from './lib'
import { buildEvolutionSeries, filterEvolutionBatches, summarizeEvolution } from './questionAnalytics'
import type { EvolutionPeriod } from './questionAnalytics'
import type { Discipline, QuestionBatch } from './types'

type EvolutionProps = {
  batches: QuestionBatch[]
  disciplines: Discipline[]
}

const chartWidth = 960
const chartHeight = 350
const plot = { left: 62, right: 72, top: 28, bottom: 292 }
const plotWidth = chartWidth - plot.left - plot.right
const plotHeight = plot.bottom - plot.top
const rateTicks = [100, 75, 50, 25, 0]

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function formatRate(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '')
}

function chartX(index: number, length: number) {
  return length <= 1 ? plot.left + plotWidth / 2 : plot.left + (index / (length - 1)) * plotWidth
}

function chartRateY(rate: number) {
  return plot.top + ((100 - rate) / 100) * plotHeight
}

function EvolutionChart({ points, compareQuestions }: { points: ReturnType<typeof buildEvolutionSeries>; compareQuestions: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const questionPeak = Math.max(...points.map((point) => point.total), 1)
  const questionMax = Math.max(10, Math.ceil(questionPeak / 10) * 10)
  const questionTicks = [questionMax, Math.round(questionMax * .75), Math.round(questionMax * .5), Math.round(questionMax * .25), 0]
  const ratePath = points.map((point, index) => `${chartX(index, points.length)},${chartRateY(point.rate)}`).join(' ')
  const questionPath = points.map((point, index) => (
    `${chartX(index, points.length)},${plot.top + (1 - point.total / questionMax) * plotHeight}`
  )).join(' ')
  const areaPath = points.length
    ? `M ${chartX(0, points.length)} ${plot.bottom} L ${ratePath.replaceAll(',', ' ')} L ${chartX(points.length - 1, points.length)} ${plot.bottom} Z`
    : ''
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))
  const activePoint = points[activeIndex ?? points.length - 1]

  return <>
    <div className="evolution-chart-wrap">
      <svg className="evolution-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Evolução da taxa de acerto por data">
        <defs>
          <linearGradient id="accuracy-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b8f34a" stopOpacity=".18" />
            <stop offset="100%" stopColor="#b8f34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {rateTicks.map((tick, index) => {
          const y = chartRateY(tick)
          return <g key={tick}>
            <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} className="chart-grid-line" />
            <text x={plot.left - 12} y={y + 4} textAnchor="end" className="chart-axis-label">{tick}%</text>
            {compareQuestions && <text x={chartWidth - plot.right + 12} y={y + 4} className="chart-axis-label questions-axis">{questionTicks[index]}</text>}
          </g>
        })}
        <text x={plot.left} y={15} className="chart-axis-title">TAXA DE ACERTO</text>
        {compareQuestions && <text x={chartWidth - plot.right} y={15} textAnchor="end" className="chart-axis-title questions-axis">QUESTÕES FEITAS</text>}
        {areaPath && <path d={areaPath} fill="url(#accuracy-area)" />}
        {points.length > 1 && <polyline points={ratePath} className="accuracy-line" />}
        {compareQuestions && points.length > 1 && <polyline points={questionPath} className="questions-line" />}
        {points.map((point, index) => {
          const x = chartX(index, points.length)
          const y = chartRateY(point.rate)
          const questionY = plot.top + (1 - point.total / questionMax) * plotHeight
          const showLabel = index === 0 || index === points.length - 1 || index % labelEvery === 0
          return <g key={point.date}>
            {showLabel && <text x={x} y={plot.bottom + 30} textAnchor="middle" className="chart-date-label">{dateLabel(point.date)}</text>}
            {compareQuestions && <circle cx={x} cy={questionY} r="4.5" className="questions-point" />}
            <circle cx={x} cy={y} r={activeIndex === index ? 6 : 4.5} className="accuracy-point" />
            <circle
              cx={x}
              cy={y}
              r="15"
              className="chart-hit-area"
              tabIndex={0}
              role="button"
              aria-label={`${formatLongDate(point.date)}: ${formatRate(point.rate)} de acerto e ${point.total} questões feitas`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            />
          </g>
        })}
      </svg>
    </div>
    {activePoint && <div className="chart-detail" aria-live="polite">
      <div><span>DATA SELECIONADA</span><strong>{formatLongDate(activePoint.date)}</strong></div>
      <div><span>APROVEITAMENTO</span><strong className="accuracy-value">{formatRate(activePoint.rate)}</strong></div>
      <div><span>QUESTÕES FEITAS</span><strong className="questions-value">{activePoint.total}</strong></div>
      <div><span>ACERTOS</span><strong>{activePoint.correct}</strong></div>
    </div>}
  </>
}

export function Evolution({ batches, disciplines }: EvolutionProps) {
  const [disciplineId, setDisciplineId] = useState('all')
  const [subject, setSubject] = useState('all')
  const [subtopic, setSubtopic] = useState('all')
  const [period, setPeriod] = useState<EvolutionPeriod>('all')
  const [compareQuestions, setCompareQuestions] = useState(false)

  const disciplineBatches = batches.filter((batch) => disciplineId === 'all' || batch.disciplineId === disciplineId)
  const subjects = unique(disciplineBatches.map((batch) => batch.subject))
  const subtopics = unique(disciplineBatches
    .filter((batch) => subject === 'all' || batch.subject === subject)
    .flatMap((batch) => batch.subtopic ? [batch.subtopic] : []))
  const selectedDiscipline = disciplines.find((discipline) => discipline.id === disciplineId)
  const points = useMemo(() => buildEvolutionSeries(filterEvolutionBatches(batches, {
    disciplineId,
    subject,
    subtopic,
    period,
  }, today())), [batches, disciplineId, subject, subtopic, period])
  const summary = summarizeEvolution(points)
  const filterDescription = [disciplineId === 'all' ? 'Todas as disciplinas' : selectedDiscipline?.name, subject !== 'all' ? subject : null, subtopic !== 'all' ? subtopic : null]
    .filter(Boolean)
    .join(' · ')

  return <div className="page-content evolution-page">
    <section className="card evolution-filter-card">
      <div className="evolution-filter-intro">
        <span className="evolution-icon"><ChartNoAxesCombined size={20} /></span>
        <div><strong>Monte seu recorte</strong><p>A taxa é calculada com todas as baterias de cada data.</p></div>
      </div>
      <div className="evolution-filters">
        <label><span>Disciplina</span><select value={disciplineId} onChange={(event) => { setDisciplineId(event.target.value); setSubject('all'); setSubtopic('all') }}><option value="all">Todas as disciplinas</option>{disciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
        <label><span>Assunto</span><select value={subject} onChange={(event) => { setSubject(event.target.value); setSubtopic('all') }}><option value="all">Todos os assuntos</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Subassunto</span><select value={subtopic} onChange={(event) => setSubtopic(event.target.value)} disabled={!subtopics.length}><option value="all">Todos os subassuntos</option>{subtopics.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Período</span><select value={period} onChange={(event) => setPeriod(event.target.value as EvolutionPeriod)}><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option><option value="all">Todo o histórico</option></select></label>
      </div>
    </section>

    <section className="evolution-summary">
      <article><span className="summary-icon lime"><Target size={17} /></span><div><small>APROVEITAMENTO</small><strong>{formatRate(summary.rate)}</strong><p>{summary.correct} acertos de {summary.total}</p></div></article>
      <article><span className="summary-icon blue"><ListChecks size={17} /></span><div><small>QUESTÕES FEITAS</small><strong>{summary.total}</strong><p>no recorte selecionado</p></div></article>
      <article><span className="summary-icon purple"><CalendarDays size={17} /></span><div><small>DIAS COM QUESTÕES</small><strong>{summary.days}</strong><p>{summary.best ? `melhor dia: ${formatRate(summary.best.rate)}` : 'sem registros'}</p></div></article>
      <article><span className="summary-icon orange"><TrendingUp size={17} /></span><div><small>EVOLUÇÃO NO PERÍODO</small><strong className={summary.change === null ? '' : summary.change >= 0 ? 'trend-positive' : 'trend-negative'}>{summary.change === null ? '—' : `${summary.change > 0 ? '+' : ''}${formatRate(summary.change)}`}</strong><p>primeira x última data</p></div></article>
    </section>

    <section className="card evolution-chart-card">
      <header className="evolution-chart-head">
        <div><span className="eyebrow">EVOLUÇÃO POR DATA</span><h2>{filterDescription || 'Selecione uma disciplina'}</h2><p>{points.length ? `${points.length} ${points.length === 1 ? 'data analisada' : 'datas analisadas'} · passe o cursor pelos pontos para ver os valores` : 'Registre questões para começar a visualizar sua evolução.'}</p></div>
        <button type="button" className={compareQuestions ? 'compare-line active' : 'compare-line'} onClick={() => setCompareQuestions((value) => !value)} disabled={!points.length} aria-pressed={compareQuestions}>
          <GitCompareArrows size={14} />
          <span>{compareQuestions ? 'Ocultar questões feitas' : 'Comparar com questões feitas'}</span>
        </button>
      </header>
      {points.length
        ? <>
            <div className="chart-legend"><span><i className="accuracy-legend" />Taxa de acerto</span>{compareQuestions && <span><i className="questions-legend" />Questões feitas</span>}</div>
            <EvolutionChart points={points} compareQuestions={compareQuestions} />
          </>
        : <div className="evolution-empty"><ChartNoAxesCombined size={34} /><strong>Ainda não há dados neste recorte</strong><p>Tente ampliar o período, trocar os filtros ou registrar uma nova bateria.</p></div>}
    </section>

    {points.length > 0 && <section className="card evolution-history-card">
      <header><div><h2>Detalhamento por data</h2><p>Valores consolidados quando há mais de uma bateria no mesmo dia.</p></div><span>{points.length} {points.length === 1 ? 'registro diário' : 'registros diários'}</span></header>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>Baterias</th><th>Questões</th><th>Acertos</th><th>Taxa de acerto</th></tr></thead><tbody>{[...points].reverse().map((point) => <tr key={point.date}><td>{formatLongDate(point.date)}</td><td>{point.batches}</td><td>{point.total}</td><td>{point.correct}</td><td><strong className={point.rate >= 80 ? 'history-rate high' : point.rate < 70 ? 'history-rate low' : 'history-rate'}>{formatRate(point.rate)}</strong></td></tr>)}</tbody></table></div>
    </section>}
  </div>
}
