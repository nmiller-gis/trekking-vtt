import { useState } from 'react';
import { Character, Attributes, Disciplines, Value, Talent } from '@lcars-vtt/shared';
import { getSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../store/uiStore';

const TNG_SPECIES = [
  'Human', 'Vulcan', 'Betazoid', 'Trill', 'Bajoran', 'Bolian', 'Andorian',
  'Klingon', 'Ferengi', 'Cardassian', 'Romulan', 'El-Aurian', 'Caitian', 'Other',
];

const RANKS = [
  'Ensign', 'Lieutenant JG', 'Lieutenant', 'Lieutenant Commander',
  'Commander', 'Captain', 'Admiral', 'Civilian',
];

const ROLES = [
  'Commanding Officer', 'Executive Officer', 'Chief Science Officer',
  'Chief Medical Officer', 'Chief Engineer', 'Chief of Security',
  'Helmsman', 'Communications Officer', 'Counselor', 'Operations Officer', 'Other',
];

const TALENTS: Talent[] = [
  { name: 'Back Up Plans', description: 'Requires Control 9+. Whenever you or an ally fail a task (so long as you are present in the scene), you may add 1 point to the group\'s Momentum pool.' },
  { name: 'Bold', description: 'Choose a department when taking this talent. Whenever you attempt a task from that department and buy one or more d20s by adding Threat, you may re-roll a single d20. May be taken once per department; cannot coexist with Cautious in the same department.' },
  { name: 'Cautious', description: 'Choose a department when taking this talent. Whenever you attempt a task from that department and buy one or more d20s by spending Momentum, you may re-roll a single d20. May be taken once per department; cannot coexist with Bold in the same department.' },
  { name: 'Close Protection', description: 'Requires Security 4+. When you make a successful Attack, you may spend 1 Momentum to protect a single ally within Close range. The next Attack against that ally before the start of your next turn increases in Difficulty by 1.' },
  { name: 'Collaboration', description: 'Choose a department when taking this talent. Whenever an ally attempts a task using that department, you may spend 1 Momentum (Immediate) to allow them to use your rating for that department and one of your relevant focuses.' },
  { name: 'Computer Expertise', description: 'Requires Science 2+. Whenever you attempt a task that involves the programming or study of a computer system, the first bonus d20 you purchase is free.' },
  { name: 'Dauntless', description: 'Whenever another character attempts to intimidate or threaten you, you may suffer 2 Stress to ignore their attempt.' },
  { name: 'Duellist', description: 'When in personal combat, may reroll one d20.' },
  { name: 'Durability', description: 'Requires Augment or Cyborg trait. Whether through genetic engineering or cybernetic implants, you\'re more durable than most people. You gain Protection 2.' },
  { name: 'Empathy', description: 'Sense the emotions of most living beings nearby, and communicate telepathically with other empaths, telepaths, and those with whom you are extremely familiar. You cannot choose not to sense the emotions of those nearby, except for those resistant to telepathy. Picking out a specific individual in a crowd or blocking out nearby emotions requires effort and a task.' },
  { name: 'Energetic', description: 'Additional minor action in combat.' },
  { name: 'Field Medicine', description: 'Requires Medicine 3+. When attempting a Medicine task, you may ignore any increase in Difficulty or complication range for working without the proper tools or equipment.' },
  { name: 'Fly-By', description: 'Requires Conn 2+. Whenever you use the Swift Action Momentum spend, you do not increase the Difficulty of the second task if one of the tasks you attempt is to pilot a vessel.' },
  { name: 'Get Down!', description: 'Requires Security 2+. You and any allies within Close range gain +1 Protection while in Cover.' },
  { name: 'Hacker', description: '+1 bonus die on tasks to access, reprogram, or disable computer systems.' },
  { name: 'Infiltration', description: '+1 bonus die when moving undetected or in disguise.' },
  { name: 'Intense Scrutiny', description: 'Requires Engineering 3+ or Science 3+. Whenever you succeed at a task using Reason or Control as part of an extended task, you ignore any Resistance on that extended task.' },
  { name: 'Jack of All Trades', description: 'May substitute any discipline for another at +1 difficulty.' },
  { name: 'Precise Evasion', description: 'Requires Conn 4+. Whenever you use the Evasive Action major action, the ship does not suffer the increased Attack Difficulty normally caused by Evasive Action.' },
  { name: 'Resolute', description: 'Requires Human species (or GM permission). Your Maximum Stress increases by an amount equal to your Command rating.' },
  { name: 'Scholar', description: '+1 bonus die when conducting research or recalling obscure facts.' },
  { name: 'Shooter', description: '+1 bonus die on ranged weapon attacks.' },
  { name: 'Tactician', description: 'May spend Momentum to remove an enemy advantage.' },
  { name: 'Technical Expertise', description: 'Whenever you attempt a task assisted by the ship\'s Computers or Sensors, you may re-roll one d20 in your pool, or you may allow the ship to re-roll its d20.' },
  { name: 'Telepathy', description: 'Sense the surface thoughts and emotions of nearby beings, and communicate telepathically with other empaths and telepaths. Cannot choose not to sense the thoughts or emotions of those nearby, except for those resistant to telepathy. Picking out a specific individual in a crowd, searching for specific memories, or blocking out nearby minds requires effort and a task.' },
  { name: 'Testing a Theory', description: 'Requires Science 2+. When you attempt a task using Engineering or Science, the first bonus d20 you purchase is free, so long as you succeeded at a previous task in the same scientific or technological field earlier in the same adventure. If you created a trait representing a hypothesis, you may also re-roll one d20 on tasks related to that hypothesis.' },
  { name: 'Veteran', description: 'Requires Veteran career step (or GM discretion). Whenever you spend Determination, roll a d20. If the result is equal to or less than your Control rating, you immediately regain that point of Determination.' },
  { name: 'Walking Encyclopedia', description: 'Requires Science 2+ and Reason 9+. Once per session, when you attempt a task, you may spend 2 Momentum (Immediate) to gain an additional focus for the remainder of the session. However, any task using that focus increases its complication range by 1, as you are not a true expert on that subject.' },
];

type Step = 'identity' | 'attributes' | 'disciplines' | 'values' | 'focuses' | 'talents' | 'review';
const STEPS: Step[] = ['identity', 'attributes', 'disciplines', 'values', 'focuses', 'talents', 'review'];

const ATTR_TOTAL = 56;
const DISC_TOTAL = 16;

const defaultAttributes = (): Attributes => ({
  control: 8, daring: 8, fitness: 8, insight: 8, presence: 8, reason: 8,
});

const defaultDisciplines = (): Disciplines => ({
  command: 2, conn: 2, engineering: 2, medicine: 2, science: 2, security: 2,
});

interface Props {
  onCancel: () => void;
}

export default function CharacterCreator({ onCancel }: Props) {
  const { setView } = useUIStore();
  const [step, setStep] = useState<Step>('identity');

  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [species, setSpecies] = useState('Human');
  const [customSpecies, setCustomSpecies] = useState('');
  const [rank, setRank] = useState('Ensign');
  const [role, setRole] = useState('');
  const [assignment, setAssignment] = useState('USS Enterprise');

  const [attributes, setAttributes] = useState<Attributes>(defaultAttributes());
  const [disciplines, setDisciplines] = useState<Disciplines>(defaultDisciplines());
  const [values, setValues] = useState<Value[]>([
    { text: '', invoked: false, challenged: false },
    { text: '', invoked: false, challenged: false },
    { text: '', invoked: false, challenged: false },
    { text: '', invoked: false, challenged: false },
  ]);
  const [focuses, setFocuses] = useState<string[]>(['', '', '', '', '', '']);
  const [selectedTalents, setSelectedTalents] = useState<Talent[]>([]);

  const attrTotal = Object.values(attributes).reduce((a, b) => a + b, 0);
  const discTotal = Object.values(disciplines).reduce((a, b) => a + b, 0);

  const adjustAttr = (key: keyof Attributes, delta: number) => {
    const next = attributes[key] + delta;
    if (next < 7 || next > 12) return;
    if (delta > 0 && attrTotal >= ATTR_TOTAL) return;
    setAttributes((a) => ({ ...a, [key]: next }));
  };

  const adjustDisc = (key: keyof Disciplines, delta: number) => {
    const next = disciplines[key] + delta;
    if (next < 1 || next > 5) return;
    if (delta > 0 && discTotal >= DISC_TOTAL) return;
    setDisciplines((d) => ({ ...d, [key]: next }));
  };

  const toggleTalent = (talent: Talent) => {
    setSelectedTalents((prev) =>
      prev.find((t) => t.name === talent.name)
        ? prev.filter((t) => t.name !== talent.name)
        : [...prev, talent]
    );
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 'identity': return name.trim().length > 0;
      case 'attributes': return attrTotal === ATTR_TOTAL;
      case 'disciplines': return discTotal === DISC_TOTAL;
      case 'values': return values.filter((v) => v.text.trim()).length >= 2;
      case 'focuses': return focuses.filter((f) => f.trim()).length >= 3;
      case 'talents': return true;
      default: return true;
    }
  };

  const advance = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const submit = () => {
    const finalSpecies = species === 'Other' ? customSpecies : species;
    const stress = attributes.fitness;
    const resistance = 0;

    const charData: Omit<Character, 'id' | 'playerId'> = {
      name: name.trim(),
      pronouns: pronouns.trim(),
      species: finalSpecies,
      rank,
      role,
      assignment: assignment.trim(),
      attributes,
      disciplines,
      values: values.filter((v) => v.text.trim()),
      focuses: focuses.filter((f) => f.trim()),
      talents: selectedTalents,
      traits: [finalSpecies],
      stress: { current: stress, max: stress },
      determination: 1,
      resistance,
      injuries: [],
    };

    getSocket().emit('create-character', { character: charData }, (result) => {
      if ('error' in result) {
        console.error(result.error);
        return;
      }
      setView('play');
    });
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      <div className="flex gap-1 mb-4">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded ${i <= stepIdx ? 'bg-lcars-amber' : 'bg-gray-700'}`}
          />
        ))}
      </div>
      <div className="lcars-header mb-4">{step.toUpperCase()}</div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {step === 'identity' && (
          <>
            <div>
              <label className="lcars-label block mb-1">Name *</label>
              <input className="lcars-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="lcars-label block mb-1">Pronouns</label>
              <input className="lcars-input" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="she/her" />
            </div>
            <div>
              <label className="lcars-label block mb-1">Species</label>
              <select className="lcars-input" value={species} onChange={(e) => setSpecies(e.target.value)}>
                {TNG_SPECIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {species === 'Other' && (
              <div>
                <label className="lcars-label block mb-1">Custom Species</label>
                <input className="lcars-input" value={customSpecies} onChange={(e) => setCustomSpecies(e.target.value)} />
              </div>
            )}
            <div>
              <label className="lcars-label block mb-1">Rank</label>
              <select className="lcars-input" value={rank} onChange={(e) => setRank(e.target.value)}>
                {RANKS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="lcars-label block mb-1">Role</label>
              <select className="lcars-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select role…</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="lcars-label block mb-1">Assignment</label>
              <input className="lcars-input" value={assignment} onChange={(e) => setAssignment(e.target.value)} />
            </div>
          </>
        )}

        {step === 'attributes' && (
          <div className="space-y-3">
            <div className={`text-sm ${attrTotal === ATTR_TOTAL ? 'text-lcars-gold' : 'text-lcars-red'}`}>
              Points: {attrTotal}/{ATTR_TOTAL}
            </div>
            {(Object.keys(attributes) as (keyof Attributes)[]).map((attr) => (
              <div key={attr} className="flex items-center gap-3">
                <span className="lcars-label w-20 capitalize">{attr}</span>
                <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustAttr(attr, -1)}>−</button>
                <span className="text-lcars-gold font-bold w-6 text-center">{attributes[attr]}</span>
                <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustAttr(attr, 1)}>+</button>
                <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-lcars-amber" style={{ width: `${((attributes[attr] - 7) / 5) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-500">Each attribute 7–12 · Total must equal 56</div>
          </div>
        )}

        {step === 'disciplines' && (
          <div className="space-y-3">
            <div className={`text-sm ${discTotal === DISC_TOTAL ? 'text-lcars-gold' : 'text-lcars-red'}`}>
              Points: {discTotal}/{DISC_TOTAL}
            </div>
            {(Object.keys(disciplines) as (keyof Disciplines)[]).map((disc) => (
              <div key={disc} className="flex items-center gap-3">
                <span className="lcars-label w-20 capitalize">{disc}</span>
                <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustDisc(disc, -1)}>−</button>
                <span className="text-lcars-blue font-bold w-6 text-center">{disciplines[disc]}</span>
                <button className="lcars-btn-ghost text-xs px-2 py-0.5" onClick={() => adjustDisc(disc, 1)}>+</button>
                <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-lcars-blue" style={{ width: `${((disciplines[disc] - 1) / 4) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-500">Each discipline 1–5 · Total must equal 16</div>
          </div>
        )}

        {step === 'values' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400">Values are personal beliefs that define your character. At least 2 required.</div>
            {values.map((v, i) => (
              <div key={i}>
                <label className="lcars-label block mb-1">Value {i + 1}{i < 2 ? ' *' : ''}</label>
                <input
                  className="lcars-input"
                  value={v.text}
                  onChange={(e) => setValues((prev) => prev.map((val, j) => j === i ? { ...val, text: e.target.value } : val))}
                  placeholder={i === 0 ? 'e.g. "The needs of the many outweigh the needs of the few"' : ''}
                />
              </div>
            ))}
          </div>
        )}

        {step === 'focuses' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400">Focuses are areas of expertise. At least 3 required, up to 6. Rolling 1 or 2 within a focus = 2 successes.</div>
            {focuses.map((f, i) => (
              <div key={i}>
                <label className="lcars-label block mb-1">Focus {i + 1}{i < 3 ? ' *' : ''}</label>
                <input
                  className="lcars-input"
                  value={f}
                  onChange={(e) => setFocuses((prev) => prev.map((val, j) => j === i ? e.target.value : val))}
                  placeholder={i === 0 ? 'e.g. Starship Piloting' : ''}
                />
              </div>
            ))}
          </div>
        )}

        {step === 'talents' && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Select talents for your character. ({selectedTalents.length} selected)</div>
            {TALENTS.map((talent) => {
              const selected = selectedTalents.some((t) => t.name === talent.name);
              return (
                <div
                  key={talent.name}
                  className={`p-3 rounded cursor-pointer border transition-all
                    ${selected ? 'border-lcars-amber bg-lcars-panel' : 'border-gray-700 hover:border-gray-500'}`}
                  onClick={() => toggleTalent(talent)}
                >
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm font-bold ${selected ? 'text-lcars-amber' : 'text-white'}`}>{talent.name}</span>
                    {selected && <span className="text-lcars-gold text-xs">✓ Selected</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{talent.description}</div>
                </div>
              );
            })}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="lcars-label">Name</div>
                <div className="text-white">{name}</div>
              </div>
              <div>
                <div className="lcars-label">Species</div>
                <div className="text-white">{species === 'Other' ? customSpecies : species}</div>
              </div>
              <div>
                <div className="lcars-label">Rank & Role</div>
                <div className="text-white">{rank} — {role}</div>
              </div>
              <div>
                <div className="lcars-label">Assignment</div>
                <div className="text-white">{assignment}</div>
              </div>
            </div>

            <div>
              <div className="lcars-label mb-1">Derived Stats</div>
              <div className="flex gap-4 text-sm">
                <div><span className="text-gray-400">Stress: </span><span className="text-lcars-gold">{attributes.fitness}</span></div>
                <div><span className="text-gray-400">Resistance: </span><span className="text-lcars-gold">{disciplines.security}</span></div>
                <div><span className="text-gray-400">Determination: </span><span className="text-lcars-gold">1</span></div>
              </div>
            </div>

            <div>
              <div className="lcars-label mb-1">Values ({values.filter((v) => v.text).length})</div>
              {values.filter((v) => v.text).map((v, i) => (
                <div key={i} className="text-xs text-gray-300 mb-0.5">"{v.text}"</div>
              ))}
            </div>

            <div>
              <div className="lcars-label mb-1">Focuses ({focuses.filter(Boolean).length})</div>
              <div className="flex flex-wrap gap-1">
                {focuses.filter(Boolean).map((f, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-lcars-panel border border-lcars-blue text-lcars-blue rounded">{f}</span>
                ))}
              </div>
            </div>

            {selectedTalents.length > 0 && (
              <div>
                <div className="lcars-label mb-1">Talents ({selectedTalents.length})</div>
                <div className="flex flex-wrap gap-1">
                  {selectedTalents.map((t) => (
                    <span key={t.name} className="text-xs px-2 py-0.5 bg-lcars-panel border border-lcars-amber text-lcars-amber rounded">{t.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-3 border-t border-lcars-border mt-3">
        <button
          className="lcars-btn-ghost text-sm"
          onClick={stepIdx === 0 ? onCancel : back}
        >
          {stepIdx === 0 ? 'Cancel' : '← Back'}
        </button>
        <div className="flex-1" />
        {step !== 'review' ? (
          <button
            className={`lcars-btn text-sm ${canAdvance() ? 'bg-lcars-amber text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            disabled={!canAdvance()}
            onClick={advance}
          >
            Next →
          </button>
        ) : (
          <button className="lcars-btn-amber text-sm" onClick={submit}>
            Create Character
          </button>
        )}
      </div>
    </div>
  );
}
