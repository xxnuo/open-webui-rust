import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Feedback {
  id: string;
  data: {
    rating: number;
    model_id: string;
    sibling_model_ids: string[] | null;
    reason: string;
    comment: string;
    tags: string[];
  };
  user: {
    name: string;
    profile_image_url: string;
  };
  updated_at: number;
}

interface ModelStats {
  rating: number;
  won: number;
  lost: number;
}

interface LeaderboardProps {
  feedbacks: Feedback[];
}

export default function Leaderboard({ feedbacks }: LeaderboardProps) {
  const { t } = useTranslation();
  const { models } = useAppStore();
  const [rankedModels, setRankedModels] = useState<any[]>([]);
  const [orderBy, setOrderBy] = useState<string>('rating');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rankHandler();
  }, [feedbacks, models]);

  const rankHandler = async () => {
    const modelStats = calculateModelStats(feedbacks);

    const ranked = (models || [])
      .filter((m) => m?.owned_by !== 'arena' && (m?.info?.meta?.hidden ?? false) !== true)
      .map((model) => {
        const stats = modelStats.get(model.id);
        return {
          ...model,
          rating: stats ? Math.round(stats.rating) : '-',
          stats: {
            count: stats ? stats.won + stats.lost : 0,
            won: stats ? stats.won.toString() : '-',
            lost: stats ? stats.lost.toString() : '-'
          }
        };
      })
      .sort((a, b) => {
        if (a.rating === '-' && b.rating !== '-') return 1;
        if (b.rating === '-' && a.rating !== '-') return -1;
        if (a.rating !== '-' && b.rating !== '-') return b.rating - a.rating;
        return (a?.name ?? a?.id ?? '').localeCompare(b?.name ?? b?.id ?? '');
      });

    setRankedModels(ranked);
    setLoading(false);
  };

  function calculateModelStats(feedbacks: Feedback[]): Map<string, ModelStats> {
    const stats = new Map<string, ModelStats>();
    const K = 32;

    function getOrDefaultStats(modelId: string): ModelStats {
      return stats.get(modelId) || { rating: 1000, won: 0, lost: 0 };
    }

    function updateStats(modelId: string, ratingChange: number, outcome: number) {
      const currentStats = getOrDefaultStats(modelId);
      currentStats.rating += ratingChange;
      if (outcome === 1) currentStats.won++;
      else if (outcome === 0) currentStats.lost++;
      stats.set(modelId, currentStats);
    }

    function calculateEloChange(
      ratingA: number,
      ratingB: number,
      outcome: number
    ): number {
      const expectedScore = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
      return K * (outcome - expectedScore);
    }

    feedbacks.forEach((feedback) => {
      if (!feedback?.data?.model_id || !feedback?.data?.rating) return;

      const modelA = feedback.data.model_id;
      const statsA = getOrDefaultStats(modelA);
      let outcome: number;

      switch (feedback.data.rating.toString()) {
        case '1':
          outcome = 1;
          break;
        case '-1':
          outcome = 0;
          break;
        default:
          return;
      }

      const opponents = feedback.data.sibling_model_ids || [];

      opponents.forEach((modelB) => {
        const statsB = getOrDefaultStats(modelB);
        const changeA = calculateEloChange(statsA.rating, statsB.rating, outcome);
        const changeB = calculateEloChange(statsB.rating, statsA.rating, 1 - outcome);

        updateStats(modelA, changeA, outcome);
        updateStats(modelB, changeB, 1 - outcome);
      });
    });

    return stats;
  }

  const setSortKey = (key: string) => {
    if (orderBy === key) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(key);
      setDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedModels = [...rankedModels].sort((a, b) => {
    let aVal: unknown, bVal: unknown;

    switch (orderBy) {
      case 'name':
        aVal = a.name || a.id || '';
        bVal = b.name || b.id || '';
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'rating':
        aVal = a.rating === '-' ? -1 : a.rating;
        bVal = b.rating === '-' ? -1 : b.rating;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      case 'count':
        aVal = a.stats.count;
        bVal = b.stats.count;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      default:
        return 0;
    }
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (orderBy !== column) return null;
    return direction === 'asc' ? (
      <ChevronUp className="inline-block ml-1 size-3" />
    ) : (
      <ChevronDown className="inline-block ml-1 size-3" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex md:self-center text-lg font-medium px-0.5">
          {t('Model Leaderboard')}
          <div className="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
          <span className="text-lg font-medium text-gray-500 dark:text-gray-300">
            {rankedModels.length}
          </span>
        </div>
      </div>

      <div className="scrollbar-hidden relative overflow-x-auto">
        {rankedModels.length === 0 ? (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
            {t('No models found')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => setSortKey('name')}
                >
                  {t('Model')}
                  <SortIcon column="name" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => setSortKey('rating')}
                >
                  {t('Rating')}
                  <SortIcon column="rating" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-center"
                  onClick={() => setSortKey('count')}
                >
                  {t('Matches')}
                  <SortIcon column="count" />
                </TableHead>
                <TableHead className="text-center">{t('Won')}</TableHead>
                <TableHead className="text-center">{t('Lost')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedModels.map((model, index) => (
                <TableRow key={model.id}>
                  <TableCell className="text-center font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <div className="line-clamp-1">{model.name || model.id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {model.rating === '-' ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="font-semibold">{model.rating}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{model.stats.count}</TableCell>
                  <TableCell className="text-center text-green-600 dark:text-green-400">
                    {model.stats.won}
                  </TableCell>
                  <TableCell className="text-center text-red-600 dark:text-red-400">
                    {model.stats.lost}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

