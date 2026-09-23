import { useEffect, useMemo, useState, type ReactNode } from 'react'
import rawQuestions from './generated/questions.json'
import rawCompactQuestions from './generated/compact-questions.json'
import { COMPACT_ORDER_STORAGE_KEY, COMPACT_STORAGE_KEY, LEGACY_STORAGE_KEY, clearLegacyState, loadMigratedState, loadState, recordAnswer, restartState, saveState, type OptionKey, type Question } from './practice'
import { ACTIVE_PAGE_KEY, FAVORITE_INDEX_KEY, FULL_ORDER_KEY, loadFullOrder, makeRefs, shuffledKeys, type Page } from './catalog'

const questions = rawQuestions as Question[]
const compactQuestions = rawCompactQuestions as Question[]
const fullRefs = makeRefs(questions, 'full')
const compactRefs = makeRefs(compactQuestions, 'compact')
const refsByKey = new Map([...fullRefs, ...compactRefs].map((ref) => [ref.key, ref]))
const compactRefsById = new Map(compactRefs.map((ref) => [ref.id, ref]))
const compactIds = new Set(compactQuestions.map((question) => question.id))

function loadPage(): Page {
  try {
    const page = localStorage.getItem(ACTIVE_PAGE_KEY)
    if (page === 'full' || page === 'compact' || page === 'favorites') return page
    const bank = localStorage.getItem('kemuyi-active-bank-v1') === 'compact' ? 'compact' : 'full'
    const oldState = localStorage.getItem(bank === 'full' ? LEGACY_STORAGE_KEY : COMPACT_STORAGE_KEY)
    return oldState && JSON.parse(oldState)?.mode === 'favorites' ? 'favorites' : bank
  } catch { return 'full' }
}

