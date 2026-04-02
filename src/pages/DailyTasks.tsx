import { useState, useEffect } from "react";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { DAYS, getDayName } from "@/data/tasks";
import { useCustomTasks } from "@/hooks/useCustomTasks";
import { getDailyTasksForDay } from "@/lib/customTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Timer, TimerOff, RotateCcw, Flame } from "lucide-react";

const TaskTimer = ({ minutes = 30 }: { minutes?: number }) => {
  const initialSeconds = minutes * 60;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, seconds]);

  useEffect(() => {
    setRunning(false);
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const handleReset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
    setResetting(true);
    setTimeout(() => setResetting(false), 600);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm text-muted-foreground">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          if (seconds <= 0) setSeconds(initialSeconds);
          setRunning(!running);
        }}
      >
        {running ? <TimerOff className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${resetting ? "animate-spin-once" : ""}`}
        onClick={handleReset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

const DailyTasks = () => {
  const [selectedDay, setSelectedDay] = useState(getDayName());
  const { toggleTask, isCompleted } = useTaskTracking();
  const { tasks: customTasks } = useCustomTasks();
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const tasks = getDailyTasksForDay(selectedDay, customTasks);
  const completed = tasks.filter((t) => isCompleted(t.id)).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const handleToggle = (taskId: string) => {
    toggleTask(taskId);
    setJustCompleted(taskId);
    setTimeout(() => setJustCompleted(null), 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Tasks</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Select a day and complete your writing exercises.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {DAYS.map((day) => (
          <Button
            key={day}
            variant={selectedDay === day ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay(day)}
            className={selectedDay === day ? "bg-neon-purple hover:bg-neon-purple/90 font-mono" : "font-mono"}
          >
            {day.slice(0, 3)}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm font-mono text-muted-foreground">
          <span>{completed}/{tasks.length} completed</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const done = isCompleted(task.id);
          const glowing = justCompleted === task.id;
          return (
            <Collapsible key={task.id} className="group/task-card">
              <Card className={`glow-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${done ? "opacity-70" : ""} ${glowing ? "animate-glow-pulse" : ""}`}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => handleToggle(task.id)}
                      />
                      <div>
                        <CardTitle className={`text-base ${done ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-neon-cyan font-mono">{task.category}</span>
                          {task.source === "custom" && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              Custom Builder
                            </Badge>
                          )}
                          {task.source === "custom" && task.savedAsTemplate && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              Template
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TaskTimer minutes={task.durationMinutes} />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-in-out group-data-[state=open]/task-card:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4 space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground border border-border">
                      <p className="font-mono text-xs uppercase tracking-wider text-neon-pink mb-1">Prompt</p>
                      <p className="whitespace-pre-line">{task.prompt}</p>
                    </div>
                    <Collapsible className="group/task-details">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground w-full justify-start px-1">
                          <ChevronDown className="h-3.5 w-3.5 mr-1 transition-transform duration-200 ease-in-out group-data-[state=open]/task-details:rotate-180" /> View Rules & Steps
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 mt-2">
                        <div className="bg-muted/30 rounded-lg p-3 border border-border">
                          <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan mb-2">Step-by-Step</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            {task.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="rounded-lg p-3 border glow-border bg-muted/20">
                          <p className="font-mono text-xs uppercase tracking-wider text-neon-purple mb-2 flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> Important Rules</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {task.importantRules.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="px-1">
                          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Writing Principles</p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground/60">
                            {task.writingPrinciples.map((principle) => (
                              <li key={principle}>{principle}</li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    <Collapsible className="group/task-review">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs font-mono text-muted-foreground hover:text-foreground w-full justify-start px-1">
                          <ChevronDown className="h-3.5 w-3.5 mr-1 transition-transform duration-200 ease-in-out group-data-[state=open]/task-review:rotate-180" /> Review
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-muted/30 rounded-lg p-3 border border-border">
                          <p className="font-mono text-xs uppercase tracking-wider text-neon-pink mb-2">Review</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {task.review.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default DailyTasks;
