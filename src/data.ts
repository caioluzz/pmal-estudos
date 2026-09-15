import type { Availability, Discipline, EdictSection, EdictTopic, Mission, QuestionBatch, StudySession, WeeklyPlanItem } from './types'

export const disciplines: Discipline[] = [
  { id: 'portugues', name: 'Língua Portuguesa', color: '#b8f34a', difficulty: 'Médio' },
  { id: 'matematica', name: 'Matemática', color: '#67d8ff', difficulty: 'Difícil' },
  { id: 'informatica', name: 'Informática', color: '#a78bfa', difficulty: 'Médio' },
  { id: 'alagoas', name: 'Conhecimentos de Alagoas', color: '#fb923c', difficulty: 'Fácil' },
  { id: 'legislacao', name: 'Legislação PMAL', color: '#f472b6', difficulty: 'Difícil' },
  { id: 'administrativo', name: 'Direito Administrativo', color: '#2dd4bf', difficulty: 'Médio' },
  { id: 'constitucional', name: 'Direito Constitucional', color: '#fbbf24', difficulty: 'Médio' },
  { id: 'processo-penal', name: 'Processo Penal', color: '#60a5fa', difficulty: 'Médio' },
  { id: 'penal-militar', name: 'Direito Penal Militar', color: '#f87171', difficulty: 'Difícil' },
  { id: 'processo-penal-militar', name: 'Processo Penal Militar', color: '#c084fc', difficulty: 'Difícil' },
  { id: 'direitos-humanos', name: 'Direitos Humanos', color: '#34d399', difficulty: 'Fácil' },
]

const t = (id: string, title: string, children?: EdictTopic[]): EdictTopic => ({
  id,
  title,
  status: 'Não iniciado' as const,
  ...(children ? { children } : {}),
})

