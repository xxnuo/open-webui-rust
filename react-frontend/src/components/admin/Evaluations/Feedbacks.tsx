import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronUp, ChevronDown, MoreHorizontal, Download } from 'lucide-react';
import { deleteFeedbackById, exportAllFeedbacks } from '@/lib/apis/evaluations';

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

interface FeedbacksProps {
  feedbacks: Feedback[];
  onUpdate: (feedbacks: Feedback[]) => void;
}

export default function Feedbacks({ feedbacks, onUpdate }: FeedbacksProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<string>('updated_at');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  const setSortKey = (key: string) => {
    if (orderBy === key) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(key);
      if (key === 'user' || key === 'model_id') {
        setDirection('asc');
      } else {
        setDirection('desc');
      }
    }
    setPage(1);
  };

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    let aVal: unknown, bVal: unknown;

    switch (orderBy) {
      case 'user':
        aVal = a.user?.name || '';
        bVal = b.user?.name || '';
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'model_id':
        aVal = a.data.model_id || '';
        bVal = b.data.model_id || '';
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'rating':
        aVal = a.data.rating;
        bVal = b.data.rating;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      case 'updated_at':
        aVal = a.updated_at;
        bVal = b.updated_at;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      default:
        return 0;
    }
  });

  const paginatedFeedbacks = sortedFeedbacks.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(sortedFeedbacks.length / itemsPerPage);

  const deleteFeedbackHandler = async (feedbackId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await deleteFeedbackById(token, feedbackId).catch((err) => {
      toast.error(`${err}`);
      return null;
    });

    if (response) {
      const updated = feedbacks.filter((f) => f.id !== feedbackId);
      onUpdate(updated);
      toast.success(t('Feedback deleted successfully'));
    }
  };

  const exportHandler = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const _feedbacks = await exportAllFeedbacks(token).catch((err) => {
      toast.error(`${err}`);
      return null;
    });

    if (_feedbacks) {
      const blob = new Blob([JSON.stringify(_feedbacks)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-history-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getRatingEmoji = (rating: number) => {
    if (rating === 1) return '👍';
    if (rating === -1) return '👎';
    return '🤷';
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (orderBy !== column) return null;
    return direction === 'asc' ? (
      <ChevronUp className="inline-block ml-1 size-3" />
    ) : (
      <ChevronDown className="inline-block ml-1 size-3" />
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex md:self-center text-lg font-medium px-0.5">
          {t('Feedback History')}
          <div className="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
          <span className="text-lg font-medium text-gray-500 dark:text-gray-300">
            {feedbacks.length}
          </span>
        </div>

        {feedbacks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={exportHandler}
          >
            <Download className="size-4" />
          </Button>
        )}
      </div>

      <div className="scrollbar-hidden relative overflow-x-auto">
        {feedbacks.length === 0 ? (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
            {t('No feedbacks found')}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setSortKey('user')}
                  >
                    {t('User')}
                    <SortIcon column="user" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setSortKey('model_id')}
                  >
                    {t('Model')}
                    <SortIcon column="model_id" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center"
                    onClick={() => setSortKey('rating')}
                  >
                    {t('Rating')}
                    <SortIcon column="rating" />
                  </TableHead>
                  <TableHead>{t('Comment')}</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setSortKey('updated_at')}
                  >
                    {t('Updated At')}
                    <SortIcon column="updated_at" />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFeedbacks.map((feedback) => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {feedback.user?.profile_image_url ? (
                          <img
                            src={feedback.user.profile_image_url}
                            alt={feedback.user.name}
                            className="size-6 rounded-full"
                          />
                        ) : (
                          <div className="size-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                        )}
                        <span className="line-clamp-1">{feedback.user?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="line-clamp-1 max-w-xs">{feedback.data.model_id}</div>
                    </TableCell>
                    <TableCell className="text-center text-lg">
                      {getRatingEmoji(feedback.data.rating)}
                    </TableCell>
                    <TableCell>
                      <div className="line-clamp-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
                        {feedback.data.comment || feedback.data.reason || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {formatDate(feedback.updated_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1.5">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteFeedbackHandler(feedback.id)}
                          >
                            {t('Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('Previous')}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t('Next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

