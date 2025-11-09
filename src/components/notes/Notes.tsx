import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader } from '../common/Loader';

interface Note {
  id: string;
  title: string;
  content?: string;
  updated_at: number;
  [key: string]: any;
}

interface NotesProps {
  notes?: Note[];
  onCreateNote?: () => void;
  onSelectNote?: (note: Note) => void;
}

const getTimeRange = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 86400) return 'Today';
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return 'This Week';
  if (diff < 2592000) return 'This Month';
  return 'Older';
};

export const Notes: React.FC<NotesProps> = ({ notes = [], onCreateNote, onSelectNote }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fuse = useMemo(() => {
    return new Fuse(notes, {
      keys: ['title', 'content'],
      threshold: 0.3,
    });
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return query
      ? fuse.search(query).map((result) => result.item)
      : notes;
  }, [query, fuse, notes]);

  const groupedNotes = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    
    filteredNotes.forEach((note) => {
      const timeRange = getTimeRange(note.updated_at / 1000000000);
      if (!groups[timeRange]) {
        groups[timeRange] = [];
      }
      groups[timeRange].push(note);
    });

    return groups;
  }, [filteredNotes]);

  const handleCreateNote = () => {
    if (onCreateNote) {
      onCreateNote();
    } else {
      // Default behavior: navigate to new note page
      navigate('/notes/new');
    }
  };

  const handleSelectNote = (note: Note) => {
    if (onSelectNote) {
      onSelectNote(note);
    } else {
      // Default behavior: navigate to note page
      navigate(`/notes/${note.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xl font-semibold flex-1">{t('Notes')}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCreateNote}
                  aria-label={t('Create new note')}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Create new note')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search notes...')}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader />
          </div>
        ) : Object.keys(groupedNotes).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedNotes).map(([timeRange, groupNotes]) => (
              <div key={timeRange}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t(timeRange)}
                </h3>
                <div className="space-y-2">
                  {groupNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <h4 className="font-medium line-clamp-1 mb-1">
                        {note.title || t('Untitled')}
                      </h4>
                      {note.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {note.content}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            {query
              ? t('No notes found matching your search')
              : t('No notes yet. Create your first note!')}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;

