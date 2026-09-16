'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// One text setting of the branding form: its label, its input, its hint, and the
// reason it is refused when the value does not have the shape the api accepts.
export default function GodBrandingField({
  id,
  label,
  hint,
  error,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  error?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
        {error ?? hint}
      </p>
    </div>
  );
}
