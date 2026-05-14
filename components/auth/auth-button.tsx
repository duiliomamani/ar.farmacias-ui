'use client'

import { useAuth } from './auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogIn, LogOut, ShieldCheck, User } from 'lucide-react'
import { AuthService } from '@/lib/api'

export function AuthButton() {
  const { user, isAuthenticated, logout, isLoading } = useAuth()

  const handleLogin = () => {
    window.location.href = AuthService.getGoogleLoginUrl()
  }

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse bg-muted rounded-full" />
  }

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.displayName || user.email} />
              <AvatarFallback>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-col items-start hidden md:flex">
              <span className="text-xs font-bold leading-none">
                {user.displayName || user.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {user.trustScore} pts
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="p-2">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl} alt={user.displayName || user.email}/>
                <AvatarFallback>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-bold truncate">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            {user.trustScore > 0 && (
              <div className="mt-2 px-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Nivel de Confianza</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${Math.min(user.trustScore, 100)}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-primary">{user.trustScore}</span>
                </div>
              </div>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Mi Perfil</span>
            <Badge variant="outline" className="ml-auto">Pronto</Badge>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleLogin}
      className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-bold gap-2"
    >
      <LogIn className="h-4 w-4" />
      <span>Ingresar</span>
    </Button>
  )
}
