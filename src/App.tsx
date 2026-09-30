import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  BookOpenCheck, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardCheck, Clock3, Cloud, CloudOff, FileText, LoaderCircle, LogOut,
  BellRing, ChartNoAxesCombined, Gauge, LayoutDashboard, ListChecks, Menu, MoreHorizontal, Pause, Play,
  Plus, RotateCcw, Search, Sparkles, Target, TimerReset, Trash2, X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { disciplines as seedDisciplines, editalSoldado, initialAvailability, initialBatches, initialMissions, initialSessions, initialWeeklyPlan, migrateDisciplines, migrateEdictSections } from './data'
import { AuthScreen } from './AuthScreen'
import { Evolution } from './Evolution'
import { useLocalStorage } from './hooks'
import { dateLabel, dayNames, distributeMinutesByWeight, formatClock, formatHours, formatMinutes, formatStudySeconds, greetingForHour, percentage, runningTimerSeconds, studySecondsForMission, studySecondsOnDate, today, uid } from './lib'
import { reviewAlerts } from './reviews'
import { createQuestionBatchDraft, invalidQuestionBatchIndex, questionBatchesFromDrafts } from './sessionQuestions'
import { isCloudConfigured, supabase } from './supabase'
import type { Availability, Discipline, EdictSection, EdictTopic, Mission, QuestionBatch, QuestionBatchDraft, StudySession, TopicStatus, WeeklyPlanItem } from './types'

type Page = 'dashboard' | 'questions' | 'evolution' | 'edital' | 'cycle' | 'focus'
type SubjectMapSort = 'lowest' | 'highest' | 'questions' | 'alphabetical'

const nav: { id: Page; label: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'questions', label: 'Caderno de questões', icon: ClipboardCheck },
  { id: 'evolution', label: 'Evolução', icon: ChartNoAxesCombined },
  { id: 'edital', label: 'Edital verticalizado', icon: BookOpenCheck },
  { id: 'cycle', label: 'Ciclo de estudos', icon: CalendarDays },
  { id: 'focus', label: 'Sala de foco', icon: TimerReset },
]

const pageMeta: Record<Page, { eyebrow: string; title: string; description: string }> = {
  dashboard: { eyebrow: '', title: '', description: 'Um panorama honesto do seu preparo para Soldado da PMAL.' },
  questions: { eyebrow: 'DESEMPENHO', title: 'Caderno de questões', description: 'Registre suas baterias do QConcursos e descubra onde ajustar a rota.' },
  evolution: { eyebrow: 'ANÁLISE', title: 'Evolução', description: 'Acompanhe sua taxa de acerto e o volume de questões ao longo do tempo.' },
  edital: { eyebrow: 'EDITAL Nº 1 · PMAL 2026', title: 'Edital verticalizado', description: 'Cargo 2 — Soldado do Quadro de Praças.' },
  cycle: { eyebrow: 'PLANEJAMENTO', title: 'Ciclo de estudos', description: 'Seu tempo disponível convertido em missões claras e executáveis.' },
  focus: { eyebrow: 'EXECUÇÃO', title: 'Sala de foco', description: 'Cronômetro líquido, Pomodoro e notas no mesmo lugar.' },
}

const statusOrder: TopicStatus[] = ['Não iniciado', 'Lido', 'Resumido', 'Revisado']

type CloudStudyState = {
  disciplines: Discipline[]
  batches: QuestionBatch[]
  edict: EdictSection[]
  availability: Availability[]
  missions: Mission[]
  sessions: StudySession[]
  weeklyPlan: WeeklyPlanItem[]
}

type LiquidTimerState = {
  elapsed: number
  running: boolean
  startedAt: number | null
}

function localDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value: string, days: number) {
  const date = localDate(value)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(isCloudConfigured)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user)
      setCheckingAuth(false)
    }).catch(() => {
      if (!active) return
      setUser(null)
      setCheckingAuth(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setCheckingAuth(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (checkingAuth) return <div className="auth-loading"><LoaderCircle className="spin" /><strong>Conectando ao Supabase</strong><span>Validando sua sessão...</span></div>
  if (isCloudConfigured && !user) return <AuthScreen />
  return <StudyApp cloudUser={user} />
}

function StudyApp({ cloudUser }: { cloudUser: User | null }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [questionModal, setQuestionModal] = useState(false)
  const [toast, setToast] = useState('')
  const [disciplines, setDisciplines] = useLocalStorage<Discipline[]>('farol-disciplines', seedDisciplines)
  const [batches, setBatches] = useLocalStorage<QuestionBatch[]>('farol-batches', initialBatches)
  const [edict, setEdict] = useLocalStorage<EdictSection[]>('farol-edict', editalSoldado)
  const [availability, setAvailability] = useLocalStorage<Availability[]>('farol-availability', initialAvailability)
  const [missions, setMissions] = useLocalStorage<Mission[]>('farol-missions', initialMissions)
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('farol-sessions', initialSessions)
  const [weeklyPlan, setWeeklyPlan] = useLocalStorage<WeeklyPlanItem[]>('pmal-weekly-plan', initialWeeklyPlan)
  const [liquidTimer, setLiquidTimer] = useLocalStorage<LiquidTimerState>('pmal-liquid-timer', { elapsed: 0, running: false, startedAt: null })
  const [cloudHydrated, setCloudHydrated] = useState(!cloudUser)
  const [cloudStatus, setCloudStatus] = useState<'local' | 'loading' | 'saving' | 'synced' | 'error'>(cloudUser ? 'loading' : 'local')
  const lastSyncedRef = useRef('')

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const cloudState: CloudStudyState = { disciplines, batches, edict, availability, missions, sessions, weeklyPlan }
  const cloudStateJson = JSON.stringify(cloudState)

  useEffect(() => {
    const migratedDisciplines = migrateDisciplines(disciplines)
    const migratedEdict = migrateEdictSections(edict)
    if (migratedDisciplines !== disciplines) setDisciplines(migratedDisciplines)
    if (migratedEdict !== edict) setEdict(migratedEdict)
  }, [disciplines, edict, setDisciplines, setEdict])

  useEffect(() => {
    if (!cloudUser || !supabase) return
    const client = supabase
    let active = true
    setCloudHydrated(false)
    setCloudStatus('loading')

    const loadCloudState = async () => {
      const { data, error } = await client
        .from('study_states')
        .select('state')
        .eq('user_id', cloudUser.id)
        .maybeSingle()

      if (!active) return
      if (error) {
        setCloudStatus('error')
        setCloudHydrated(true)
        return
      }

      if (data?.state) {
        const remote = data.state as Partial<CloudStudyState>
        if (Array.isArray(remote.disciplines)) setDisciplines(remote.disciplines)
        if (Array.isArray(remote.batches)) setBatches(remote.batches)
        if (Array.isArray(remote.edict)) setEdict(remote.edict)
        if (Array.isArray(remote.availability)) setAvailability(remote.availability)
        if (Array.isArray(remote.missions)) setMissions(remote.missions)
        if (Array.isArray(remote.sessions)) setSessions(remote.sessions)
        if (Array.isArray(remote.weeklyPlan)) setWeeklyPlan(remote.weeklyPlan)
        lastSyncedRef.current = JSON.stringify({ ...cloudState, ...remote })
        setCloudStatus('synced')
      } else {
        const { error: createError } = await client.from('study_states').insert({
          user_id: cloudUser.id,
          state: cloudState,
        })
        if (!active) return
        if (createError) setCloudStatus('error')
        else {
          lastSyncedRef.current = cloudStateJson
          setCloudStatus('synced')
        }
      }
      setCloudHydrated(true)
    }

    loadCloudState()
    return () => { active = false }
  }, [cloudUser?.id])

  useEffect(() => {
    if (!cloudUser || !supabase || !cloudHydrated || cloudStateJson === lastSyncedRef.current) return
    const client = supabase
    setCloudStatus('saving')
    const timeout = window.setTimeout(async () => {
      const { error } = await client.from('study_states').upsert({
        user_id: cloudUser.id,
        state: JSON.parse(cloudStateJson),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) setCloudStatus('error')
      else {
        lastSyncedRef.current = cloudStateJson
        setCloudStatus('synced')
      }
    }, 900)
    return () => window.clearTimeout(timeout)
  }, [cloudUser?.id, cloudHydrated, cloudStateJson])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const meta = pageMeta[page]
  const pendingReviewCount = reviewAlerts(batches, missions).filter((review) => review.daysLate >= 0).length
  const dateEyebrow = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(currentTime)
    .replace('-feira', '')
    .toUpperCase()
  const profileName = cloudUser?.user_metadata?.name?.trim() || cloudUser?.email?.split('@')[0] || 'Caio Luz'
  const firstName = profileName.split(/\s+/)[0] || 'Caio'
  const dashboardTitle = `${greetingForHour(currentTime.getHours())}, ${firstName}.`
  const initials = profileName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()
  const cloudLabel = cloudStatus === 'loading' ? 'Carregando dados' : cloudStatus === 'saving' ? 'Salvando...' : cloudStatus === 'synced' ? 'Sincronizado' : cloudStatus === 'error' ? 'Erro de sincronização' : 'Modo local'
  const weekStart = new Date(currentTime)
  weekStart.setHours(12, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartValue = isoDate(weekStart)
  const weekEndValue = addDays(weekStartValue, 7)
  const accountStartValue = cloudUser?.created_at ? isoDate(new Date(cloudUser.created_at)) : weekStartValue
  const effectiveWeekStartValue = accountStartValue > weekStartValue ? accountStartValue : weekStartValue
  const weeklyGoalMinutes = availability.reduce((sum, item) => {
    const itemDate = addDays(weekStartValue, item.day)
    return itemDate >= effectiveWeekStartValue && itemDate < weekEndValue ? sum + item.minutes : sum
  }, 0)
  const weeklyStudyMinutes = sessions
    .filter((session) => session.date >= effectiveWeekStartValue && session.date < weekEndValue)
    .reduce((sum, session) => sum + session.seconds / 60, 0)
  const weeklyProgress = Math.min(100, percentage(weeklyStudyMinutes, weeklyGoalMinutes))
  const weeklyTargetDetail = weeklyGoalMinutes
    ? `${formatMinutes(Math.round(weeklyStudyMinutes))} de ${formatMinutes(weeklyGoalMinutes)} planejadas`
    : 'Defina sua disponibilidade no ciclo'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><span /></div><div><strong>PMAL</strong><small>ESTUDOS · SOLDADO</small></div></div>
        <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
        <nav className="primary-nav">
          <span className="nav-label">ESPAÇO DE ESTUDO</span>
          {nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => { setPage(item.id); setMenuOpen(false) }}><item.icon size={18} />{item.label}{item.id === 'cycle' && pendingReviewCount > 0 && <span className="nav-badge">{pendingReviewCount}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="target-card"><div className="target-head"><Target size={16} /><span>META DA SEMANA</span><b>{weeklyProgress}%</b></div><div className="progress"><span style={{ width: `${weeklyProgress}%` }} /></div><small>{weeklyTargetDetail}</small></div>
          <div className="profile"><div className="avatar">{initials}</div><div><strong>{profileName}</strong><small className={`cloud-${cloudStatus}`}>{cloudStatus === 'local' ? <CloudOff size={11} /> : <Cloud size={11} />}{cloudLabel}</small></div>{cloudUser ? <button className="signout-button" onClick={() => supabase?.auth.signOut()} title="Sair"><LogOut size={17} /></button> : <MoreHorizontal size={18} />}</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button>
          <div><span className="eyebrow">{page === 'dashboard' ? dateEyebrow : meta.eyebrow}</span><h1>{page === 'dashboard' ? dashboardTitle : meta.title}</h1><p>{meta.description}</p></div>
          <div className="top-actions"><button className="icon-button" aria-label="Pesquisar"><Search size={19} /></button><button className="primary-button" onClick={() => setQuestionModal(true)}><Plus size={18} /> Registrar questões</button></div>
        </header>

        {page === 'dashboard' && <Dashboard batches={batches} disciplines={disciplines} sessions={sessions} missions={missions} setMissions={setMissions} onPage={setPage} notify={notify} />}
        {page === 'questions' && <Questions batches={batches} disciplines={disciplines} onAdd={() => setQuestionModal(true)} onDelete={(id) => { setBatches(batches.filter((b) => b.id !== id)); notify('Registro removido.') }} />}
        {page === 'evolution' && <Evolution batches={batches} disciplines={disciplines} />}
        {page === 'edital' && <Edict sections={edict} setSections={setEdict} notify={notify} />}
        {page === 'cycle' && <Cycle disciplines={disciplines} setDisciplines={setDisciplines} availability={availability} setAvailability={setAvailability} missions={missions} setMissions={setMissions} sessions={sessions} batches={batches} weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan} notify={notify} />}
        {page === 'focus' && <Focus disciplines={disciplines} missions={missions} setMissions={setMissions} sessions={sessions} setSessions={setSessions} batches={batches} setBatches={setBatches} liquidTimer={liquidTimer} setLiquidTimer={setLiquidTimer} notify={notify} />}
      </main>

      {questionModal && <QuestionModal disciplines={disciplines} onClose={() => setQuestionModal(false)} onSave={(batch) => { setBatches([batch, ...batches]); setQuestionModal(false); notify('Bateria registrada. Seu desempenho foi recalculado.') }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}

function Dashboard({ batches, disciplines, sessions, missions, setMissions, onPage, notify }: { batches: QuestionBatch[]; disciplines: Discipline[]; sessions: StudySession[]; missions: Mission[]; setMissions: (m: Mission[]) => void; onPage: (p: Page) => void; notify: (s: string) => void }) {
  const totals = batches.reduce((a, b) => ({ total: a.total + b.total, correct: a.correct + b.correct }), { total: 0, correct: 0 })
  const totalMinutes = Math.round(sessions.reduce((a, s) => a + s.seconds, 0) / 60)
  const reviewsDue = reviewAlerts(batches, missions).filter((review) => review.daysLate >= 0)
  const byDiscipline = disciplines.map((d) => {
    const own = batches.filter((b) => b.disciplineId === d.id)
    const total = own.reduce((a, b) => a + b.total, 0)
    const correct = own.reduce((a, b) => a + b.correct, 0)
    return { ...d, total, correct, rate: percentage(correct, total) }
  }).filter((d) => d.total).sort((a, b) => b.rate - a.rate)
  const weakest = [...byDiscipline].sort((a, b) => a.rate - b.rate)[0]
  const todayMissions = missions.filter((mission) => mission.date === today())
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const dateValue = isoDate(date)
    return {
      day: dateValue.slice(8, 10),
      month: dateValue.slice(5, 7),
      value: sessions.filter((session) => session.date === dateValue).reduce((a, s) => a + s.seconds / 60, 0),
    }
  })
  const maxDaily = Math.max(...daily.map((d) => d.value), 90)

  return <div className="page-content dashboard-grid">
    <section className="metric-grid">
      <Metric icon={ClipboardCheck} label="QUESTÕES RESOLVIDAS" value={String(totals.total)} detail={`+${batches.slice(0, 2).reduce((a, b) => a + b.total, 0)} nos últimos registros`} tone="lime" />
      <Metric icon={Gauge} label="APROVEITAMENTO GERAL" value={`${percentage(totals.correct, totals.total)}%`} detail={`${totals.correct} acertos acumulados`} tone="blue" />
      <Metric icon={Clock3} label="HORAS LÍQUIDAS" value={formatMinutes(totalMinutes)} detail="tempo efetivamente focado" tone="purple" />
      <Metric icon={BellRing} label="REVISÕES PENDENTES" value={String(reviewsDue.length)} detail={reviewsDue.length ? 'há revisões de 24h, 7 ou 30 dias' : 'nenhuma revisão vencida'} tone="orange" />
    </section>

    <section className="card performance-card">
      <CardTitle title="Ritmo de estudo" subtitle="Horas líquidas nos últimos 7 dias" action="Ver ciclo" onAction={() => onPage('cycle')} />
      <div className="bar-chart">
        {daily.map((item, i) => <div className="bar-column" key={`${item.month}-${item.day}`}><div className="bar-value">{item.value ? formatHours(item.value) : ''}</div><div className={`bar ${i === daily.length - 1 ? 'current' : ''}`} style={{ height: `${Math.max(5, (item.value / maxDaily) * 100)}%` }} /><span>{item.day}/{item.month}</span></div>)}
      </div>
    </section>

    <section className="card today-card">
      <CardTitle title="Missões de hoje" subtitle="Primeiro entram as revisões pendentes; depois, os assuntos do ciclo semanal" />
      <MissionList
        missions={todayMissions.slice(0, 4)}
        disciplines={disciplines}
        sessions={sessions}
        onToggle={(id) => setMissions(missions.map((mission) => mission.id === id ? { ...mission, completed: !mission.completed } : mission))}
        onDelete={(id) => { setMissions(missions.filter((mission) => mission.id !== id)); notify('Missão removida.') }}
      />
    </section>

    <section className="card discipline-card">
      <CardTitle title="Desempenho por matéria" subtitle="Ordenado por taxa de acertos" action="Ver questões" onAction={() => onPage('questions')} />
      <div className="discipline-list">
        {byDiscipline.slice(0, 6).map((d) => <div className="discipline-row" key={d.id}><div className="discipline-name"><span style={{ background: d.color }} /> <strong>{d.name}</strong></div><div className="mini-progress"><span style={{ width: `${d.rate}%`, background: d.color }} /></div><b>{d.rate}%</b><small>{d.correct}/{d.total}</small></div>)}
      </div>
    </section>

    <section className="insight-card">
      <div className="insight-icon"><Sparkles size={20} /></div><div><span className="eyebrow">PRÓXIMO MELHOR PASSO</span><h3>{reviewsDue.length ? `${reviewsDue.length} revisões pedem atenção` : weakest ? `Recupere ${weakest.name}` : 'Registre sua primeira bateria'}</h3><p>{reviewsDue.length ? `Comece por ${reviewsDue[0].subject}, revisão de ${reviewsDue[0].interval}. As missões do ciclo já consideram esses alertas.` : weakest ? `Seu aproveitamento está em ${weakest.rate}%. Uma bateria curta de 20 questões ajuda a validar se a dificuldade é pontual ou recorrente.` : 'Com os primeiros dados, o sistema identifica seus pontos de atenção.'}</p></div><button onClick={() => onPage(reviewsDue.length ? 'cycle' : 'questions')}>{reviewsDue.length ? 'Ver revisões' : 'Planejar revisão'} <ChevronRight size={17} /></button>
    </section>
  </div>
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Gauge; label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function CardTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="card-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action}<ChevronRight size={16} /></button>}</div>
}

function Questions({ batches, disciplines, onAdd, onDelete }: { batches: QuestionBatch[]; disciplines: Discipline[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [mapDiscipline, setMapDiscipline] = useState('all')
  const [mapQuery, setMapQuery] = useState('')
  const [mapSort, setMapSort] = useState<SubjectMapSort>('lowest')
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const visible = batches.filter((b) => (filter === 'all' || b.disciplineId === filter) && `${b.subject} ${b.subtopic ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const total = visible.reduce((a, b) => a + b.total, 0)
  const correct = visible.reduce((a, b) => a + b.correct, 0)
  const groupedMap = new Map<string, { key: string; disciplineId: string; disciplineName: string; color: string; subject: string; subtopic?: string; total: number; correct: number }>()
  batches.forEach((batch) => {
    const d = disciplines.find((item) => item.id === batch.disciplineId)!
    const key = `${batch.disciplineId}|${batch.subject.toLowerCase()}|${batch.subtopic?.toLowerCase() ?? ''}`
    const current = groupedMap.get(key)
    groupedMap.set(key, current
      ? { ...current, total: current.total + batch.total, correct: current.correct + batch.correct }
      : { key, disciplineId: d.id, disciplineName: d.name, color: d.color, subject: batch.subject, subtopic: batch.subtopic, total: batch.total, correct: batch.correct })
  })
  const grouped = [...groupedMap.values()].map((item) => ({ ...item, rate: percentage(item.correct, item.total) }))
  const normalizedMapQuery = mapQuery.trim().toLocaleLowerCase('pt-BR')
  const filteredSubjects = grouped
    .filter((item) => (mapDiscipline === 'all' || item.disciplineId === mapDiscipline)
      && `${item.subject} ${item.subtopic ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalizedMapQuery))
    .sort((a, b) => {
      if (mapSort === 'highest') return b.rate - a.rate || a.subject.localeCompare(b.subject, 'pt-BR')
      if (mapSort === 'questions') return b.total - a.total || a.subject.localeCompare(b.subject, 'pt-BR')
      if (mapSort === 'alphabetical') return a.subject.localeCompare(b.subject, 'pt-BR')
      return a.rate - b.rate || a.subject.localeCompare(b.subject, 'pt-BR')
    })
  const subjectCards = showAllSubjects ? filteredSubjects : filteredSubjects.slice(0, 6)
  const hasMapFilters = mapDiscipline !== 'all' || Boolean(mapQuery.trim()) || mapSort !== 'lowest'
  const mapSortLabel = mapSort === 'lowest' ? 'menores aproveitamentos primeiro' : mapSort === 'highest' ? 'maiores aproveitamentos primeiro' : mapSort === 'questions' ? 'mais questões primeiro' : 'ordem alfabética'

  const resetSubjectMap = () => {
    setMapDiscipline('all')
    setMapQuery('')
    setMapSort('lowest')
    setShowAllSubjects(false)
  }

  return <div className="page-content">
    <section className="summary-strip"><div><span>QUESTÕES NO RECORTE</span><strong>{total}</strong></div><div><span>ACERTOS</span><strong>{correct}</strong></div><div><span>APROVEITAMENTO</span><strong>{percentage(correct, total)}%</strong></div><div><span>BATERIAS</span><strong>{visible.length}</strong></div></section>
    <section className="card subject-overview"><CardTitle title="Mapa por assunto" subtitle={`${filteredSubjects.length}${filteredSubjects.length !== grouped.length ? ` de ${grouped.length}` : ''} assuntos · ${mapSortLabel}`} />
      <div className="subject-map-filters">
        <label className="subject-map-search"><span>Buscar assunto</span><div><Search size={15} /><input value={mapQuery} onChange={(e) => { setMapQuery(e.target.value); setShowAllSubjects(false) }} placeholder="Ex.: porcentagem" /></div></label>
        <label><span>Matéria</span><select value={mapDiscipline} onChange={(e) => { setMapDiscipline(e.target.value); setShowAllSubjects(false) }}><option value="all">Todas as matérias</option>{disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label><span>Organizar por</span><select value={mapSort} onChange={(e) => { setMapSort(e.target.value as SubjectMapSort); setShowAllSubjects(false) }}><option value="lowest">Menor aproveitamento</option><option value="highest">Maior aproveitamento</option><option value="questions">Mais questões feitas</option><option value="alphabetical">Ordem alfabética</option></select></label>
        {hasMapFilters && <button className="clear-map-filters" type="button" onClick={resetSubjectMap}><X size={14} />Limpar filtros</button>}
      </div>
      <div className="subject-pills">{subjectCards.map((item) => <button type="button" key={item.key} onClick={() => { setFilter(item.disciplineId); setQuery(item.subject) }} className={filter === item.disciplineId && query === item.subject ? 'selected' : ''}><span style={{ background: item.color }} /><div><strong>{item.subject}</strong><small>{item.disciplineName}{item.subtopic ? ` · ${item.subtopic}` : ''} · {item.total} questões</small></div><b className={item.rate < 70 ? 'low' : ''}>{item.rate}%</b></button>)}</div>
      {!filteredSubjects.length && <div className="subject-map-empty"><Search size={21} /><strong>Nenhum assunto encontrado</strong><p>Tente outra busca ou limpe os filtros do mapa.</p>{hasMapFilters && <button type="button" onClick={resetSubjectMap}>Limpar filtros</button>}</div>}
      {filteredSubjects.length > 6 && <div className="show-all-row"><button className="secondary-button" onClick={() => setShowAllSubjects(!showAllSubjects)}>{showAllSubjects ? 'Mostrar menos' : `Ver todos os ${filteredSubjects.length} assuntos`}<ChevronDown size={15} className={showAllSubjects ? 'rotated' : ''} /></button></div>}
    </section>
    <section className="card table-card"><div className="table-toolbar"><div><h2>Histórico de baterias</h2><p>Dados inseridos após resolver no QConcursos</p></div><div className="table-filters"><label><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar assunto" /></label><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todas as matérias</option>{disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><button className="primary-button small" onClick={onAdd}><Plus size={16} />Nova bateria</button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>Matéria / assunto</th><th>Questões</th><th>Acertos</th><th>Aproveitamento</th><th /></tr></thead><tbody>{visible.map((b) => { const d = disciplines.find((x) => x.id === b.disciplineId)!; const rate = percentage(b.correct, b.total); return <tr key={b.id}><td>{dateLabel(b.date)}</td><td><div className="table-subject"><span style={{ background: d.color }} /><div><strong>{d.name}</strong><small>{b.subject}{b.subtopic ? ` · ${b.subtopic}` : ''}</small></div></div></td><td>{b.total}</td><td>{b.correct}</td><td><div className="rate-cell"><span className={rate < 70 ? 'rate-low' : rate >= 80 ? 'rate-high' : ''}>{rate}%</span><div><i style={{ width: `${rate}%` }} /></div></div></td><td><button className="ghost-icon danger" onClick={() => onDelete(b.id)} title="Excluir"><Trash2 size={16} /></button></td></tr>})}</tbody></table>{!visible.length && <Empty title="Nenhuma bateria encontrada" detail="Ajuste os filtros ou registre um novo bloco de questões." />}</div>
    </section>
  </div>
}

function QuestionModal({ disciplines, onClose, onSave }: { disciplines: Discipline[]; onClose: () => void; onSave: (b: QuestionBatch) => void }) {
  const [disciplineId, setDisciplineId] = useState(disciplines[0].id)
  const [subject, setSubject] = useState('')
  const [subtopic, setSubtopic] = useState('')
  const [total, setTotal] = useState(20)
  const [correct, setCorrect] = useState(0)
  const [date, setDate] = useState(today())
  const [origin, setOrigin] = useState<QuestionBatch['origin']>('study')
  const submit = (e: FormEvent) => { e.preventDefault(); if (!subject.trim() || total < 1 || correct < 0 || correct > total) return; onSave({ id: uid(), disciplineId, subject: subject.trim(), subtopic: subtopic.trim() || undefined, origin, total, correct, date }) }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}><div className="modal-head"><div><span className="eyebrow">REGISTRO RÁPIDO</span><h2>Como foi a bateria?</h2><p>Copie apenas o resultado que obteve no QConcursos.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <div className="form-grid"><label className="full">Matéria<select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>{disciplines.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><label className="full">Contexto da bateria<select value={origin} onChange={(e) => setOrigin(e.target.value as QuestionBatch['origin'])}><option value="study">Estudo normal — inicia o ciclo 24h, 7d e 30d</option><option value="review">Revisão — conta no desempenho, sem novo ciclo</option></select></label><label className="full">Assunto específico <span>— obrigatório</span><input autoFocus required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: Porcentagem" /><small>Use sempre o mesmo nome para acumular o histórico desse assunto.</small></label><label className="full">Subassunto <span>(opcional)</span><input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} placeholder="Ex.: aumento e desconto sucessivos" /></label><label>Questões feitas<input type="number" min="1" value={total} onChange={(e) => { const v = +e.target.value; setTotal(v); if (correct > v) setCorrect(v) }} /></label><label>Acertos<input type="number" min="0" max={total} value={correct} onChange={(e) => setCorrect(+e.target.value)} /></label><label className="full">Data da bateria<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
    <div className="result-preview"><span>Aproveitamento desta bateria</span><strong>{percentage(correct, total)}%</strong><div className="progress"><i style={{ width: `${percentage(correct, total)}%` }} /></div></div>
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button"><Check size={17} />Salvar bateria</button></div>
  </form></div>
}

function Edict({ sections, setSections, notify }: { sections: EdictSection[]; setSections: (v: EdictSection[]) => void; notify: (s: string) => void }) {
  const [open, setOpen] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newSection, setNewSection] = useState(sections[0]?.id ?? '')
  const allTopics = sections.flatMap((s) => flattenTopics(s.topics))
  const done = allTopics.filter((t) => t.status !== 'Não iniciado').length
  const revised = allTopics.filter((t) => t.status === 'Revisado').length
  const filtered = sections.filter((s) => !search || `${s.title} ${flattenTopics(s.topics).map((t) => t.title).join(' ')}`.toLowerCase().includes(search.toLowerCase()))

  const cycleStatus = (sectionId: string, topicId: string) => {
    const next = sections.map((section) => section.id !== sectionId ? section : { ...section, topics: updateTopic(section.topics, topicId, (topic) => ({ ...topic, status: statusOrder[(statusOrder.indexOf(topic.status) + 1) % statusOrder.length] })) })
    setSections(next)
  }
  const addTopic = (e: FormEvent) => { e.preventDefault(); if (!newTitle.trim()) return; setSections(sections.map((s) => s.id === newSection ? { ...s, topics: [...s.topics, { id: uid(), title: newTitle.trim(), status: 'Não iniciado' }] } : s)); setNewTitle(''); notify('Assunto incluído no edital.') }

  return <div className="page-content">
    <section className="edict-hero card"><div><span className="eyebrow">PROGRESSO DO CONTEÚDO</span><strong>{Math.round((done / Math.max(allTopics.length, 1)) * 100)}%</strong><p>{done} de {allTopics.length} itens já iniciados · {revised} revisados</p></div><div className="radial" style={{ '--progress': `${(done / Math.max(allTopics.length, 1)) * 360}deg` } as React.CSSProperties}><span>{done}<small>iniciados</small></span></div><div className="legend"><span><i className="s-lido" />Lido</span><span><i className="s-resumido" />Resumido</span><span><i className="s-revisado" />Revisado</span></div></section>
    <div className="edict-layout"><section className="card tree-card"><div className="tree-toolbar"><label><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no edital" /></label><span>{sections.length} matérias · {allTopics.length} itens</span></div>
      <div className="tree-list">{filtered.map((section, index) => { const expanded = open.includes(section.id) || Boolean(search); const topics = flattenTopics(section.topics); const sectionDone = topics.filter((x) => x.status !== 'Não iniciado').length; return <div className="tree-section" key={section.id}><button className="section-head" onClick={() => setOpen(expanded ? open.filter((x) => x !== section.id) : [...open, section.id])}><span className="section-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{section.title}</strong><small>{sectionDone}/{topics.length} itens iniciados</small></div><div className="section-progress"><i style={{ width: `${percentage(sectionDone, topics.length)}%` }} /></div><b>{percentage(sectionDone, topics.length)}%</b>{expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>{expanded && <div className="topic-list">{section.topics.map((topic) => <TopicRow key={topic.id} topic={topic} onCycle={(id) => cycleStatus(section.id, id)} />)}</div>}</div> })}</div>
    </section>
    <aside className="edict-aside"><form className="card add-topic" onSubmit={addTopic}><div className="aside-icon"><Plus size={18} /></div><h3>Adicionar conteúdo</h3><p>Inclua seus próprios assuntos sem alterar o texto-base do edital.</p><label>Matéria<select value={newSection} onChange={(e) => setNewSection(e.target.value)}>{sections.map((s) => <option value={s.id} key={s.id}>{s.title}</option>)}</select></label><label>Assunto<input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Novo assunto ou observação" /></label><button className="secondary-button">Adicionar ao final</button></form><div className="source-note"><FileText size={18} /><div><strong>Fonte oficial</strong><p>Edital nº 1 — PMAL, de 19 de março de 2026. Conteúdo de Soldado extraído das páginas 56, 57 e 62.</p></div></div></aside></div>
  </div>
}

function TopicRow({ topic, onCycle, depth = 0 }: { topic: EdictTopic; onCycle: (id: string) => void; depth?: number }) {
  return <><div className="topic-row" style={{ paddingLeft: `${20 + depth * 28}px` }}><button className={`status-check status-${topic.status.toLowerCase().replace(' ', '-')}`} onClick={() => onCycle(topic.id)} title="Alterar status">{topic.status === 'Revisado' ? <Check size={14} /> : topic.status === 'Não iniciado' ? '' : <span />}</button><span>{topic.title}</span><button className={`status-chip status-${topic.status.toLowerCase().replace(' ', '-')}`} onClick={() => onCycle(topic.id)}>{topic.status}</button></div>{topic.children?.map((child) => <TopicRow key={child.id} topic={child} onCycle={onCycle} depth={depth + 1} />)}</>
}

function flattenTopics(topics: EdictTopic[]): EdictTopic[] { return topics.flatMap((topic) => [topic, ...flattenTopics(topic.children ?? [])]) }
function updateTopic(topics: EdictTopic[], id: string, fn: (t: EdictTopic) => EdictTopic): EdictTopic[] { return topics.map((t) => t.id === id ? fn(t) : { ...t, ...(t.children ? { children: updateTopic(t.children, id, fn) } : {}) }) }

function Cycle({ disciplines, setDisciplines, availability, setAvailability, missions, setMissions, sessions, batches, weeklyPlan, setWeeklyPlan, notify }: { disciplines: Discipline[]; setDisciplines: (d: Discipline[]) => void; availability: Availability[]; setAvailability: (a: Availability[]) => void; missions: Mission[]; setMissions: (m: Mission[]) => void; sessions: StudySession[]; batches: QuestionBatch[]; weeklyPlan: WeeklyPlanItem[]; setWeeklyPlan: (p: WeeklyPlanItem[]) => void; notify: (s: string) => void }) {
  const currentDay = new Date().getDay()
  const [planDay, setPlanDay] = useState(currentDay)
  const [planDiscipline, setPlanDiscipline] = useState(disciplines[0].id)
  const todayMissions = missions.filter((m) => m.date === today())
  const studiedTodaySeconds = studySecondsOnDate(sessions, today())
  const studiedTodayMinutes = Math.round(studiedTodaySeconds / 60)
  const capacity = availability.find((a) => a.day === currentDay)?.minutes ?? 0
  const alerts = reviewAlerts(batches, missions)
  const dueReviews = alerts.filter((review) => review.daysLate >= 0)
  const nextReviews = alerts.filter((review) => review.daysLate < 0 && review.daysLate >= -7).slice(0, 6)
  const difficultyMinutes = (difficulty: Discipline['difficulty'], review = false) => {
    if (review) return difficulty === 'Difícil' ? 25 : difficulty === 'Médio' ? 20 : 15
    return difficulty === 'Difícil' ? 60 : difficulty === 'Médio' ? 45 : 30
  }
  const generate = () => {
    const scheduled = weeklyPlan.filter((item) => item.day === currentDay)
    const candidates = [
      ...dueReviews.map((review) => { const difficulty = disciplines.find((d) => d.id === review.disciplineId)?.difficulty; return { disciplineId: review.disciplineId, title: `Revisão ${review.interval} · ${review.subject}${review.subtopic ? ` · ${review.subtopic}` : ''}`, review: true, priority: 100 + review.daysLate + (difficulty === 'Difícil' ? 10 : difficulty === 'Médio' ? 5 : 0) } }),
      ...scheduled.map((item) => { const discipline = disciplines.find((d) => d.id === item.disciplineId)!; return { disciplineId: item.disciplineId, title: `${discipline.name} · estudo planejado`, review: false, priority: discipline.difficulty === 'Difícil' ? 10 : discipline.difficulty === 'Médio' ? 5 : 0 } }),
    ].sort((a, b) => b.priority - a.priority)
    const completedToday = todayMissions.filter((mission) => mission.completed)
    const remaining = Math.max(0, capacity - studiedTodayMinutes)
    const uniqueCandidates = candidates.filter((item, index) => candidates.findIndex((candidate) => candidate.title === item.title) === index)
    const selectedCandidates = uniqueCandidates.slice(0, Math.floor(remaining / 15))
    const weights = selectedCandidates.map((item) => {
      const discipline = disciplines.find((candidate) => candidate.id === item.disciplineId)!
      return difficultyMinutes(discipline.difficulty, item.review)
    })
    const allocations = distributeMinutesByWeight(remaining, weights)
    const generated: Mission[] = selectedCandidates.map((item, index) => ({
      id: uid(),
      disciplineId: item.disciplineId,
      title: item.title,
      plannedMinutes: allocations[index],
      completed: false,
      notes: '',
      date: today(),
    }))
    setMissions([...missions.filter((m) => m.date !== today()), ...completedToday, ...generated])
    notify(generated.length
      ? `${generated.length} missões criadas, preenchendo ${formatMinutes(remaining)} conforme a dificuldade.`
      : 'Adicione matérias ao ciclo de hoje para distribuir seu tempo disponível.')
  }
  const toggle = (id: string) => setMissions(missions.map((m) => m.id === id ? { ...m, completed: !m.completed } : m))
  const deleteMission = (id: string) => {
    setMissions(missions.filter((mission) => mission.id !== id))
    notify('Missão removida.')
  }
  const cancelTodayMissions = () => {
    if (!window.confirm('Cancelar todas as missões de hoje? Esta ação removerá também as missões já concluídas.')) return
    setMissions(missions.filter((mission) => mission.date !== today()))
    notify('Missões de hoje canceladas.')
  }
  const addPlanItem = (event: FormEvent) => {
    event.preventDefault()
    if (weeklyPlan.some((item) => item.day === planDay && item.disciplineId === planDiscipline)) return notify('Essa matéria já está nesse dia.')
    setWeeklyPlan([...weeklyPlan, { id: uid(), day: planDay, disciplineId: planDiscipline }])
    notify('Matéria adicionada ao ciclo semanal.')
  }

  return <div className="page-content cycle-layout"><section className="cycle-main"><div className="cycle-summary"><div><span>CAPACIDADE DE HOJE</span><strong>{formatMinutes(capacity)}</strong></div><div><span>ESTUDADO HOJE</span><strong>{formatStudySeconds(studiedTodaySeconds)}</strong></div><div><span>REVISÕES PENDENTES</span><strong>{dueReviews.length}</strong></div><section className="cycle-actions"><button className="primary-button" onClick={generate}><Sparkles size={17} />Gerar missões de hoje</button>{todayMissions.length > 0 && <button className="secondary-button cancel-missions" onClick={cancelTodayMissions}><Trash2 size={16} />Cancelar missões de hoje</button>}</section></div>
    <section className="card weekly-card"><CardTitle title="Meu ciclo semanal" subtitle="Defina exatamente o que pretende estudar em cada dia" />
      <div className="week-grid">{dayNames.map((day, index) => <div className={`week-day ${index === currentDay ? 'current' : ''}`} key={day}><div className="week-day-head"><strong>{day}</strong>{index === currentDay && <span>HOJE</span>}</div><div className="week-items">{weeklyPlan.filter((item) => item.day === index).map((item) => { const d = disciplines.find((discipline) => discipline.id === item.disciplineId)!; return <div className="week-item" key={item.id}><i style={{ background: d.color }} /><div><strong>{d.name}</strong></div><button onClick={() => setWeeklyPlan(weeklyPlan.filter((plan) => plan.id !== item.id))} title="Remover do ciclo"><X size={13} /></button></div> })}{!weeklyPlan.some((item) => item.day === index) && <span className="free-day">Livre</span>}</div></div>)}</div>
      <form className="plan-form simple" onSubmit={addPlanItem}><select value={planDay} onChange={(e) => setPlanDay(+e.target.value)}>{dayNames.map((day, index) => <option value={index} key={day}>{day}</option>)}</select><select value={planDiscipline} onChange={(e) => setPlanDiscipline(e.target.value)}>{disciplines.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select><button className="secondary-button"><Plus size={16} />Adicionar matéria</button></form>
    </section>
    <section className="card review-card"><CardTitle title="Alertas de revisão" subtitle="Agenda automática: 24 horas, 7 dias e 30 dias após estudar o assunto" />
      <div className="review-lanes"><div><span className="review-lane-title due"><BellRing size={14} />PENDENTES · {dueReviews.length}</span>{dueReviews.slice(0, 6).map((review) => { const d = disciplines.find((item) => item.id === review.disciplineId)!; return <div className="review-row" key={review.id}><i style={{ background: d.color }} /><div><strong>{review.subject}</strong><small>{d.name} · revisão de {review.interval}</small></div><span className="overdue">{review.daysLate === 0 ? 'Hoje' : `${review.daysLate}d atrasada`}</span></div> })}{!dueReviews.length && <p className="review-empty">Nenhuma revisão pendente.</p>}</div><div><span className="review-lane-title">PRÓXIMAS</span>{nextReviews.map((review) => { const d = disciplines.find((item) => item.id === review.disciplineId)!; return <div className="review-row" key={review.id}><i style={{ background: d.color }} /><div><strong>{review.subject}</strong><small>{d.name} · revisão de {review.interval}</small></div><span>{dateLabel(review.dueDate)}</span></div> })}</div></div>
    </section>
    <section className="card"><CardTitle title="Missões de hoje" subtitle="Primeiro entram as revisões pendentes; depois, os assuntos do ciclo semanal" />
      <MissionList missions={todayMissions} disciplines={disciplines} sessions={sessions} onToggle={toggle} onDelete={deleteMission} />
    </section></section>
    <aside className="cycle-aside"><section className="card schedule-card"><CardTitle title="Disponibilidade" subtitle="Horas brutas por dia" /><div className="availability">{availability.map((a) => <label key={a.day} className={a.day === currentDay ? 'today' : ''}><span>{dayNames[a.day]}{a.day === currentDay && <small>HOJE</small>}</span><div><button type="button" onClick={() => setAvailability(availability.map((x) => x.day === a.day ? { ...x, minutes: Math.max(0, x.minutes - 30) } : x))}>−</button><strong>{formatMinutes(a.minutes)}</strong><button type="button" onClick={() => setAvailability(availability.map((x) => x.day === a.day ? { ...x, minutes: x.minutes + 30 } : x))}>+</button></div></label>)}</div></section>
    <section className="card difficulty-card"><CardTitle title="Dificuldade com função" subtitle="Define prioridade e tempo sugerido" /><div className="difficulty-help"><span><b>Fácil</b>30min · revisão 15min</span><span><b>Médio</b>45min · revisão 20min</span><span><b>Difícil</b>60min · revisão 25min</span></div><div>{disciplines.map((d) => <label key={d.id}><span><i style={{ background: d.color }} />{d.name}</span><select value={d.difficulty} onChange={(e) => setDisciplines(disciplines.map((x) => x.id === d.id ? { ...x, difficulty: e.target.value as Discipline['difficulty'] } : x))}><option>Fácil</option><option>Médio</option><option>Difícil</option></select></label>)}</div></section></aside>
  </div>
}

function MissionList({ missions, disciplines, sessions, onToggle, onDelete }: { missions: Mission[]; disciplines: Discipline[]; sessions: StudySession[]; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return <div className="mission-list">{missions.map((mission, index) => {
    const discipline = disciplines.find((item) => item.id === mission.disciplineId)
    if (!discipline) return null
    const studiedSeconds = studySecondsForMission(sessions, mission.id)
    const timeLabel = studiedSeconds > 0
      ? `${formatStudySeconds(studiedSeconds)} de foco realizado`
      : mission.completed
        ? 'Sem tempo de foco registrado'
        : `${formatMinutes(mission.plannedMinutes)} de foco sugerido`

    return <div className={`mission-card ${mission.completed ? 'done' : ''}`} key={mission.id}><span className="mission-index">{String(index + 1).padStart(2, '0')}</span><span className="subject-mark" style={{ background: discipline.color }} /><div className="mission-copy"><small style={{ color: discipline.color }}>{discipline.name.toUpperCase()} · {discipline.difficulty.toUpperCase()}</small><strong>{mission.title}</strong><span><Clock3 size={14} />{timeLabel}</span></div><div className="mission-actions"><button className={mission.completed ? 'complete-button completed' : 'complete-button'} onClick={() => onToggle(mission.id)}>{mission.completed ? <><Check size={16} />Concluída</> : 'Concluir'}</button><button className="mission-delete" onClick={() => onDelete(mission.id)} title="Excluir missão" aria-label={`Excluir missão ${mission.title}`}><Trash2 size={15} /></button></div></div>
  })}{!missions.length && <Empty title="Seu dia ainda está em branco" detail="Configure o ciclo semanal e gere as missões do dia." />}</div>
}

function Focus({ disciplines, missions, setMissions, sessions, setSessions, batches, setBatches, liquidTimer, setLiquidTimer, notify }: { disciplines: Discipline[]; missions: Mission[]; setMissions: (m: Mission[]) => void; sessions: StudySession[]; setSessions: (s: StudySession[]) => void; batches: QuestionBatch[]; setBatches: (b: QuestionBatch[]) => void; liquidTimer: LiquidTimerState; setLiquidTimer: (timer: LiquidTimerState) => void; notify: (s: string) => void }) {
  const [disciplineId, setDisciplineId] = useState(disciplines[0].id)
  const [missionId, setMissionId] = useState('')
  const [elapsed, setElapsed] = useState(() => runningTimerSeconds(liquidTimer.elapsed, liquidTimer.running ? liquidTimer.startedAt : null))
  const [running, setRunning] = useState(liquidTimer.running)
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<'liquido' | 'pomodoro'>('liquido')
  const [focusMinutes, setFocusMinutes] = useState(50)
  const [breakMinutes, setBreakMinutes] = useState(10)
  const [remaining, setRemaining] = useState(50 * 60)
  const [phase, setPhase] = useState<'Foco' | 'Pausa'>('Foco')
  const [recordQuestions, setRecordQuestions] = useState(false)
  const [questionDrafts, setQuestionDrafts] = useState<QuestionBatchDraft[]>(() => [createQuestionBatchDraft()])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      if (mode === 'liquido') setElapsed(runningTimerSeconds(liquidTimer.elapsed, liquidTimer.startedAt))
      else setRemaining((v) => {
        if (v > 0) return v - 1
        const next = phase === 'Foco' ? 'Pausa' : 'Foco'
        setPhase(next)
        notify(next === 'Pausa' ? 'Ciclo concluído. Hora de respirar.' : 'Pausa encerrada. Vamos voltar?')
        return (next === 'Foco' ? focusMinutes : breakMinutes) * 60
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [running, mode, phase, focusMinutes, breakMinutes, liquidTimer.elapsed, liquidTimer.startedAt])

  const pauseLiquidTimer = () => {
    const currentElapsed = runningTimerSeconds(liquidTimer.elapsed, liquidTimer.startedAt)
    setElapsed(currentElapsed)
    setLiquidTimer({ elapsed: currentElapsed, running: false, startedAt: null })
    setRunning(false)
  }
  const toggleTimer = () => {
    if (mode === 'pomodoro') return setRunning(!running)
    if (running) return pauseLiquidTimer()
    const startedAt = Date.now()
    setLiquidTimer({ elapsed, running: true, startedAt })
    setRunning(true)
  }

  const selectMission = (id: string) => {
    setMissionId(id)
    const mission = missions.find((item) => item.id === id)
    if (!mission) {
      setQuestionDrafts([createQuestionBatchDraft()])
      return
    }

    setDisciplineId(mission.disciplineId)
    if (!mission.title.startsWith('Revisão ')) {
      setQuestionDrafts([createQuestionBatchDraft()])
      return
    }

    const [, subject = '', ...subtopic] = mission.title.split(' · ')
    setQuestionDrafts([createQuestionBatchDraft('review', subject, subtopic.join(' · '))])
    setRecordQuestions(true)
  }

  const updateQuestionDraft = (id: string, update: Partial<QuestionBatchDraft>) => {
    setQuestionDrafts(questionDrafts.map((draft) => draft.id === id ? { ...draft, ...update } : draft))
  }

  const selectedMission = missions.find((mission) => mission.id === missionId)
  const isReviewMission = selectedMission?.title.startsWith('Revisão ') ?? false

  const save = () => {
    const savedElapsed = running ? runningTimerSeconds(liquidTimer.elapsed, liquidTimer.startedAt) : elapsed
    if (savedElapsed < 1) return notify('Inicie o cronômetro antes de salvar.')
    const invalidDraftIndex = recordQuestions ? invalidQuestionBatchIndex(questionDrafts) : -1
    if (invalidDraftIndex >= 0) {
      return notify(`Confira o assunto, as questões e os acertos da bateria ${invalidDraftIndex + 1}.`)
    }

    setSessions([{ id: uid(), disciplineId, missionId: missionId || undefined, seconds: savedElapsed, notes, date: today() }, ...sessions])
    if (recordQuestions) {
      setBatches([...questionBatchesFromDrafts(questionDrafts, disciplineId, today()), ...batches])
    }
    if (missionId) setMissions(missions.map((m) => m.id === missionId ? { ...m, completed: true, notes } : m))
    setLiquidTimer({ elapsed: 0, running: false, startedAt: null })
    const savedBatchCount = questionDrafts.length
    setRunning(false); setElapsed(0); setNotes(''); setRecordQuestions(false); setQuestionDrafts([createQuestionBatchDraft()]); notify(recordQuestions ? `Sessão e ${savedBatchCount} ${savedBatchCount === 1 ? 'bateria salva' : 'baterias salvas'}.` : 'Sessão salva como tempo líquido.')
  }
  const resetPomodoro = (newPhase = phase) => { setRunning(false); setRemaining((newPhase === 'Foco' ? focusMinutes : breakMinutes) * 60) }

  return <div className="page-content focus-layout"><section className="focus-stage card"><div className="mode-tabs"><button className={mode === 'liquido' ? 'active' : ''} onClick={() => { setMode('liquido'); setRunning(liquidTimer.running); setElapsed(runningTimerSeconds(liquidTimer.elapsed, liquidTimer.running ? liquidTimer.startedAt : null)) }}>Horas líquidas</button><button className={mode === 'pomodoro' ? 'active' : ''} onClick={() => { if (mode === 'liquido' && running) pauseLiquidTimer(); setMode('pomodoro'); setRunning(false) }}>Pomodoro</button></div>
    <div className="focus-selector"><label>Matéria<select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>{disciplines.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label><label>Missão do dia<select value={missionId} onChange={(e) => selectMission(e.target.value)}><option value="">Sessão livre</option>{missions.filter((m) => m.date === today() && !m.completed).map((m) => <option value={m.id} key={m.id}>{m.title}</option>)}</select></label></div>
    {mode === 'liquido' ? <div className="timer-face"><span className="timer-label">TEMPO LÍQUIDO</span><strong>{formatClock(elapsed)}</strong><p>{running ? 'Cronômetro em andamento. Pause sempre que sair do foco.' : elapsed ? 'Sessão pausada. Retome quando estiver pronto.' : 'O tempo só conta quando você está estudando.'}</p><div className="timer-actions"><button className="reset-button" onClick={() => { setLiquidTimer({ elapsed: 0, running: false, startedAt: null }); setRunning(false); setElapsed(0) }}><RotateCcw size={20} /></button><button className="play-button" onClick={toggleTimer}>{running ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{running ? 'Pausar' : elapsed ? 'Continuar' : 'Começar'}</button><button className="save-time" disabled={!elapsed} onClick={save}><Check size={20} /></button></div></div> : <div className="timer-face"><span className="timer-label">{phase.toUpperCase()}</span><strong>{formatClock(remaining)}</strong><p>{phase === 'Foco' ? `${focusMinutes} minutos de atenção sem negociar.` : `${breakMinutes} minutos para recuperar a energia.`}</p><div className="timer-actions"><button className="reset-button" onClick={() => resetPomodoro()}><RotateCcw size={20} /></button><button className="play-button" onClick={toggleTimer}>{running ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{running ? 'Pausar' : 'Iniciar ciclo'}</button><button className="reset-button" onClick={() => { const next = phase === 'Foco' ? 'Pausa' : 'Foco'; setPhase(next); resetPomodoro(next) }}><ChevronRight size={20} /></button></div></div>}
    <div className="session-questions"><label className="session-question-toggle"><input type="checkbox" checked={recordQuestions} onChange={(e) => setRecordQuestions(e.target.checked)} /><span><strong>Registrar questões desta sessão</strong><small>Cada assunto será salvo como uma bateria independente.</small></span></label>{recordQuestions && <div className="session-question-list">{questionDrafts.map((draft, index) => <section className="session-question-entry" key={draft.id}><header><strong>Bateria {index + 1}</strong>{questionDrafts.length > 1 && <button type="button" onClick={() => setQuestionDrafts(questionDrafts.filter((item) => item.id !== draft.id))} aria-label={`Remover bateria ${index + 1}`} title="Remover bateria"><Trash2 size={14} /></button>}</header><div className="session-question-grid"><label>Contexto<select value={draft.origin} onChange={(e) => updateQuestionDraft(draft.id, { origin: e.target.value as QuestionBatchDraft['origin'] })}><option value="study">Estudo normal</option><option value="review">Revisão</option></select></label><label className="wide">Assunto <input value={draft.subject} onChange={(e) => updateQuestionDraft(draft.id, { subject: e.target.value })} placeholder="Ex.: Segurança da Informação" /></label><label className="wide">Subassunto <span>(opcional)</span><input value={draft.subtopic} onChange={(e) => updateQuestionDraft(draft.id, { subtopic: e.target.value })} placeholder="Ex.: malwares e antivírus" /></label><label>Questões feitas<input type="number" min="1" value={draft.total} onChange={(e) => { const total = +e.target.value; updateQuestionDraft(draft.id, { total, ...(draft.correct > total ? { correct: total } : {}) }) }} /></label><label>Acertos<input type="number" min="0" max={draft.total} value={draft.correct} onChange={(e) => updateQuestionDraft(draft.id, { correct: +e.target.value })} /></label><p className={draft.origin === 'review' ? 'review-context' : ''}>{draft.origin === 'review' ? 'Conta no desempenho e não gera uma nova sequência de revisões.' : 'Este assunto terá revisões próprias em 24h, 7 dias e 30 dias.'}</p></div></section>)}{!isReviewMission && <button type="button" className="secondary-button add-question-batch" onClick={() => setQuestionDrafts([...questionDrafts, createQuestionBatchDraft()])}><Plus size={15} />Adicionar outro assunto</button>}</div>}</div>
    <div className="notes-area"><label><FileText size={16} />Diário de bordo <span>— pegadinhas, dúvidas e pontos para revisar</span></label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: confundi o prazo da prisão temporária; revisar a tabela amanhã..." /><small>Salvo junto à sessão quando você concluir.</small></div>
  </section>
  <aside className="focus-aside"><section className="card pomodoro-settings"><CardTitle title="Configurar Pomodoro" subtitle="Personalize os blocos" /><label>Tempo de foco<div><input type="number" min="1" max="120" value={focusMinutes} onChange={(e) => { const v = +e.target.value; setFocusMinutes(v); if (!running && phase === 'Foco') setRemaining(v * 60) }} /><span>min</span></div></label><label>Tempo de pausa<div><input type="number" min="1" max="60" value={breakMinutes} onChange={(e) => { const v = +e.target.value; setBreakMinutes(v); if (!running && phase === 'Pausa') setRemaining(v * 60) }} /><span>min</span></div></label></section>
    <section className="card session-history"><CardTitle title="Sessões recentes" subtitle={`${formatStudySeconds(sessions.reduce((a, s) => a + s.seconds, 0))} acumuladas`} /><div>{sessions.slice(0, 5).map((s) => { const d = disciplines.find((x) => x.id === s.disciplineId)!; return <div key={s.id}><i style={{ background: d.color }} /><div><strong>{d.name}</strong><small>{dateLabel(s.date)}</small></div><b>{formatStudySeconds(s.seconds)}</b></div>})}</div></section>
  </aside></div>
}

function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty"><ListChecks size={28} /><strong>{title}</strong><p>{detail}</p></div> }
