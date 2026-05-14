'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-context'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')

    if (token) {
      login(token)
      // Clean URL and redirect
      window.history.replaceState({}, document.title, '/')
      toast.success('¡Sesión iniciada correctamente!')
      router.push('/')
    } else {
      toast.error('Error al iniciar sesión', {
        description: 'No se recibió un token válido.',
      })
      router.push('/')
    }
  }, [searchParams, login, router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground italic">Verificando credenciales...</p>
      </div>
    </div>
  )
}
