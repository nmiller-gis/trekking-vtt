import { Ship } from '@lcars-vtt/shared';

interface Props {
  ship: Ship;
  compact?: boolean;
}

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const danger = pct < 30;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="lcars-label text-xs">{label}</span>
        <span className={`text-sm font-bold ${danger ? 'text-lcars-red lcars-blink' : 'text-lcars-gold'}`}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all ${danger ? 'bg-lcars-red' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SystemValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-lcars-gold font-bold text-lg">{String(value).padStart(2, '0')}</div>
      <div className="lcars-label text-xs">{label}</div>
    </div>
  );
}

export default function ShipStatus({ ship, compact = false }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-lcars-amber font-bold uppercase">{ship.name}</span>
        <span className="text-gray-500 text-xs">{ship.registry}</span>
        <span className="text-gray-600 text-xs ml-auto">Scale {ship.scale}</span>
      </div>

      {/* Combat stats */}
      <div className="space-y-2">
        <StatBar label="Shields" current={ship.shields.current} max={ship.shields.max} color="bg-lcars-blue" />
        <StatBar label="Hull Integrity" current={ship.hullIntegrity.current} max={ship.hullIntegrity.max} color="bg-lcars-green-400" />
        <StatBar label="Power" current={ship.power.current} max={ship.power.max} color="bg-lcars-gold" />
      </div>

      <div className="flex gap-4">
        <div>
          <span className="lcars-label text-xs">Breaches</span>
          <div className={`text-lg font-bold ${ship.breaches > 0 ? 'text-lcars-red' : 'text-gray-600'}`}>
            {ship.breaches}
          </div>
        </div>
        <div>
          <span className="lcars-label text-xs">Crew Support</span>
          <div className="text-lg font-bold text-lcars-gold">
            {ship.crewSupport.current}/{ship.crewSupport.max}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Systems */}
          <div>
            <div className="lcars-header mb-2">Systems</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ship.systems) as [string, number][]).map(([key, val]) => (
                <SystemValue key={key} label={key.slice(0, 4).toUpperCase()} value={val} />
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <div className="lcars-header mb-2">Departments</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ship.departments) as [string, number][]).map(([key, val]) => (
                <SystemValue key={key} label={key.slice(0, 4).toUpperCase()} value={val} />
              ))}
            </div>
          </div>

          {/* Weapons */}
          {ship.weapons.length > 0 && (
            <div>
              <div className="lcars-header mb-2">Weapons</div>
              <div className="space-y-1">
                {ship.weapons.map((w, i) => (
                  <div key={i} className="flex justify-between items-baseline text-xs">
                    <span className="text-white">{w.name}</span>
                    <div className="flex gap-2 text-gray-400">
                      <span>{w.damage}[CD]</span>
                      <span className="text-gray-600">{w.range}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
