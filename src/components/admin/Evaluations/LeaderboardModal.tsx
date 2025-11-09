import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ModelRanking {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
  total_battles: number;
  win_rate: number;
}

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rankings: ModelRanking[];
}

export default function LeaderboardModal({
  open,
  onOpenChange,
  rankings
}: LeaderboardModalProps) {
  const { t } = useTranslation();

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return index + 1;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-600';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-yellow-600" />
            {t('Model Arena Leaderboard')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {rankings.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {t('No rankings available yet')}
              </div>
            ) : (
              rankings.map((model, index) => (
                <div
                  key={model.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  {/* Rank */}
                  <div className={`text-2xl font-bold w-12 text-center ${getRankColor(index)}`}>
                    {getRankIcon(index)}
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{model.name}</div>
                    <div className="text-sm text-gray-500 truncate">{model.id}</div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {model.rating.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-500">{t('Rating')}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm font-semibold text-green-600">
                        {model.win_rate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">{t('Win Rate')}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="size-4" />
                        <span className="text-sm font-medium">{model.wins}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Minus className="size-4" />
                        <span className="text-sm font-medium">{model.ties}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="size-4" />
                        <span className="text-sm font-medium">{model.losses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Battle Count */}
                  <Badge variant="outline">
                    {model.total_battles} {t('battles')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-500">
            {t('Total models')}: {rankings.length}
          </div>
          <div className="text-sm text-gray-500">
            {t('Total battles')}: {rankings.reduce((sum, m) => sum + m.total_battles, 0)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

