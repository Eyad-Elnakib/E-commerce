import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { zxcvbnOptions, zxcvbnAsync } from '@zxcvbn-ts/core'
import * as zxcvbnCommon from '@zxcvbn-ts/language-common'
import * as zxcvbnEn from '@zxcvbn-ts/language-en'

import { authApi } from '../api/auth'
import { useToast } from '../components/ToastProvider'
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

type RegisterFormData = z.infer<typeof registerSchema>

export const RegisterPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    setFocus,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const navigate = useNavigate()
  const toast = useToast()

  const usernameValue = watch('username')
  const passwordValue = watch('password')

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [passwordScore, setPasswordScore] = useState<number>(0)
  const [passwordFeedback, setPasswordFeedback] = useState<string>('')

  // Debounced username check
  useEffect(() => {
    if (!usernameValue || errors.username) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { available } = await authApi.checkUsername(usernameValue)
        setUsernameStatus(available ? 'available' : 'taken')
      } catch (err) {
        setUsernameStatus('idle')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [usernameValue, errors.username])

  // zxcvbn password strength check
  useEffect(() => {
    if (!passwordValue) {
      setPasswordScore(0)
      setPasswordFeedback('')
      return
    }

    const checkStrength = async () => {
      const result = await zxcvbnAsync(passwordValue)
      setPasswordScore(result.score) // 0 to 4
      setPasswordFeedback(result.feedback.warning || result.feedback.suggestions[0] || '')
    }
    checkStrength()
  }, [passwordValue])

  const onSubmit = async (data: RegisterFormData) => {
    // Basic client-side checks before sending
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
      toast.success({
        title: 'Account created',
        body: 'Please sign in with your new credentials.',
      })
      navigate('/login')
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Find which field is conflicting based on detail message
        const msg = String(err.response.data?.detail || '').toLowerCase()
        if (msg.includes('username')) {
          setError('username', { message: 'Username is already taken' })
          setFocus('username')
        } else if (msg.includes('email')) {
          setError('email', { message: 'Email is already taken' })
          setFocus('email')
        } else {
          // Generic fallback
          setError('username', { message: 'Username or email taken' })
          setFocus('username')
        }
      } else {
        toast.error({
          title: 'Registration failed',
          body: err.response?.data?.detail || 'An unexpected error occurred.',
        })
      }
    }
  }

  const scoreColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-700']

  return (
    <div className="login-body">
      <div className="animated-ring">
        <i></i>
        <i></i>
        <i></i>
        
        <div className="login-container" style={{ width: '320px' }}>
          <h2>Sign Up</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-4" noValidate>
            
            {/* Full Name */}
            <div className="inputBx">
              <input
                id="full_name"
                type="text"
                placeholder="Full Name"
                {...register('full_name')}
              />
              <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold">
                {errors.full_name?.message}
              </div>
            </div>

            {/* Username */}
            <div className="inputBx relative">
              <input
                id="username"
                type="text"
                placeholder="Username"
                {...register('username')}
                className="pr-8"
              />
              <div className="absolute right-4 top-[22px] -translate-y-1/2 flex items-center pointer-events-none">
                {usernameStatus === 'checking' && <span className="text-gray-500 font-bold">⏳</span>}
                {usernameStatus === 'available' && <span className="text-[var(--color-success)] font-bold">✓</span>}
                {usernameStatus === 'taken' && <span className="text-[var(--color-error)] font-bold">✗</span>}
              </div>
              <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold">
                {errors.username?.message || (usernameStatus === 'taken' && !errors.username && 'Username is taken')}
              </div>
            </div>

            {/* Email */}
            <div className="inputBx">
              <input
                id="email"
                type="email"
                placeholder="Email"
                {...register('email')}
              />
              <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold">
                {errors.email?.message}
              </div>
            </div>

            {/* Password */}
            <div className="inputBx">
              <input
                id="password"
                type="password"
                placeholder="Password"
                {...register('password')}
              />
              
              {/* Strength Meter */}
              {passwordValue && (
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
              
              <div aria-live="polite" className="text-[#2b0202] text-xs mt-1 min-h-[16px] text-center font-bold">
                {errors.password?.message}
              </div>
            </div>

            <div className="inputBx mt-2">
              <button
                type="submit"
                disabled={!isValid || isSubmitting || usernameStatus === 'taken'}
              >
                {isSubmitting ? 'Creating...' : 'Sign Up'}
              </button>
            </div>

            <div className="links" style={{ justifyContent: 'center' }}>
              <Link to="/login">Already have an account? Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
