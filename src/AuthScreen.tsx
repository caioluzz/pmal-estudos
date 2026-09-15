import { FormEvent, useState } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from './supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')
    setMessage('')

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        })

    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage('Conta criada. Confira seu e-mail para confirmar o acesso.')
    }
  }

  const resetPassword = async () => {
    if (!supabase || !email.trim()) {
      setError('Informe seu e-mail primeiro.')
      return
    }
    setLoading(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (resetError) setError(resetError.message)
    else setMessage('Enviamos um link de recuperação para seu e-mail.')
  }

  return <main className="auth-page">
    <section className="auth-intro">
      <div className="auth-brand"><div className="brand-mark"><span /></div><div><strong>PMAL</strong><small>ESTUDOS · SOLDADO</small></div></div>
      <div>
        <span className="eyebrow">SUA PREPARAÇÃO, EM UM SÓ LUGAR</span>
        <h1>Consistência que<br /><em>vira aprovação.</em></h1>
        <p>Questões, edital, ciclo semanal, revisões e horas líquidas sincronizados entre seus dispositivos.</p>
      </div>
      <div className="auth-benefits"><span><CheckCircle2 />Dados protegidos por usuário</span><span><CheckCircle2 />Sincronização automática</span><span><CheckCircle2 />Revisões de 24h, 7 e 30 dias</span></div>
    </section>
    <section className="auth-panel">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{mode === 'login' ? 'BEM-VINDO DE VOLTA' : 'CRIE SEU ACESSO'}</span>
        <h2>{mode === 'login' ? 'Entrar no PMAL Estudos' : 'Começar minha preparação'}</h2>
        <p>{mode === 'login' ? 'Seus dados serão carregados do Supabase.' : 'Sua conta mantém cada registro separado e protegido.'}</p>

        {mode === 'signup' && <label>Nome<div><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como quer ser chamado" required /></div></label>}
        <label>E-mail<div><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" required /></div></label>
        <label>Senha<div><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>

        {error && <div className="auth-message error">{error}</div>}
        {message && <div className="auth-message success"><CheckCircle2 size={15} />{message}</div>}

        <button className="primary-button auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <>{mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight size={17} /></>}</button>
        {mode === 'login' && <button className="forgot-button" type="button" onClick={resetPassword}>Esqueci minha senha</button>}
        <div className="auth-switch">{mode === 'login' ? 'Ainda não possui conta?' : 'Já possui uma conta?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</button></div>
      </form>
    </section>
  </main>
}
