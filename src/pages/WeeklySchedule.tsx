import { useTaskTracking } from "@/hooks/useTaskTracking";
import { DAYS } from "@/data/tasks";
import { useCustomTasks } from "@/hooks/useCustomTasks";
import { getDailyTasksForDay } from "@/lib/customTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";

const WeeklySchedule = () => {
  const { isCompleted } = useTaskTracking();
  const { tasks: customTasks } = useCustomTasks();

  const weekData = DAYS.map((day) => {
    const tasks = getDailyTasksForDay(day, customTasks);
    const completed = tasks.filter((t) => isCompleted(t.id)).length;
    return { day, tasks, completed, total: tasks.length };
  });

  const totalCompleted = weekData.reduce((a, d) => a + d.completed, 0);
  const totalTasks = weekData.reduce((a, d) => a + d.total, 0);
  const weekPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Schedule</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Overview of all tasks across the week.</p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm font-mono text-muted-foreground">
          <span>Weekly Progress</span>
          <span>{weekPct}%</span>
        </div>
        <Progress value={weekPct} className="h-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {weekData.map(({ day, tasks, completed, total }) => (
          <Card key={day} className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-mono flex items-center justify-between">
                {day}
                <span className="text-xs text-muted-foreground">{completed}/{total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.map((task) => {
                const done = isCompleted(task.id);
                return (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-neon-cyan shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={done ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WeeklySchedule;
