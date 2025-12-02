import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Target, 
  Flame, 
  Award, 
  Star, 
  Zap,
  TrendingDown,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightRecord {
  recorded_date: string;
  weight_kg: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  category: "milestone" | "streak" | "goal";
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface AchievementBadgesProps {
  weightHistory: WeightRecord[];
  startWeight?: number;
  targetWeight?: number;
}

export function AchievementBadges({ weightHistory, startWeight, targetWeight }: AchievementBadgesProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    calculateAchievements();
  }, [weightHistory, startWeight, targetWeight]);

  const calculateAchievements = () => {
    if (weightHistory.length === 0) {
      setAchievements([]);
      return;
    }

    const currentWeight = weightHistory[weightHistory.length - 1].weight_kg;
    const firstWeight = startWeight || weightHistory[0].weight_kg;
    const totalChange = Math.abs(currentWeight - firstWeight);
    const isLosing = currentWeight < firstWeight;

    // Calculate streak (consecutive days with logs)
    const calculateStreak = () => {
      const sortedHistory = [...weightHistory].sort((a, b) => 
        new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime()
      );
      
      let streak = 0;
      let currentDate = new Date();
      
      for (const record of sortedHistory) {
        const recordDate = new Date(record.recorded_date);
        recordDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
          currentDate = new Date(recordDate);
        } else {
          break;
        }
      }
      
      return streak;
    };

    const streak = calculateStreak();
    const totalLogs = weightHistory.length;

    const allAchievements: Achievement[] = [
      // First Steps
      {
        id: "first-log",
        title: "Getting Started",
        description: "Logged your first weight",
        icon: Star,
        unlocked: totalLogs >= 1,
        category: "milestone",
        rarity: "common"
      },
      
      // Weight Milestones
      {
        id: "1kg-milestone",
        title: isLosing ? "First Kilogram" : "Gaining Ground",
        description: isLosing ? "Lost your first kg!" : "Gained your first kg!",
        icon: Award,
        unlocked: totalChange >= 1,
        progress: totalChange,
        maxProgress: 1,
        category: "milestone",
        rarity: "common"
      },
      {
        id: "5kg-milestone",
        title: isLosing ? "Big Progress" : "Building Up",
        description: isLosing ? "Lost 5kg - amazing!" : "Gained 5kg - fantastic!",
        icon: Trophy,
        unlocked: totalChange >= 5,
        progress: totalChange,
        maxProgress: 5,
        category: "milestone",
        rarity: "rare"
      },
      {
        id: "10kg-milestone",
        title: isLosing ? "Transformation" : "Serious Gains",
        description: isLosing ? "Lost 10kg - incredible!" : "Gained 10kg - powerful!",
        icon: Zap,
        unlocked: totalChange >= 10,
        progress: totalChange,
        maxProgress: 10,
        category: "milestone",
        rarity: "epic"
      },
      {
        id: "15kg-milestone",
        title: "Unstoppable",
        description: isLosing ? "Lost 15kg - you're a champion!" : "Gained 15kg - beast mode!",
        icon: TrendingDown,
        unlocked: totalChange >= 15,
        progress: totalChange,
        maxProgress: 15,
        category: "milestone",
        rarity: "legendary"
      },
      
      // Target Achievement
      ...(targetWeight ? [{
        id: "target-reached",
        title: "Goal Achieved!",
        description: "Reached your target weight",
        icon: Target,
        unlocked: isLosing ? currentWeight <= targetWeight : currentWeight >= targetWeight,
        category: "goal" as const,
        rarity: "legendary" as const
      }] : []),
      
      // Halfway Achievement
      ...(targetWeight && startWeight ? [{
        id: "halfway-there",
        title: "Halfway There",
        description: "50% to your goal!",
        icon: CheckCircle2,
        unlocked: Math.abs(currentWeight - startWeight) >= Math.abs(targetWeight - startWeight) * 0.5,
        progress: Math.abs(currentWeight - startWeight),
        maxProgress: Math.abs(targetWeight - startWeight) * 0.5,
        category: "goal" as const,
        rarity: "epic" as const
      }] : []),
      
      // Streak Achievements
      {
        id: "3-day-streak",
        title: "Consistency",
        description: "3-day logging streak",
        icon: Flame,
        unlocked: streak >= 3,
        progress: streak,
        maxProgress: 3,
        category: "streak",
        rarity: "common"
      },
      {
        id: "7-day-streak",
        title: "Week Warrior",
        description: "7-day logging streak",
        icon: Calendar,
        unlocked: streak >= 7,
        progress: streak,
        maxProgress: 7,
        category: "streak",
        rarity: "rare"
      },
      {
        id: "30-day-streak",
        title: "Monthly Master",
        description: "30-day logging streak!",
        icon: Flame,
        unlocked: streak >= 30,
        progress: streak,
        maxProgress: 30,
        category: "streak",
        rarity: "epic"
      },
      {
        id: "100-day-streak",
        title: "Legendary Dedication",
        description: "100-day logging streak!!!",
        icon: Flame,
        unlocked: streak >= 100,
        progress: streak,
        maxProgress: 100,
        category: "streak",
        rarity: "legendary"
      },
      
      // Logging Milestones
      {
        id: "10-logs",
        title: "Data Collector",
        description: "Logged 10 weight entries",
        icon: Calendar,
        unlocked: totalLogs >= 10,
        progress: totalLogs,
        maxProgress: 10,
        category: "milestone",
        rarity: "common"
      },
      {
        id: "50-logs",
        title: "Tracking Pro",
        description: "Logged 50 weight entries",
        icon: Calendar,
        unlocked: totalLogs >= 50,
        progress: totalLogs,
        maxProgress: 50,
        category: "milestone",
        rarity: "rare"
      },
    ];

    setAchievements(allAchievements);
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const getRarityColor = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "common": return "from-gray-400 to-gray-600";
      case "rare": return "from-blue-400 to-blue-600";
      case "epic": return "from-purple-400 to-purple-600";
      case "legendary": return "from-yellow-400 to-orange-500";
    }
  };

  const displayedAchievements = showAll 
    ? achievements 
    : achievements.filter(a => a.unlocked).slice(0, 6);

  if (achievements.length === 0) return null;

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <CardDescription>
              {unlockedCount} of {totalCount} unlocked
            </CardDescription>
          </div>
          {unlockedCount > 0 && (
            <Badge variant="outline" className="text-lg px-3 py-1">
              🏆 {unlockedCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {displayedAchievements.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <div
                key={achievement.id}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all",
                  achievement.unlocked
                    ? "bg-gradient-to-br shadow-lg hover:shadow-xl cursor-pointer"
                    : "bg-muted/50 border-muted opacity-60",
                  achievement.unlocked && `bg-gradient-to-br ${getRarityColor(achievement.rarity)}`
                )}
              >
                <div className={cn(
                  "flex flex-col items-center text-center space-y-2",
                  achievement.unlocked ? "text-white" : "text-muted-foreground"
                )}>
                  <Icon className={cn(
                    "h-8 w-8",
                    achievement.unlocked ? "text-white" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className="font-semibold text-sm">{achievement.title}</p>
                    <p className="text-xs opacity-90">{achievement.description}</p>
                  </div>
                  
                  {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                    <div className="w-full mt-2">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (achievement.progress / achievement.maxProgress) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {achievement.progress.toFixed(1)} / {achievement.maxProgress}
                      </p>
                    </div>
                  )}
                  
                  {achievement.unlocked && achievement.rarity === "legendary" && (
                    <div className="absolute -top-1 -right-1">
                      <Star className="h-5 w-5 text-yellow-300 fill-yellow-300 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length > 6 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:underline w-full text-center"
          >
            {showAll ? "Show Less" : `Show All (${achievements.length - displayedAchievements.length} more)`}
          </button>
        )}

        {unlockedCount === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keep logging to unlock achievements!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
