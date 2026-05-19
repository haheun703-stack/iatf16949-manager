import { Construction } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
}

export function ComingSoon({ title, subtitle }: Props): JSX.Element {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <Construction className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}
