'use client';

import { ActionTask } from '@/lib/types';
import PlanHeader from './PlanHeader';
import TaskItem from './TaskItem';

interface ActionPlanSidebarProps {
  tasks: ActionTask[];
  activeTaskId: string | null;
  onTaskSelect: (id: string) => void;
}

export default function ActionPlanSidebar({ tasks, activeTaskId, onTaskSelect }: ActionPlanSidebarProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.filter((t) => t.type !== 'offer').length;

  // Build a 1-indexed counter that skips offer tasks
  let numberCounter = 0;
  const taskNumbers = tasks.map((t) => {
    if (t.type === 'offer') return 0; // offers don't get a number
    numberCounter++;
    return numberCounter;
  });

  return (
    <aside
      className="w-[320px] flex-shrink-0 flex flex-col border-r"
      style={{
        borderColor: '#E5E5E8',
        background: '#FFFFFF',
      }}
    >
      <div className="flex-1 m-2 ml-2 rounded-2xl flex flex-col">
        {/* Header with progress */}
        <div className="px-4 pt-6 pb-4">
          <PlanHeader
            title="Your Action Plan"
            subtitle="Complete each step to build your product"
            completedCount={completedCount}
            totalCount={totalCount}
          />
        </div>

        {/* Scrollable task list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1">
          {tasks.map((task, i) => (
            <TaskItem
              key={task.id}
              task={task}
              index={taskNumbers[i]}
              isActive={task.id === activeTaskId}
              onClick={() => onTaskSelect(task.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
