import React, { useReducer, useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { recommendationsApi } from '../api/telemetry'
import type { RecommendationItem } from '../api/telemetry'
import { ProductCard } from '../components/ProductCard'
import { ScrollingMessage } from '../components/ScrollingMessage'

type Answers = {
  recipient: string
  occasion: string
  personality: string
  budget: string
  ageGroup: string
  freeText: string
}

type State = {
  step: number
  answers: Answers
  submitted: boolean
}

type Action =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_ANSWER'; payload: { key: keyof Answers; value: string } }
  | { type: 'SUBMIT' }
  | { type: 'RESET' }

const initialState: State = {
  step: 1,
  answers: {
    recipient: '',
    occasion: '',
    personality: '',
    budget: '',
    ageGroup: '',
    freeText: ''
  },
  submitted: false
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.payload.key]: action.payload.value }
      }
    case 'SUBMIT':
      return { ...state, submitted: true }
    case 'RESET':
      return { ...initialState, step: 1 }
    default:
      return state
  }
}

const STEP_KEYS: (keyof Answers)[] = ['recipient', 'occasion', 'personality', 'budget', 'ageGroup', 'freeText']

const OPTIONS = {
  recipient: ['Mom', 'Dad', 'Partner', 'Friend', 'Child', 'Colleague', 'Self'],
  occasion: ['Birthday', 'Anniversary', 'Holiday', 'Graduation', 'Just Because'],
  personality: ['Techie', 'Outdoorsy', 'Creative', 'Bookworm', 'Foodie', 'Fashionable'],
  budget: ['Under $25', 'Under $50', 'Under $100', 'Any Budget'],
  ageGroup: ['Kids', 'Teens', 'Adults', 'Seniors']
}

