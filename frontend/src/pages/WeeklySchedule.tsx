import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { parseLocalDate } from "@/lib/taskTracking";
import { CheckCircle2, Circle, Flame, Trophy } from "lucide-react";

const WeeklySchedule = () => {
  const { getCurrentWeek, getStreak, isCompleted } = useTaskTracking();
  const weekData = getCurrentWeek();
  const streak = getStreak();

  const totalCompleted = weekData.reduce((a, d) => a + d.completed, 0);
  const totalTasks = weekData.reduce((a, d) => a + d.total, 0);
  const weekPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Schedule</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Keep the week moving. Your checked wins stay with you, and each day you show up keeps the streak alive.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-cyan" /> Completed This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">
              {totalCompleted}
              <span className="text-muted-foreground text-lg">/{totalTasks}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{weekPct}% of this week's tasks are checked</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-neon-pink" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{streak.current}</p>
            <p className="text-xs text-muted-foreground mt-1">Keep the rhythm alive today.</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-purple" /> Longest Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{streak.longest}</p>
            <p className="text-xs text-muted-foreground mt-1">A reminder of the rhythm you built.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm font-mono text-muted-foreground">
          <span>Weekly Progress</span>
          <span>{weekPct}%</span>
        </div>
        <Progress value={weekPct} className="h-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {weekData.map(({ day, date, tasks, completed, total }) => (
          <Card key={day} className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-mono flex items-center justify-between">
                {day}
                <span className="text-xs text-muted-foreground">{completed}/{total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.map((task) => {
                const done = isCompleted(task.id, parseLocalDate(date) ?? new Date());
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
