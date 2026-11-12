'use client';

import { useState } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/ui';
import { NBA_TEAMS, teamLabel, pickerShortLabel } from '@/lib/team-themes/teams';
import { canUseAlt, parseTeamChoice } from '@/lib/team-themes/theme';
import { useTeamTheme } from '@/providers/TeamThemeProvider';

/** Grid of all 30 teams + "use secondary as main colour" + reset. */
export function TeamPickerPanel({ onPicked, className }: { onPicked?: () => void; className?: string }) {
  const { team, setTeam } = useTeamTheme();
  const parsed = parseTeamChoice(team);

  return (
    <div className={cn('space-y-3', className)} data-testid="team-picker">
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Your team colours">
        {NBA_TEAMS.map((t) => {
          const selected = parsed?.team.abbr === t.abbr;
          return (
            <button
              key={t.abbr}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={teamLabel(t)}
              title={teamLabel(t)}
              onClick={() => { setTeam(t.abbr); onPicked?.(); }}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] font-bold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-foreground bg-muted' : 'border-border',
              )}
            >
              <span className="flex h-5 w-8 overflow-hidden rounded-md border border-black/10" aria-hidden="true">
                <span className="h-full w-1/2" style={{ backgroundColor: t.primary }} />
                <span className="h-full w-1/2" style={{ backgroundColor: t.secondary }} />
              </span>
              <span className="line-clamp-2 w-full text-center leading-tight">{pickerShortLabel(t)}</span>
              {selected && <Check className="absolute right-0.5 top-0.5 h-3 w-3" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {parsed && canUseAlt(parsed.team) && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <Label htmlFor="team-alt" className="text-xs font-semibold flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: parsed.team.secondary }} aria-hidden="true" />
            Use the second colour as the main colour
          </Label>
          <Switch
            id="team-alt"
            checked={parsed.alt}
            onCheckedChange={(on) => setTeam(on ? `${parsed.team.abbr}:alt` : parsed.team.abbr)}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {parsed ? `${teamLabel(parsed.team)} colours on` : 'Showing Benched orange'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          disabled={!parsed}
          onClick={() => { setTeam(null); onPicked?.(); }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Benched default
        </Button>
      </div>
    </div>
  );
}

/** Header (desktop) trigger: palette icon with the current team colour dot. */
export function TeamPickerButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { team } = useTeamTheme();
  const parsed = parseTeamChoice(team);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)} aria-label="Your team colours" title="Your team colours">
          <Palette className="h-5 w-5" />
          <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-background bg-primary" aria-hidden="true" />
          {parsed && <span className="sr-only">{teamLabel(parsed.team)} selected</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <p className="mb-2 text-sm font-bold">Your team</p>
        <p className="mb-3 text-xs text-muted-foreground">Colour the site in your chosen colours. Saved on this device and to your account when signed in.</p>
        <TeamPickerPanel />
      </PopoverContent>
    </Popover>
  );
}
