import { Character, AttributeKey, DisciplineKey } from '@lcars-vtt/shared';
import { useUIStore } from '../../store/uiStore';

const ATTRIBUTES: AttributeKey[] = ['control', 'daring', 'fitness', 'insight', 'presence', 'reason'];
const DISCIPLINES: DisciplineKey[] = ['command', 'conn', 'engineering', 'medicine', 'science', 'security'];

const DISC_COLORS: Record<DisciplineKey, string> = {
  command: 'bg-lcars-amber', conn: 'bg-lcars-blue', engineering: 'bg-lcars-gold',
  medicine: 'bg-green-600', science: 'bg-lcars-purple', security: 'bg-lcars-red',
};

interface Props {
  character: Character;
  onCellClick?: (attr: AttributeKey, disc: DisciplineKey, target: number) => void;
}

export default function AttributeDisciplineGrid({ character, onCellClick }: Props) {
  const { setDiceRollerOpen, setPendingRollAttribute, setPendingRollDiscipline } = useUIStore();

  const handleClick = (attr: AttributeKey, disc: DisciplineKey) => {
    const attrVal = character.attributes[attr];
    const discVal = character.disciplines[disc];
    const target = attrVal + discVal;

    if (onCellClick) {
      onCellClick(attr, disc, target);
    } else {
      setPendingRollAttribute(attr, attrVal);
      setPendingRollDiscipline(disc, discVal);
      setDiceRollerOpen(true);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left py-1 pr-2 lcars-label">Attr / Disc</th>
            {DISCIPLINES.map((disc) => (
              <th key={disc} className="py-1 px-1 lcars-label text-center">
                <div className={`w-2 h-2 rounded-full ${DISC_COLORS[disc]} mx-auto mb-0.5`} />
                {disc.slice(0, 4).toUpperCase()}
                <div className="text-lcars-blue">{character.disciplines[disc]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attr) => (
            <tr key={attr} className="hover:bg-lcars-panel">
              <td className="py-1 pr-2 lcars-label">
                {attr.slice(0, 4).toUpperCase()}
                <span className="text-lcars-gold ml-1">{character.attributes[attr]}</span>
              </td>
              {DISCIPLINES.map((disc) => {
                const target = character.attributes[attr] + character.disciplines[disc];
                return (
                  <td
                    key={disc}
                    className="py-1 px-1 text-center cursor-pointer rounded transition-all hover:bg-lcars-amber hover:text-black"
                    onClick={() => handleClick(attr, disc)}
                    title={`Roll ${attr} + ${disc} (TN ${target})`}
                  >
                    <span className="text-lcars-gold hover:text-black font-bold">{target}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
