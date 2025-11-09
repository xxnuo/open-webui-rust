import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getNotes, createNewNote, deleteNoteById } from '@/lib/apis/notes';
import { getTimeRange, copyToClipboard, capitalizeFirstLetter, dayjs } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, X } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Note {
  id: string;
  title: string;
  data: {
    content: {
      json: unknown;
      html: string;
      md: string;
    };
  };
  updated_at: number;
  user?: {
    name?: string;
    email?: string;
  };
}

export default function NotesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { WEBUI_NAME } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [noteItems, setNoteItems] = useState<Note[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<Record<string, Note[]>>({});
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.title = `${t('Notes')} • ${WEBUI_NAME}`;
  }, [t, WEBUI_NAME]);

  const groupNotes = (notes: Note[]) => {
    const grouped: Record<string, Note[]> = {};
    for (const note of notes) {
      const timeRange = getTimeRange(note.updated_at / 1000000000);
      if (!grouped[timeRange]) {
        grouped[timeRange] = [];
      }
      grouped[timeRange].push({ ...note, timeRange } as Note);
    }
    return grouped;
  };

  const init = async () => {
    const notes = await getNotes(localStorage.token, true);
    setNoteItems(notes || []);
    setLoaded(true);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const filtered = noteItems.filter((note) => {
      if (!query) return true;
      return note.title.toLowerCase().includes(query.toLowerCase());
    });
    setGroupedNotes(groupNotes(filtered));
  }, [noteItems, query]);

  const createNoteHandler = async (content?: string) => {
    const res = await createNewNote(localStorage.token, {
      title: dayjs().format('YYYY-MM-DD'),
      data: {
        content: {
          json: null,
          html: content ?? '',
          md: content ?? ''
        }
      },
      meta: null,
      access_control: {}
    }).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      navigate(`/notes/${res.id}`);
    }
  };

  const deleteNoteHandler = async (id: string) => {
    const res = await deleteNoteById(localStorage.token, id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      init();
    }
  };

  if (!loaded) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div id="notes-container" className="w-full min-h-full h-full">
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('Delete note?')}
        onConfirm={() => {
          if (selectedNote) {
            deleteNoteHandler(selectedNote.id);
          }
          setShowDeleteConfirm(false);
        }}
      >
        <div className="text-sm text-gray-500 truncate">
          {t('This will delete')} <span className="font-semibold">{selectedNote?.title}</span>.
        </div>
      </ConfirmDialog>

      <div className="flex flex-col gap-1 px-3.5">
        <div className="flex flex-1 items-center w-full space-x-2">
          <div className="flex flex-1 items-center">
            <div className="self-center ml-1 mr-3">
              <Search className="size-3.5" />
            </div>
            <Input
              className="w-full text-sm py-1 rounded-r-xl border-0 bg-transparent focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search Notes')}
            />
            {query && (
              <div className="self-center pl-1.5 translate-y-[0.5px] rounded-l-xl bg-transparent">
                <button
                  className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                  onClick={() => setQuery('')}
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4.5 h-full pt-2">
        {Object.keys(groupedNotes).length > 0 ? (
          <div className="pb-10">
            {Object.keys(groupedNotes).map((timeRange) => (
              <div key={timeRange}>
                <div className="w-full text-xs text-gray-500 dark:text-gray-500 font-medium pb-2.5">
                  {t(timeRange)}
                </div>

                <div className="mb-5 gap-2.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {groupedNotes[timeRange].map((note) => (
                    <div
                      key={note.id}
                      className="flex space-x-4 cursor-pointer w-full px-4.5 py-4 border border-gray-50 dark:border-gray-850 bg-transparent dark:hover:bg-gray-850 hover:bg-white rounded-2xl transition"
                    >
                      <div className="flex flex-1 space-x-4 cursor-pointer w-full">
                        <a
                          href={`/notes/${note.id}`}
                          className="w-full -translate-y-0.5 flex flex-col justify-between"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/notes/${note.id}`);
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 self-center mb-1 justify-between">
                              <div className="font-semibold line-clamp-1 capitalize">{note.title}</div>
                              <button
                                className="self-center w-fit text-sm p-1 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedNote(note);
                                  setShowDeleteConfirm(true);
                                }}
                              >
                                ⋯
                              </button>
                            </div>

                            <div className="text-xs text-gray-500 dark:text-gray-500 mb-3 line-clamp-3 min-h-10">
                              {note.data?.content?.md || t('No content')}
                            </div>
                          </div>

                          <div className="text-xs px-0.5 w-full flex justify-between items-center">
                            <div>{dayjs(note.updated_at / 1000000).fromNow()}</div>
                            <div className="shrink-0 text-gray-500">
                              {t('By {{name}}', {
                                name: capitalizeFirstLetter(
                                  note?.user?.name ?? note?.user?.email ?? t('Deleted User')
                                )
                              })}
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="pb-20 text-center">
              <div className="text-xl font-medium text-gray-400 dark:text-gray-600">
                {t('No Notes')}
              </div>
              <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
                {t('Create your first note by clicking on the plus button below.')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 max-w-full flex justify-end">
        <div className="flex gap-0.5 justify-end w-full">
          <Button
            className="cursor-pointer p-2.5 flex rounded-full border border-gray-50 bg-white dark:border-none dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-xl"
            onClick={() => createNoteHandler()}
          >
            <Plus className="size-4.5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}