export const editalSoldado: EdictSection[] = [
  {
    id: 'portugues', title: 'Língua Portuguesa', topics: [
      t('pt-1', 'Compreensão e interpretação de textos de gêneros variados'),
      t('pt-2', 'Reconhecimento de tipos e gêneros textuais'),
      t('pt-3', 'Domínio da ortografia oficial'),
      t('pt-4', 'Mecanismos de coesão textual', [t('pt-4-1', 'Referenciação, substituição, repetição e conectores'), t('pt-4-2', 'Emprego de tempos e modos verbais')]),
      t('pt-5', 'Estrutura morfossintática do período', [t('pt-5-1', 'Classes de palavras'), t('pt-5-2', 'Coordenação'), t('pt-5-3', 'Subordinação'), t('pt-5-4', 'Pontuação'), t('pt-5-5', 'Concordância'), t('pt-5-6', 'Regência'), t('pt-5-7', 'Crase'), t('pt-5-8', 'Colocação pronominal')]),
      t('pt-6', 'Reescrita de frases e parágrafos', [t('pt-6-1', 'Significação das palavras'), t('pt-6-2', 'Substituição de palavras ou trechos'), t('pt-6-3', 'Reorganização de orações e períodos'), t('pt-6-4', 'Gêneros e níveis de formalidade')]),
    ],
  },
  {
    id: 'matematica', title: 'Matemática', topics: [
      t('mat-1', 'Conjuntos numéricos e operações'),
      t('mat-2', 'Proporções e divisão proporcional'),
      t('mat-3', 'Regra de três simples e composta'),
      t('mat-4', 'Porcentagem'),
      t('mat-5', 'Juros simples e compostos; capitalização e descontos'),
      t('mat-6', 'Taxas de juros: nominal, efetiva, equivalentes, proporcional, real e aparente'),
    ],
  },
  {
    id: 'informatica', title: 'Noções de Informática', topics: [
      t('inf-1', 'Sistema operacional Windows'),
      t('inf-2', 'Microsoft Office: textos, planilhas e apresentações'),
      t('inf-3', 'Redes de computadores', [t('inf-3-1', 'Internet e intranet'), t('inf-3-2', 'Navegadores'), t('inf-3-3', 'Correio eletrônico'), t('inf-3-4', 'Busca e pesquisa'), t('inf-3-5', 'Grupos de discussão e redes sociais'), t('inf-3-6', 'Computação em nuvem')]),
      t('inf-4', 'Gerenciamento de arquivos, pastas e programas'),
      t('inf-5', 'Segurança da informação', [t('inf-5-1', 'Procedimentos de segurança'), t('inf-5-2', 'Malware, vírus, worms e pragas'), t('inf-5-3', 'Antivírus, firewall e antispyware'), t('inf-5-4', 'Backup'), t('inf-5-5', 'Armazenamento em nuvem')]),
    ],
  },
  {
    id: 'alagoas', title: 'Conhecimentos do Estado de Alagoas', topics: [
      t('al-1', 'Formação histórica de Alagoas', [t('al-1-1', 'Colonização portuguesa'), t('al-1-2', 'Economia açucareira'), t('al-1-3', 'Emancipação política em 1817'), t('al-1-4', 'Elevação à Província em 1821')]),
      t('al-2', 'Quilombo dos Palmares', [t('al-2-1', 'Formação e resistência à escravidão'), t('al-2-2', 'Zumbi dos Palmares')]),
      t('al-3', 'Aspectos geográficos', [t('al-3-1', 'Litoral, Zona da Mata, Agreste e Sertão'), t('al-3-2', 'Rio São Francisco')]),
      t('al-4', 'Organização político-administrativa'),
      t('al-5', 'Economia estadual'),
      t('al-6', 'Cultura e patrimônio alagoano'),
    ],
  },
  {
    id: 'atualidades', title: 'Atualidades — prova discursiva', topics: [
      t('atu-1', 'Segurança, transportes, política, economia e sociedade'),
      t('atu-2', 'Educação, saúde, cultura e tecnologia'),
      t('atu-3', 'Energia, relações internacionais, sustentabilidade e ecologia'),
    ],
  },
  {
    id: 'legislacao', title: 'Legislação Pertinente ao Policial Militar de Alagoas', topics: [
      t('leg-1', 'Lei Estadual nº 5.346/1992 — Estatuto dos Policiais Militares de Alagoas'),
      t('leg-2', 'Decreto Estadual nº 37.042/1996 — Regulamento Disciplinar da PMAL'),
      t('leg-3', 'Código Penal — Parte Geral, Títulos I a III'),
      t('leg-4', 'Lei nº 7.716/1989 — crimes de preconceito de raça ou cor'),
      t('leg-5', 'Leis nº 8.072/1990 e nº 8.930/1994 — crimes hediondos'),
      t('leg-6', 'Lei nº 12.850/2013 — organizações criminosas'),
      t('leg-7', 'Lei nº 9.455/1997 — crimes de tortura'),
      t('leg-8', 'Lei nº 9.605/1998 — crimes ambientais'),
      t('leg-9', 'Lei nº 10.826/2003 — Estatuto do Desarmamento'),
      t('leg-10', 'Lei nº 11.343/2006 — Lei de Drogas'),
      t('leg-11', 'Lei nº 11.340/2006 — Lei Maria da Penha'),
      t('leg-12', 'Lei nº 9.503/1997 — Código de Trânsito Brasileiro'),
      t('leg-13', 'Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente'),
      t('leg-14', 'Lei nº 13.869/2019 — abuso de autoridade'),
      t('leg-15', 'Lei nº 7.960/1989 — prisão temporária'),
      t('leg-16', 'Lei nº 9.099/1995 — juizados especiais'),
      t('leg-17', 'Lei nº 10.259/2001 — juizados especiais federais'),
      t('leg-18', 'Lei Federal nº 14.751/2023 — Lei Orgânica das Polícias Militares'),
    ],
  },
  {
    id: 'administrativo', title: 'Noções de Direito Administrativo', topics: [
      t('adm-1', 'Princípios'), t('adm-2', 'Regime jurídico administrativo'), t('adm-3', 'Poderes da administração pública'), t('adm-4', 'Serviço público'), t('adm-5', 'Atos administrativos'), t('adm-6', 'Contratos administrativos e licitação'), t('adm-7', 'Bens públicos'), t('adm-8', 'Administração direta e indireta'), t('adm-9', 'Controle da administração pública'), t('adm-10', 'Responsabilidade do Estado'),
    ],
  },
  {
    id: 'constitucional', title: 'Noções de Direito Constitucional', topics: [
      t('const-1', 'Direitos e garantias fundamentais'), t('const-2', 'Estrutura e organização do Estado brasileiro'), t('const-3', 'Defesa do Estado e das instituições democráticas'),
    ],
  },
  {
    id: 'processo-penal', title: 'Noções de Direito Processual Penal', topics: [
      t('pp-1', 'Inquérito policial'), t('pp-2', 'Ação penal'),
    ],
  },
  {
    id: 'penal-militar', title: 'Noções de Direito Penal Militar', topics: [
      t('dpm-1', 'Aplicação da lei penal militar'), t('dpm-2', 'Crime'), t('dpm-3', 'Imputabilidade penal'), t('dpm-4', 'Concurso de agentes'), t('dpm-5', 'Penas', [t('dpm-5-1', 'Penas principais'), t('dpm-5-2', 'Penas acessórias'), t('dpm-5-3', 'Aplicação da pena')]), t('dpm-6', 'Efeitos da condenação'), t('dpm-7', 'Medidas de segurança'), t('dpm-8', 'Ação penal'), t('dpm-9', 'Extinção da punibilidade'), t('dpm-10', 'Crimes militares em tempo de paz'), t('dpm-11', 'Crimes propriamente militares'), t('dpm-12', 'Crimes impropriamente militares'), t('dpm-13', 'Crimes militares por extensão'),
    ],
  },
  {
    id: 'processo-penal-militar', title: 'Noções de Direito Processual Penal Militar', topics: [
      t('dppm-1', 'Processo penal militar e sua aplicação'), t('dppm-2', 'Polícia judiciária militar'), t('dppm-3', 'Inquérito policial militar'), t('dppm-4', 'Ação penal militar e seu exercício'), t('dppm-5', 'Prisão em flagrante'), t('dppm-6', 'Prisão preventiva'), t('dppm-7', 'Menagem'), t('dppm-8', 'Liberdade provisória e medidas de segurança'), t('dppm-9', 'Processos especiais: deserção e insubmissão'), t('dppm-10', 'Conselho Permanente e Conselho Especial de Justiça'),
    ],
  },
  {
    id: 'direitos-humanos', title: 'Noções de Direitos Humanos', topics: [
      t('dh-1', 'Conceito'), t('dh-2', 'Evolução'), t('dh-3', 'Abrangência'), t('dh-4', 'Sistema de proteção'), t('dh-5', 'Convenção Americana sobre Direitos Humanos — Pacto de São José'),
    ],
  },
]

// A estrutura começa vazia para que cada usuário registre apenas o próprio
// histórico de questões resolvidas no QConcursos.
export const initialBatches: QuestionBatch[] = []

export const initialAvailability: Availability[] = Array.from({ length: 7 }, (_, day) => ({ day, minutes: 0 }))

export const initialMissions: Mission[] = []

export const initialSessions: StudySession[] = []

export const initialWeeklyPlan: WeeklyPlanItem[] = []
