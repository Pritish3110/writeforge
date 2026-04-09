import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuit, Lightbulb, Trophy, Wrench,
  Heart, Mic, Focus, GitFork,
} from "lucide-react";

const features = [
  { title: "AI Writing Coach", desc: "Real-time feedback on your scenes", icon: BrainCircuit },
  { title: "Daily Prompt Generator", desc: "Advanced context-aware prompts", icon: Lightbulb },
  { title: "Writing Streak Rewards", desc: "Earn rewards for consistency", icon: Trophy },
  { title: "Task Sharing", desc: "Share custom training systems between projects", icon: Wrench },
  { title: "Mood-Based Suggestions", desc: "Writing prompts based on your mood", icon: Heart },
  { title: "Voice-to-Text Mode", desc: "Dictate your writing naturally", icon: Mic },
  { title: "Distraction-Free Focus", desc: "Minimal UI for deep writing", icon: Focus },
  { title: "Theme Thread Map", desc: "Track motifs, symbols, and thematic echoes across the story", icon: GitFork },
];

const UpcomingFeatures = () => (
  <div className="max-w-5xl mx-auto space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Upcoming Features</h1>
      <p className="text-muted-foreground mt-1 font-mono text-sm">
        What's coming next to WriterZ.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((f) => (
        <Card
          key={f.title}
          className="glow-border opacity-70 hover:opacity-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <f.icon className="h-5 w-5 text-neon-purple shrink-0" />
                <CardTitle className="text-sm">{f.title}</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default UpcomingFeatures;