export const GiftPage: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [results, setResults] = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const legendRef = useRef<HTMLLegendElement>(null)

  // Sync step with URL
  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      const step = parseInt(stepParam, 10)
      if (step >= 1 && step <= 7) {
        // Direct visit to /gift?step=4 with no prior answers redirects to ?step=1.
        // We check if the previous steps have answers
        let isValid = true
        for (let i = 1; i < step; i++) {
          const key = STEP_KEYS[i - 1]
          if (key !== 'freeText' && !state.answers[key]) {
            isValid = false
            break
          }
        }
        if (!isValid) {
          setSearchParams({ step: '1' }, { replace: true })
          dispatch({ type: 'SET_STEP', payload: 1 })
        } else if (state.step !== step) {
          dispatch({ type: 'SET_STEP', payload: step })
        }
      }
    } else {
      setSearchParams({ step: state.step.toString() }, { replace: true })
    }
  }, [searchParams, state.step, state.answers, setSearchParams])

  useEffect(() => {
    if (legendRef.current) {
      legendRef.current.focus()
    }
  }, [state.step])

  const handleNext = () => {
    if (state.step < 7) {
      setSearchParams({ step: (state.step + 1).toString() })
    }
  }

  const handleBack = () => {
    if (state.step > 1) {
      setSearchParams({ step: (state.step - 1).toString() })
    }
  }

  const handleEdit = (step: number) => {
    setSearchParams({ step: step.toString() })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentKey = STEP_KEYS[state.step - 1]
      // freeText is optional, others require a value
      if (currentKey === 'freeText' || state.answers[currentKey]) {
        handleNext()
      }
    }
  }

  const handleSubmit = async () => {
    dispatch({ type: 'SUBMIT' })
    setLoading(true)
    setError('')
    try {
      const payload = {
        recipient: state.answers.recipient,
        occasion: state.answers.occasion,
        personality: state.answers.personality,
        budget: state.answers.budget,
        age_group: state.answers.ageGroup,
        free_text: state.answers.freeText || undefined
      }
      const res = await recommendationsApi.getGift(payload)
      if (res.items) {
        setResults(res.items.slice(0, 6))
      }
    } catch (err) {
      setError('Failed to get recommendations.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartOver = () => {
    dispatch({ type: 'RESET' })
    setResults([])
    setError('')
    setSearchParams({ step: '1' })
  }

  const currentKey = state.step <= 6 ? STEP_KEYS[state.step - 1] : null
  const isNextDisabled = Boolean(currentKey && currentKey !== 'freeText' && !state.answers[currentKey])

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-[var(--text-color)] text-center">Gift Finder</h1>

      {/* Accessibility Live Region */}
      <div role="status" className="sr-only">
        {state.step <= 6 ? `Step ${state.step} of 6` : 'Summary step'}
      </div>

      {!state.submitted ? (
        <div className="p-0">
          {state.step <= 6 && (
            <div className="mb-8">
              <label htmlFor="progress" className="sr-only">Gift finder progress</label>
              <progress 
                id="progress"
                aria-valuenow={state.step} 
                aria-valuemin={1} 
                aria-valuemax={6} 
                aria-label="Gift finder progress"
                value={state.step} 
                max={6}
                className="w-full h-2 rounded overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-[var(--bg-tertiary)] [&::-webkit-progress-value]:bg-[var(--color-brand-maroon)]"
              />
              <div className="text-sm text-right mt-1 text-[var(--text-color-secondary)]">
                Step {state.step} of 6
              </div>
            </div>
          )}

          {state.step <= 6 && currentKey ? (
            <form onKeyDown={handleKeyDown} onSubmit={(e) => e.preventDefault()}>
              <fieldset>
                <legend className="sr-only">
                  {currentKey === 'recipient' && 'Who is this gift for?'}
                  {currentKey === 'occasion' && 'What is the occasion?'}
                  {currentKey === 'personality' && 'How would you describe their interests?'}
                  {currentKey === 'budget' && 'What is your budget?'}
                  {currentKey === 'ageGroup' && 'What is their age group?'}
                  {currentKey === 'freeText' && 'Any other specific requirements?'}
                </legend>
                {/* Photo Stack Question Display (Now with multiple cards for a real stack style) */}
                <div className="photo-stack" aria-hidden="true">
                  <div className="photo-card-deco deco-1" />
                  <div className="photo-card-deco deco-2" />
                  <div className="photo-card-deco deco-3" />
                  
                  <div className="photo-card">
                    <div className="photo-image-area p-6 sm:p-10">
                      {/* Question Text */}
                      <span className="photo-question-text mb-10">
                        {currentKey === 'recipient' && 'Who is this gift for?'}
                        {currentKey === 'occasion' && 'What is the occasion?'}
                        {currentKey === 'personality' && 'How would you describe their interests?'}
                        {currentKey === 'budget' && 'What is your budget?'}
                        {currentKey === 'ageGroup' && 'What is their age group?'}
                        {currentKey === 'freeText' && 'Any other specific requirements?'}
                      </span>

                      {/* Options / Textarea (Now inside the photo card) */}
                      {currentKey !== 'freeText' ? (
                        <div className="space-y-2 w-full">
                          {OPTIONS[currentKey as keyof typeof OPTIONS].map((option) => (
                            <label 
                              key={option} 
                              className={`block p-3 border-2 text-sm font-bold transition-all cursor-pointer ${
                                state.answers[currentKey] === option 
                                  ? 'border-black bg-[#4ade80] shadow-[4px_4px_0_rgba(0,0,0,1)] -translate-x-1 -translate-y-1' 
                                  : 'border-black/10 hover:border-black/30 bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={currentKey}
                                value={option}
                                checked={state.answers[currentKey] === option}
                                onChange={(e) => dispatch({ type: 'SET_ANSWER', payload: { key: currentKey, value: e.target.value } })}
                                className="sr-only"
                              />
                              <div className="flex items-center justify-between">
                                <span>{option.toUpperCase()}</span>
                                {state.answers[currentKey] === option && <span>✓</span>}
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full">
                          <textarea
                            maxLength={200}
                            rows={6}
                            value={state.answers.freeText}
                            onChange={(e) => dispatch({ type: 'SET_ANSWER', payload: { key: 'freeText', value: e.target.value } })}
                            className="w-full p-4 border-2 border-black font-bold text-sm bg-gray-50 focus:bg-white outline-none resize-none shadow-[4px_4px_0_rgba(0,0,0,1)]"
                            placeholder="TELL US MORE..."
                          />
                          <div className="text-[10px] font-black text-gray-500 text-right mt-2">
                            {state.answers.freeText.length} / 200
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={state.step === 1}
                  className="px-6 py-2 border border-[var(--border-color)] rounded text-[var(--text-color)] hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isNextDisabled}
                  className="px-6 py-2 bg-[var(--color-brand-maroon)] text-white rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            // Step 7: Summary Step
            <div>
              <h2 tabIndex={-1} ref={legendRef} className="text-xl font-semibold mb-6 focus:outline-none">Summary</h2>
              <div className="space-y-4 mb-8">
                {STEP_KEYS.map((key, idx) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-[var(--bg-tertiary)] rounded">
                    <div>
                      <span className="text-sm text-[var(--text-color-secondary)] uppercase block">{key}</span>
                      <span className="font-medium">{state.answers[key] || 'None'}</span>
                    </div>
                    <button
                      onClick={() => handleEdit(idx + 1)}
                      className="text-[var(--color-brand-maroon)] text-sm font-semibold underline"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 border border-[var(--border-color)] rounded text-[var(--text-color)] hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-[var(--color-brand-maroon)] text-white rounded hover:bg-opacity-90 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Finding...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Results Section
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[var(--bg-card)] p-4 rounded shadow border border-[var(--border-color)]">
            <h2 className="text-xl font-bold">Your Recommendations</h2>
            <button
              onClick={handleStartOver}
              className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--color-brand-maroon)] font-medium rounded hover:bg-gray-200"
            >
              Start Over
            </button>
          </div>

          {error && (
            <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
              <ScrollingMessage text={error} />
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-4">
                  <ProductCard product={item.product} matchPercent={item.match_percent} />
                  <div className="text-sm bg-white p-3 border border-[var(--border-color)] rounded shadow-sm text-gray-700">
                    <strong className="block mb-1 text-[var(--color-brand-maroon)]">Why this matches:</strong>
                    {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
