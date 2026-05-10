import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import './LoginPage.css'

export const LoginPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { username: '', password: '' },
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((state) => state.setAuth)

  // Countdown for rate limiting
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return
    const timer = setInterval(() => {
      setRetryAfter((prev) => (prev && prev > 1 ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAfter])

  const onSubmit = async (data: any) => {
    setErrorMsg('')
    try {
      const res = await authApi.login(data)
      setAuth(res.access_token, res.user)
      
      // Navigate to redirect param or feed
      const searchParams = new URLSearchParams(location.search)
      const redirectUrl = searchParams.get('redirect') || '/feed'
      navigate(redirectUrl)
    } catch (err: any) {
      if (err.response?.status === 401) {
        // 401: Keep password value but show generic error
        setErrorMsg('Incorrect username or password.')
      } else if (err.response?.status === 429) {
        // 429: Too many attempts
        const retryHeader = err.response.headers['retry-after']
        if (retryHeader) {
          setRetryAfter(parseInt(retryHeader, 10))
        }
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.')
      }
    }
  }

  return (
    <div className="login-body">
      <div className="animated-ring">
        <i></i>
        <i></i>
        <i></i>
        
        <div className="login-container">
          <h2>Login</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-5" noValidate>
            <div className="inputBx">
              <input
                id="username"
                type="text"
                placeholder="Username"
                {...register('username')}
              />
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#2b0202] hover:text-[#f0674c] transition-colors focus:outline-none"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div aria-live="polite" className="text-[var(--color-error)] text-sm text-center min-h-[20px] font-bold">
              {retryAfter !== null ? `Too many attempts — try again in ${retryAfter}s` : errorMsg}
            </div>

            <div className="inputBx">
              <button
                type="submit"
                disabled={isSubmitting || retryAfter !== null}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="links">
              <a href="#">Forget Password</a>
              <Link to="/register">Signup</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
