import { useState } from 'react';
import { useExtendedTasks } from '../../hooks/useGameState';
import { useRollLog, useMyPlayerId, useMomentum } from '../../hooks/useGameState';
import { getSocket } from '../../hooks/useSocket';

export default function ExtendedTaskTracker() {
  const tasks = useExtendedTasks();
  const rollLog = useRollLog();
  const myPlayerId = useMyPlayerId();
  const momentum = useMomentum();

  const [showAddForm, setShowAddForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [magnitude, setMagnitude] = useState(10);
  const [difficulty, setDifficulty] = useState(2);
  const [resistance, setResistance] = useState(0);

  const [pendingContribute, setPendingContribute] = useState<string | null>(null);
  const [bonusImpact, setBonusImpact] = useState(0);

  const taskList = Object.values(tasks);

  const lastTaskSuccesses = (() => {
    const roll = rollLog.find((r) => r.playerId === myPlayerId && r.details.type === 'task');
    return roll && roll.details.type === 'task' ? roll.details.successes : 0;
  })();

  const addTask = () => {
    if (!taskName.trim()) return;
    getSocket().emit('gm-add-extended-task', { name: taskName.trim(), magnitude, difficulty, resistance }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setTaskName('');
    setMagnitude(10);
    setDifficulty(2);
    setResistance(0);
    setShowAddForm(false);
  };

  const removeTask = (taskId: string) => {
    getSocket().emit('gm-remove-extended-task', { taskId });
  };

  const contribute = (taskId: string) => {
    const impact = lastTaskSuccesses + bonusImpact;
    if (impact <= 0) return;
    if (bonusImpact > 0) {
      getSocket().emit('spend-momentum', { amount: bonusImpact * 2, reason: 'Extended task bonus impact' }, () => {});
    }
    getSocket().emit('contribute-to-task', { taskId, impact }, (r) => {
      if ('error' in r) console.warn(r.error);
    });
    setPendingContribute(null);
    setBonusImpact(0);
  };

  const maxBonusImpact = Math.floor(momentum / 2);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="lcars-label">Extended Tasks</div>
        <button
          className="text-xs text-gray-500 hover:text-lcars-purple"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '▲ Cancel' : '+ New Task'}
        </button>
      </div>

      {showAddForm && (
        <div className="lcars-panel p-3 space-y-2 border border-lcars-purple">
          <input
            className="lcars-input text-xs py-1"
            placeholder="Task name…"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="lcars-label text-xs mb-0.5">Magnitude</div>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={magnitude}
                min={1} max={30}
                onChange={(e) => setMagnitude(+e.target.value)}
              />
            </div>
            <div>
              <div className="lcars-label text-xs mb-0.5">Difficulty</div>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={difficulty}
                min={0} max={5}
                onChange={(e) => setDifficulty(+e.target.value)}
              />
            </div>
            <div>
              <div className="lcars-label text-xs mb-0.5">Resistance</div>
              <input
                type="number"
                className="lcars-input text-xs py-1"
                value={resistance}
                min={0} max={5}
                onChange={(e) => setResistance(+e.target.value)}
              />
            </div>
          </div>
          <button className="lcars-btn-amber text-xs w-full py-1" onClick={addTask}>
            Create Task
          </button>
        </div>
      )}

      {taskList.length === 0 && !showAddForm && (
        <div className="text-xs text-gray-600 uppercase">No active extended tasks</div>
      )}

      {taskList.map((task) => {
        const pct = task.magnitude > 0 ? task.progress / task.magnitude : 0;
        const breakthrough50 = task.progress >= task.magnitude * 0.5 && task.progress - 1 < task.magnitude * 0.5;
        const breakthrough75 = task.progress >= task.magnitude * 0.75 && task.progress - 1 < task.magnitude * 0.75;
        const isContributing = pendingContribute === task.id;

        return (
          <div key={task.id} className={`lcars-panel p-3 border ${task.isComplete ? 'border-lcars-gold' : 'border-gray-700'}`}>
            <div className="flex justify-between items-baseline mb-2">
              <span className={`text-sm font-bold ${task.isComplete ? 'text-lcars-gold' : 'text-white'}`}>
                {task.name}
                {task.isComplete && ' ✓'}
              </span>
              <button className="text-xs text-gray-600 hover:text-lcars-red" onClick={() => removeTask(task.id)}>✕</button>
            </div>

            <div className="text-xs text-gray-500 mb-2">
              D{task.difficulty} · Resistance {task.resistance} · {task.progress}/{task.magnitude} boxes
            </div>

            {/* Progress bar */}
            <div className="relative h-4 bg-gray-800 rounded overflow-hidden mb-1">
              <div
                className={`h-full transition-all ${task.isComplete ? 'bg-lcars-gold' : 'bg-lcars-blue'}`}
                style={{ width: `${Math.min(100, pct * 100)}%` }}
              />
              {/* Breakthrough markers */}
              <div className="absolute top-0 left-1/2 w-px h-full bg-lcars-amber opacity-50" title="50% breakthrough" />
              <div className="absolute top-0 left-3/4 w-px h-full bg-lcars-red opacity-50" title="75% breakthrough" />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>0</span>
              <span className="text-lcars-amber">50%</span>
              <span className="text-lcars-red">75%</span>
              <span>{task.magnitude}</span>
            </div>

            {(breakthrough50 || breakthrough75) && (
              <div className="text-xs text-lcars-amber mb-2">
                ⚡ Breakthrough reached — narrative milestone!
              </div>
            )}

            {!task.isComplete && (
              isContributing ? (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400">
                    Base impact: {lastTaskSuccesses} (from last roll)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Bonus impact (2⚡ each):</span>
                    <button
                      className="lcars-btn-ghost text-xs px-2 py-0.5"
                      onClick={() => setBonusImpact(Math.max(0, bonusImpact - 1))}
                    >−</button>
                    <span className="text-lcars-gold w-4 text-center text-xs">{bonusImpact}</span>
                    <button
                      className="lcars-btn-ghost text-xs px-2 py-0.5"
                      disabled={bonusImpact >= maxBonusImpact}
                      onClick={() => setBonusImpact(Math.min(maxBonusImpact, bonusImpact + 1))}
                    >+</button>
                    {bonusImpact > 0 && (
                      <span className="text-xs text-gray-500">(costs {bonusImpact * 2}⚡)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="lcars-btn-amber text-xs px-3 py-1 disabled:opacity-30"
                      disabled={lastTaskSuccesses + bonusImpact <= 0}
                      onClick={() => contribute(task.id)}
                    >
                      Apply {lastTaskSuccesses + bonusImpact} impact
                    </button>
                    <button
                      className="lcars-btn-ghost text-xs px-2"
                      onClick={() => { setPendingContribute(null); setBonusImpact(0); }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  className="lcars-btn-ghost text-xs px-3 py-1"
                  onClick={() => setPendingContribute(task.id)}
                >
                  Contribute
                </button>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
