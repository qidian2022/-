import { useEffect, useMemo, useState, type ReactNode } from 'react'
import rawQuestions from './generated/questions.json'
import {
  loadState,
  restartState,
  saveState,
  type Mode,
  type OptionKey,
  type Question,
} from './practice'

const questions = rawQuestions as Question[]
const byId = new Map(questions.map((question) => [question.id, question]))

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
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [state, setState] = useState(() => loadState(questions))
  const [showReset, setShowReset] = useState(false)
  const favoriteSet = useMemo(() => new Set(state.favorites), [state.favorites])
  const visibleIds = useMemo(
    () => state.mode === 'all' ? state.order : state.order.filter((id) => favoriteSet.has(id)),
    [state.mode, state.order, favoriteSet],
  )
  const currentIndex = Math.min(
    state.mode === 'all' ? state.allIndex : state.favoriteIndex,
    Math.max(visibleIds.length - 1, 0),
  )
  const question = byId.get(visibleIds[currentIndex])
  const selected = question ? state.answers[question.id] : undefined
  const answeredCount = Object.keys(state.answers).length
  const correctCount = Object.entries(state.answers).filter(
    ([id, answer]) => byId.get(Number(id))?.answer === answer,
  ).length
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0

  useEffect(() => saveState(state), [state])

  function changeMode(mode: Mode) {
    setState((previous) => ({ ...previous, mode }))
  }

  function toggleFavorite(id: number) {
    setState((previous) => ({
      ...previous,
      favorites: previous.favorites.includes(id)
        ? previous.favorites.filter((favorite) => favorite !== id)
        : [...previous.favorites, id],
    }))
  }

  function answerQuestion(id: number, answer: OptionKey) {
    setState((previous) => previous.answers[id]
      ? previous
      : { ...previous, answers: { ...previous.answers, [id]: answer } })
  }

  function moveTo(index: number) {
    if (index < 0 || index >= visibleIds.length) return
    setState((previous) => previous.mode === 'all'
      ? { ...previous, allIndex: index }
      : { ...previous, favoriteIndex: index })
  }

  function restart() {
    setState((previous) => restartState(previous, questions))
    setShowReset(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">稳</div>
          <div><strong>稳稳过</strong><span>科目一练习</span></div>
        </div>

        <div className="side-label">学习空间</div>
        <nav className="nav-list" aria-label="练习栏目">
          <button className={`nav-item ${state.mode === 'all' ? 'active' : ''}`} onClick={() => changeMode('all')} aria-current={state.mode === 'all' ? 'page' : undefined}>
            <Icon name="grid" /><span>全部题目</span><small>{questions.length}</small>
          </button>
          <button className={`nav-item ${state.mode === 'favorites' ? 'active' : ''}`} onClick={() => changeMode('favorites')} aria-current={state.mode === 'favorites' ? 'page' : undefined}>
            <Icon name="bookmark" /><span>我的收藏</span><small>{state.favorites.length}</small>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="side-card">
            <div className="side-card-icon"><Icon name="spark" size={18} /></div>
            <strong>每天进步一点点</strong>
            <p>选完答案，记得看看解析。理解比记住更重要。</p>
          </div>
          <div className="side-foot">数据仅保存在当前浏览器</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">学习空间 <span>/</span> {state.mode === 'all' ? '全部题目' : '我的收藏'}</div>
          <div className="topbar-right"><span className="status-dot" />离线题库 · 即开即练</div>
        </header>

        <div className="content-wrap">
          <section className="welcome">
            <div className="eyebrow"><span className="eyebrow-line" /> 科目一 · 理论知识</div>
            <h1>{state.mode === 'all' ? '把每一道题，做得更明白。' : '把值得回看的题，留在这里。'}</h1>
            <p>{state.mode === 'all' ? '从全部题目中随机练习，即时知道对错，慢慢练也能稳稳过。' : '你收藏的题目会一直保存在这台设备上，随时可以回来巩固。'}</p>
          </section>

          <section className="stats" aria-label="练习数据">
            <div className="stat"><span>已练题目</span><div><strong>{answeredCount}</strong><small> / {questions.length}</small></div><div className="stat-track"><span style={{ width: `${answeredCount / questions.length * 100}%` }} /></div></div>
            <div className="stat"><span>当前正确率</span><div><strong>{accuracy}</strong><small>%</small></div><div className="stat-caption">答对 {correctCount} 题</div></div>
            <div className="stat"><span>收藏题目</span><div><strong>{state.favorites.length}</strong><small> 道</small></div><div className="stat-caption">重点题，随时复习</div></div>
          </section>

          {question ? (
            <section className="question-card" aria-labelledby="question-title">
              <div className="question-top">
                <div className="question-count"><span className="count-accent">{String(currentIndex + 1).padStart(2, '0')}</span><span className="count-divider">/</span>{visibleIds.length} <span className="count-label">题</span></div>
                <div className="question-tools">
                  <span className="type-badge">{question.options.length === 2 ? '判断题' : '单选题'}</span>
                  <button className={`favorite-button ${favoriteSet.has(question.id) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(question.id)} aria-pressed={favoriteSet.has(question.id)} aria-label={favoriteSet.has(question.id) ? '取消收藏' : '收藏此题'} title={favoriteSet.has(question.id) ? '取消收藏' : '收藏此题'}><Icon name="bookmark" size={20} /></button>
                </div>
              </div>
              <div className="question-progress" aria-hidden="true"><span style={{ width: `${(currentIndex + 1) / visibleIds.length * 100}%` }} /></div>
              <div className="question-body">
                <div className="question-meta"><span>{question.chapter}</span><span className="meta-separator">·</span><span>原题 #{question.id}</span></div>
                <h2 id="question-title">{question.question}</h2>
                {question.images.length > 0 && <div className="question-images">{question.images.map((path) => <img key={path} src={`${import.meta.env.BASE_URL}${path}`} alt="题目配图" loading="lazy" />)}</div>}
                <div className="answer-hint">请选择一个答案</div>
                <div className="options">
                  {question.options.map((option) => {
                    const isCorrect = selected && option.key === question.answer
                    const isWrong = selected === option.key && option.key !== question.answer
                    return <button key={option.key} className={`option ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`} disabled={Boolean(selected)} onClick={() => answerQuestion(question.id, option.key)}>
                      <span className="option-letter">{option.key}</span><span className="option-text">{option.text}</span>
                      {isCorrect && <span className="option-result"><Icon name="check" size={17} /></span>}
                      {isWrong && <span className="option-result"><Icon name="close" size={17} /></span>}
                    </button>
                  })}
                </div>
                {selected && <div className={`explanation ${selected === question.answer ? 'is-correct' : 'is-wrong'}`} role="status">
                  <div className="explanation-icon"><Icon name={selected === question.answer ? 'check' : 'close'} size={19} /></div>
                  <div className="explanation-content"><strong>{selected === question.answer ? '答对了，很棒！' : `答错了，正确答案是 ${question.answer}`}</strong><p>{question.explanation || '暂无解析'}</p><a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">查看原题 <Icon name="external" size={14} /></a></div>
                </div>}
              </div>
              <div className="question-footer">
                <span className="keyboard-tip">按照自己的节奏，一题一题来</span>
                <div className="question-actions">
                  <button className="button-secondary" disabled={currentIndex === 0} onClick={() => moveTo(currentIndex - 1)}><Icon name="arrowLeft" size={17} /> 上一题</button>
                  <button className="button-primary" disabled={currentIndex === visibleIds.length - 1} onClick={() => moveTo(currentIndex + 1)}>下一题 <Icon name="arrowRight" size={17} /></button>
                </div>
              </div>
            </section>
          ) : <section className="empty-card"><div className="empty-icon"><Icon name="bookmark" size={27} /></div><h2>还没有收藏的题目</h2><p>遇到想回看的题，点击题目右上角的书签即可收藏。</p><button className="button-primary" onClick={() => changeMode('all')}>去刷题 <Icon name="arrowRight" size={17} /></button></section>}

          <div className="bottom-row">
            <div className="source-note">题库来源：<a href="https://www.aijiaxiao.com/tiba/kmy/" target="_blank" rel="noopener noreferrer">爱驾校</a> · 采集于 2026-09-23 · 内容未经官方核验</div>
            <button className="reset-link" onClick={() => setShowReset(true)}><Icon name="restart" size={16} /> 重新开始</button>
          </div>
        </div>
      </main>

      {showReset && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReset(false) }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><div className="modal-symbol"><Icon name="restart" size={23} /></div><h2 id="reset-title">重新开始练习？</h2><p>答题记录和当前进度会清空，题目顺序会重新打乱。收藏的题目会保留。</p><div className="modal-actions"><button className="button-secondary" onClick={() => setShowReset(false)}>继续练习</button><button className="button-primary" onClick={restart}>确认重新开始</button></div></div></div>}
    </div>
  )
}

export default App
