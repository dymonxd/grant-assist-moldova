'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signup, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-2">
        <Label htmlFor="signup-name">Nume complet</Label>
        <Input
          id="signup-name"
          name="name"
          placeholder="Ion Popescu"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="email@exemplu.md"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-phone">Telefon</Label>
        <Input
          id="signup-phone"
          name="phone"
          type="tel"
          placeholder="+373..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Parola</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Cel putin 6 caractere"
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="signup-notifications" name="notifications" defaultChecked />
        <Label htmlFor="signup-notifications" className="text-sm font-normal leading-snug">
          Doresc sa primesc notificari despre termene si granturi noi
        </Label>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Se creeaza...' : 'Creaza cont'}
      </Button>
    </form>
  )
}