function loadFavoriteIndex(): number {
  try {
    const value = Number(localStorage.getItem(FAVORITE_INDEX_KEY))
    return Number.isInteger(value) && value >= 0 ? value : 0
  } catch { return 0 }
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z" />,
    arrowRight: <><path d="M4 12h16" /><path d="m13 5 7 7-7 7" /></>,
    arrowLeft: <><path d="M20 12H4" /><path d="m11 5-7 7 7 7" /></>,
    external: <><path d="M14 4h6v6" /><path d="M10 14 20 4" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></>,
    restart: <><path d="M3 11a9 9 0 1 1 2.3 7" /><path d="M3 4v7h7" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    close: <><path d="M6 6 18 18" /><path d="M18 6 6 18" /></>,
    star: <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [page, setPage] = useState<Page>(loadPage)
  const [fullState, setFullState] = useState(() => loadMigratedState(questions))
  const [compactState, setCompactState] = useState(() => loadState(compactQuestions, COMPACT_ORDER_STORAGE_KEY))
  const [fullPractice, setFullPractice] = useState(() => loadFullOrder(fullRefs, fullState))
  const [favoriteIndex, setFavoriteIndex] = useState(loadFavoriteIndex)
  const [showReset, setShowReset] = useState(false)
  const [pendingAdvance, setPendingAdvance] = useState<{ page: Page; key: string; index: number } | null>(null)

  const favoriteSet = useMemo(() => new Set(fullState.favorites), [fullState.favorites])
  const visibleRefs = useMemo(() => {
    if (page === 'full') return fullPractice.order.map((key) => refsByKey.get(key)!).filter(Boolean)
    if (page === 'compact') return compactState.order.map((id) => compactRefsById.get(id)!).filter(Boolean)
    return fullPractice.order.map((key) => refsByKey.get(key)!).filter((ref) => ref && favoriteSet.has(ref.id))
  }, [page, fullPractice.order, compactState.order, favoriteSet])
  const rawIndex = page === 'full' ? fullPractice.index : page === 'compact' ? compactState.allIndex : favoriteIndex
  const currentIndex = Math.min(rawIndex, Math.max(visibleRefs.length - 1, 0))
  const currentRef = visibleRefs[currentIndex]
  const question = currentRef?.question
  const selected = currentRef && fullState.answers[currentRef.id]
  const statRefs = page === 'full' ? fullRefs : page === 'compact' ? compactRefs : visibleRefs
  const answeredCount = statRefs.filter((ref) => Boolean(fullState.answers[ref.id])).length
  const correctCount = statRefs.filter((ref) => fullState.answers[ref.id] === ref.question.answer).length
  const accuracy = answeredCount ? Math.round(correctCount / answeredCount * 100) : 0

  useEffect(() => saveState(fullState), [fullState])
  useEffect(() => saveState(compactState, COMPACT_ORDER_STORAGE_KEY), [compactState])
  useEffect(clearLegacyState, [])
  useEffect(() => { try { localStorage.setItem(FULL_ORDER_KEY, JSON.stringify(fullPractice)) } catch { /* Storage is optional. */ } }, [fullPractice])
  useEffect(() => { try { localStorage.setItem(FAVORITE_INDEX_KEY, String(favoriteIndex)) } catch { /* Storage is optional. */ } }, [favoriteIndex])
  useEffect(() => { try { localStorage.setItem(ACTIVE_PAGE_KEY, page) } catch { /* Storage is optional. */ } }, [page])
  useEffect(() => {
    if (!pendingAdvance) return
    if (pendingAdvance.page !== page || pendingAdvance.key !== currentRef?.key ||
      pendingAdvance.index !== currentIndex || selected !== question?.answer || currentIndex >= visibleRefs.length - 1) {
      setPendingAdvance(null)
      return
    }
    const timer = window.setTimeout(() => {
      if (pendingAdvance.page === 'full') {
        setFullPractice((previous) => previous.index === pendingAdvance.index && previous.order[previous.index] === pendingAdvance.key
          ? { ...previous, index: previous.index + 1 } : previous)
      } else if (pendingAdvance.page === 'compact') {
        setCompactState((previous) => previous.allIndex === pendingAdvance.index &&
          `compact:${previous.order[previous.allIndex]}` === pendingAdvance.key
          ? { ...previous, allIndex: previous.allIndex + 1 } : previous)
      } else {
        setFavoriteIndex((previous) => previous === pendingAdvance.index ? previous + 1 : previous)
      }
      setPendingAdvance(null)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [pendingAdvance, page, currentRef?.key, currentIndex, selected, question?.answer, visibleRefs.length])

  function switchPage(nextPage: Page) {
    setPendingAdvance(null)
    setPage(nextPage)
  }

  function toggleFavorite() {
    if (!currentRef) return
    const id = currentRef.id
    const update = (previous: typeof fullState) => ({
      ...previous,
      favorites: previous.favorites.includes(id)
        ? previous.favorites.filter((favorite) => favorite !== id)
        : [...previous.favorites, id],
    })
    setFullState(update)
  }

  function answerQuestion(answer: OptionKey) {
    if (!currentRef || !question || selected) return
    setFullState((previous) => recordAnswer(previous, currentRef.id, answer, question.answer))
    if (answer === question.answer && currentIndex < visibleRefs.length - 1) {
      setPendingAdvance({ page, key: currentRef.key, index: currentIndex })
    }
  }

  function moveTo(index: number) {
    if (index < 0 || index >= visibleRefs.length) return
    setPendingAdvance(null)
    if (page === 'full') setFullPractice((previous) => ({ ...previous, index }))
    else if (page === 'compact') setCompactState((previous) => ({ ...previous, allIndex: index }))
    else setFavoriteIndex(index)
  }

  function restart() {
    setPendingAdvance(null)
    if (page === 'compact') {
      setFullState((previous) => ({
        ...previous,
        answers: Object.fromEntries(Object.entries(previous.answers).filter(([id]) => !compactIds.has(Number(id)))),
      }))
      setCompactState((previous) => restartState(previous, compactQuestions))
    } else {
      setFullState((previous) => restartState(previous, questions))
      setCompactState((previous) => restartState(previous, compactQuestions))
      setFullPractice({ order: shuffledKeys(fullRefs), index: 0 })
      if (page === 'favorites') setFavoriteIndex(0)
    }
    setShowReset(false)
  }

  const pageName = page === 'full' ? '全量题库' : page === 'compact' ? 'C1/C2精简' : '我的收藏'
  const isCompactQuestion = currentRef?.bank === 'compact'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">稳</div><div><strong>稳稳过</strong><span>科目一练习 @qi_dian</span></div></div>
        <nav className="nav-list" aria-label="练习栏目">
          <button className={`nav-item ${page === 'full' ? 'active' : ''}`} onClick={() => switchPage('full')} aria-current={page === 'full' ? 'page' : undefined}><Icon name="grid" /><span>全量题库</span><small>{fullRefs.length}</small></button>
          <button className={`nav-item ${page === 'compact' ? 'active' : ''}`} onClick={() => switchPage('compact')} aria-current={page === 'compact' ? 'page' : undefined}><Icon name="spark" /><span>C1/C2精简</span><small>{compactRefs.length}</small></button>
          <button className={`nav-item ${page === 'favorites' ? 'active' : ''}`} onClick={() => switchPage('favorites')} aria-current={page === 'favorites' ? 'page' : undefined}><Icon name="bookmark" /><span>我的收藏</span><small>{favoriteSet.size}</small></button>
        </nav>
        <div className="sidebar-bottom"><div className="side-card"><div className="side-card-icon"><Icon name="spark" size={18} /></div><strong>每天进步一点点</strong><p>答错的题会自动加入收藏，方便之后集中复习。</p></div><div className="side-foot">数据仅保存在当前浏览器</div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">{pageName}</div><div className="topbar-right"><span className="topbar-status"><span className="status-dot" />离线题库 · 即开即练</span><a className="star-link" href="https://github.com/qidian2022/kemuyi-practice" target="_blank" rel="noopener noreferrer" title="前往 GitHub 给项目 Star"><Icon name="star" size={16} />给项目 Star</a></div></header>
        <div className="content-wrap">
          <section className="welcome"><div className="eyebrow"><span className="eyebrow-line" /> 科目一 · {pageName}</div><h1>{page === 'favorites' ? '把值得回看的题，留在这里。' : page === 'full' ? '把每一道题，做得更明白。' : `${compactRefs.length} 道核心题，集中练起来。`}</h1><p>{page === 'favorites' ? '两个题库的手动收藏和答错题都在这里。' : page === 'full' ? '从原题库随机练习，答对后 0.4 秒自动进入下一题。' : '从全量原题中精选 300 道，保留原选项与配图。'}</p></section>
          <section className="stats" aria-label="练习数据">
            <div className="stat"><span>已练题目</span><div><strong>{answeredCount}</strong><small> / {statRefs.length}</small></div><div className="stat-track"><span style={{ width: `${statRefs.length ? answeredCount / statRefs.length * 100 : 0}%` }} /></div></div>
            <div className="stat"><span>当前正确率</span><div><strong>{accuracy}</strong><small>%</small></div><div className="stat-caption">答对 {correctCount} 题</div></div>
            <div className="stat"><span>收藏题目</span><div><strong>{favoriteSet.size}</strong><small> 道</small></div><div className="stat-caption">两个题库的收藏与错题</div></div>
          </section>
          {question ? <section className="question-card" aria-labelledby="question-title">
            <div className="question-top"><div className="question-count"><span className="count-accent">{String(currentIndex + 1).padStart(2, '0')}</span><span className="count-divider">/</span>{visibleRefs.length} <span className="count-label">题</span></div><div className="question-tools"><span className="type-badge">{question.options.length === 2 ? '判断题' : '单选题'}</span><button className={`favorite-button ${favoriteSet.has(currentRef.id) ? 'is-favorite' : ''}`} onClick={toggleFavorite} aria-pressed={favoriteSet.has(currentRef.id)} aria-label={favoriteSet.has(currentRef.id) ? '取消收藏' : '收藏此题'} title={favoriteSet.has(currentRef.id) ? '取消收藏' : '收藏此题'}><Icon name="bookmark" size={20} /></button></div></div>
            <div className="question-progress" aria-hidden="true"><span style={{ width: `${(currentIndex + 1) / visibleRefs.length * 100}%` }} /></div>
            <div className="question-body"><div className="question-meta"><span>{question.chapter}</span><span className="meta-separator">·</span><span>{isCompactQuestion ? '精简题' : '原题'} #{question.id}</span></div><h2 id="question-title">{question.question}</h2>{question.images.length > 0 && <div className="question-images">{question.images.map((path) => <img key={path} src={`${import.meta.env.BASE_URL}${path}`} alt="题目配图" loading="lazy" />)}</div>}<div className="answer-hint">请选择一个答案</div><div className="options">{question.options.map((option) => { const isCorrect = Boolean(selected) && option.key === question.answer; const isWrong = selected === option.key && option.key !== question.answer; return <button key={option.key} className={`option ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} disabled={Boolean(selected)} onClick={() => answerQuestion(option.key)}><span className="option-letter">{option.key}</span><span className="option-text">{option.text}</span>{isCorrect && <span className="option-result"><Icon name="check" size={17} /></span>}{isWrong && <span className="option-result"><Icon name="close" size={17} /></span>}</button> })}</div>
              {selected && <div className={`explanation ${selected === question.answer ? 'is-correct' : 'is-wrong'}`} role="status"><div className="explanation-icon"><Icon name={selected === question.answer ? 'check' : 'close'} size={19} /></div><div className="explanation-content"><strong>{selected === question.answer ? '答对了，很棒！' : `答错了，正确答案是 ${question.answer}`}</strong><p>{question.explanation || '暂无解析'}</p><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">查看原题 <Icon name="external" size={14} /></a>{selected === question.answer && pendingAdvance?.key === currentRef.key && <span className="auto-result-note">即将进入下一题</span>}{selected !== question.answer && favoriteSet.has(currentRef.id) && <span className="auto-result-note">已在我的收藏中</span>}</div></div>}
            </div>
            <div className="question-footer"><span className="keyboard-tip">按照自己的节奏，一题一题来</span><div className="question-actions"><button className="button-secondary" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><Icon name="arrowLeft" size={17} /> 上一题</button><button className="button-primary" disabled={currentIndex === visibleRefs.length - 1} onClick={() => moveTo(currentIndex + 1)}>下一题 <Icon name="arrowRight" size={17} /></button></div></div>
          </section> : <section className="empty-card"><div className="empty-icon"><Icon name="bookmark" size={27} /></div><h2>还没有收藏的题目</h2><p>答错的题会自动加入这里，也可以点击书签收藏。</p><button className="button-primary" onClick={() => switchPage('full')}>去刷题 <Icon name="arrowRight" size={17} /></button></section>}
          <div className="bottom-row"><div className="source-note"><>题库来源：<a href="https://www.aijiaxiao.com/tiba/kmy/" target="_blank" rel="noopener noreferrer">爱驾校</a> · 采集于 2026-09-23 · 内容未经官方核验{isCompactQuestion && ' · 精选题未收录解析'}</></div><button className="reset-link" onClick={() => { setPendingAdvance(null); setShowReset(true) }}><Icon name="restart" size={16} /> 重新开始</button></div>
        </div>
      </main>
      {showReset && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReset(false) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="modal-symbol"><Icon name="restart" size={23} /></div><h2 id="reset-title">重新开始练习？</h2><p>{page === 'compact' ? '这 300 道题在两个入口的答题记录都会清空，精选题序重新打乱；收藏保留。' : page === 'full' ? '全部答题记录和两个入口的进度会清空，题目重新打乱；收藏保留。' : '全部答题记录和两个入口的进度会清空，题目重新打乱；收藏保留。'}</p><div className="modal-actions"><button className="button-secondary" onClick={() => setShowReset(false)}>继续练习</button><button className="button-primary" onClick={restart}>确认重新开始</button></div></div></div>}
    </div>
  )
}

export default App
