import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { zxcvbnOptions, zxcvbnAsync } from '@zxcvbn-ts/core'
import * as zxcvbnCommon from '@zxcvbn-ts/language-common'
import * as zxcvbnEn from '@zxcvbn-ts/language-en'

import { authApi } from '../api/auth'
import { useToast } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import { SpidermanError } from '../components/SpidermanError'
import './LoginPage.css'

// Initialize zxcvbn options
zxcvbnOptions.setOptions({
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnEn.dictionary,
  },
  graphs: zxcvbnCommon.adjacencyGraphs,
  translations: zxcvbnEn.translations,
})

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Max 100 characters'),
  username: z
    .string()
    .min(1, 'Username is required')
    .max(32, 'Max 32 characters')
    .regex(/^[a-z0-9_]+$/i, 'Only lowercase letters, numbers, and underscores allowed'),
  email: z.string().email('Invalid email address').max(255, 'Max 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type AuthFormData = {
  username: string;
  password: string;
  full_name?: string;
  email?: string;
}

export const AuthPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [isLogin, setIsLogin] = useState(location.pathname === '/login')

  useEffect(() => {
    setIsLogin(location.pathname === '/login')
  }, [location.pathname])

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setFocus,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    mode: 'onChange',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const usernameValue = watch('username')
  const passwordValue = watch('password')

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [passwordScore, setPasswordScore] = useState<number>(0)
  const [passwordFeedback, setPasswordFeedback] = useState<string>('')

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault()
    clearErrors()
    setErrorMsg('')
    const newMode = !isLogin
    setIsLogin(newMode)
    window.history.pushState({}, '', newMode ? '/login' : '/register')
  }

  // Rate limit timer
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return
    const timer = setInterval(() => {
      setRetryAfter((prev) => (prev && prev > 1 ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAfter])

  // Username check
  useEffect(() => {
    // Clear status immediately when typing or switching modes
    if (isLogin || !usernameValue) {
      setUsernameStatus('idle')
      return
    }

    // If there's already a validation error (regex, length), don't check API
    if (errors.username) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { available } = await authApi.checkUsername(usernameValue)
        // Verify value hasn't changed since request started
        setUsernameStatus(available ? 'available' : 'taken')
      } catch (err) {
        setUsernameStatus('idle')
      }
    }, 400) // Slightly longer debounce for reliability

    return () => clearTimeout(timer)
  }, [usernameValue, isLogin, !!errors.username])

  // Password strength check
  useEffect(() => {
    if (isLogin || !passwordValue) {
      setPasswordScore(0)
      setPasswordFeedback('')
      return
    }

    const checkStrength = async () => {
      const result = await zxcvbnAsync(passwordValue)
      setPasswordScore(result.score)
      setPasswordFeedback(result.feedback.warning || result.feedback.suggestions[0] || '')
    }
    checkStrength()
  }, [passwordValue, isLogin])

  const onSubmit = async (data: any) => {
    setErrorMsg('')
    if (isLogin) {
      try {
        const res = await authApi.login(data)
        setAuth(res.access_token, res.user)
        const searchParams = new URLSearchParams(location.search)
        const redirectUrl = searchParams.get('redirect')
        if (redirectUrl) {
          navigate(redirectUrl)
        } else if (!res.user.onboarding_completed && res.user.role !== 'admin') {
          navigate('/onboarding')
        } else {
          navigate('/feed')
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setErrorMsg('Incorrect username or password.')
        } else if (err.response?.status === 429) {
          const retryHeader = err.response.headers['retry-after']
          if (retryHeader) setRetryAfter(parseInt(retryHeader, 10))
        } else {
          setErrorMsg('An unexpected error occurred. Please try again.')
        }
      }
    } else {
      if (data.password.toLowerCase() === data.username.toLowerCase()) {
        setError('password', { message: 'Password must not be the same as your username' })
        setFocus('password')
        return
      }
      if (/^\d+$/.test(data.password)) {
        setError('password', { message: 'Password must not be purely numeric' })
        setFocus('password')
        return
      }

      try {
        await authApi.register(data)
        toast.success({ title: 'Account created', body: 'Please sign in with your new credentials.' })
        // Switch to login
        reset({ password: '' })
        setIsLogin(true)
        window.history.pushState({}, '', '/login')
      } catch (err: any) {
        if (err.response?.status === 409) {
          const msg = String(err.response.data?.detail || '').toLowerCase()
          if (msg.includes('username')) {
            setError('username', { message: 'Username is already taken' })
            setFocus('username')
          } else if (msg.includes('email')) {
            setError('email', { message: 'Email is already taken' })
            setFocus('email')
          } else {
            setError('username', { message: 'Username or email taken' })
            setFocus('username')
          }
        } else {
          toast.error({ title: 'Registration failed', body: err.response?.data?.detail || 'An unexpected error occurred.' })
        }
      }
    }
  }

  const onError = (errors: any) => {
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      setErrorMsg(firstError.message);
      // Automatically clear it after 5 seconds so the spider goes away
      setTimeout(() => setErrorMsg(''), 5000);
    }
  }

  const scoreColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-700']

  return (
    <div className="login-body">
      <div className={`animated-ring ${!isLogin ? 'register-mode' : ''}`}>
        <i></i>
        <i></i>
        <i></i>
        
        <div className="login-container" style={{ width: '320px' }}>
          <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
          
          <form onSubmit={handleSubmit(onSubmit, onError)} className="w-full flex flex-col gap-4" noValidate>
            
            {/* Split Group 1: Full Name & Username */}
            <div className="split-group">
              <div className={`collapsible-input ${isLogin ? 'collapsed' : ''}`}>
                <div className="inputBx pb-4">
                  <input
                    id="full_name"
                    type="text"
                    placeholder="Full Name"
                    {...register('full_name')}
                  />
                  <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold absolute w-full">
                    {!isLogin && errors.full_name?.message}
                  </div>
                </div>
              </div>

              <div className="inputBx relative">
                <input
                  id="username"
                  type="text"
                  placeholder="Username"
                  {...register('username')}
                  className={!isLogin ? "pr-8" : ""}
                />
                {!isLogin && (
                  <div className="absolute right-4 top-[22px] -translate-y-1/2 flex items-center pointer-events-none">
                    {usernameStatus === 'checking' && <span className="text-gray-500 font-bold">⏳</span>}
                    {usernameStatus === 'available' && <span className="text-[var(--color-success)] font-bold">✓</span>}
                    {usernameStatus === 'taken' && <span className="text-[var(--color-error)] font-bold">✗</span>}
                  </div>
                )}
                <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold absolute w-full">
                  {errors.username?.message || (!isLogin && usernameStatus === 'taken' && !errors.username && 'Username is taken')}
                </div>
              </div>
            </div>

            {/* Split Group 2: Email & Password */}
            <div className="split-group mt-2">
              <div className={`collapsible-input ${isLogin ? 'collapsed' : ''}`}>
                <div className="inputBx pb-4">
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    {...register('email')}
                  />
                  <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold absolute w-full">
                    {!isLogin && errors.email?.message}
                  </div>
                </div>
              </div>

              <div className="inputBx relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  {...register('password')}
                  className="pr-12"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-[25px] -translate-y-1/2 text-sm font-bold text-[#2b0202] hover:text-[#f0674c] transition-colors focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
                
                {/* Strength Meter (only visible on register) */}
                <div className={`collapsible-input ${isLogin ? 'collapsed' : ''}`}>
                  {passwordValue && !isLogin && (
                    <div className="mt-2 w-full px-2">
                      <div className="h-1.5 w-full bg-gray-300/40 rounded overflow-hidden flex">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-full flex-1 transition-colors duration-300 ${
                              i < passwordScore ? scoreColors[passwordScore] : 'bg-transparent'
                            } ${i > 0 ? 'border-l border-white/30' : ''}`}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-[#2b0202] font-bold mt-1 min-h-[14px] text-center">
                        {passwordFeedback}
                      </div>
                    </div>
                  )}
                </div>

                <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold absolute w-full">
                  {errors.password?.message}
                </div>
              </div>
            </div>

            <div aria-live="polite" className="relative min-h-[20px] mt-4 text-center text-sm font-bold text-[var(--color-error)]">
              {(errorMsg || retryAfter !== null) ? (retryAfter !== null ? `Too many attempts — try again in ${retryAfter}s` : errorMsg) : null}
            </div>
            {(errorMsg || retryAfter !== null) && (
              <SpidermanError message={retryAfter !== null ? `Too many attempts — try again in ${retryAfter}s` : errorMsg} />
            )}

            <div className="inputBx">
              <button
                type="submit"
                disabled={isSubmitting || retryAfter !== null || (!isLogin && usernameStatus === 'taken')}
              >
                {isSubmitting ? (isLogin ? 'Signing in...' : 'Creating...') : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </div>

            <div className="links" style={{ justifyContent: 'center' }}>
              <button type="button" onClick={toggleMode} className="bg-transparent border-none cursor-pointer">
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
            
            {isLogin && (
              <div className="links" style={{ justifyContent: 'center', marginTop: '-10px' }}>
                <a href="#" className="text-xs">Forget Password</a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
