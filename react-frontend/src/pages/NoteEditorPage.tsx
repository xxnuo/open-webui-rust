import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getNoteById, updateNoteById, deleteNoteById } from '@/lib/apis/notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  data: {
    content: {
      json: unknown;
      html: string;
      md: string;
    };
    files?: unknown[];
  };
  access_control?: unknown;
  user?: {
    name?: string;
    email?: string;
  };
}

export default function NoteEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { WEBUI_NAME, showSidebar } = useAppStore();
  
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    document.title = `${t('Notes')} • ${WEBUI_NAME}`;
  }, [t, WEBUI_NAME]);

  const init = async () => {
    if (!id) return;
    
    setLoading(true);
    const res = await getNoteById(localStorage.token, id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      setNote(res);
      setTitle(res.title || '');
      setContent(res.data?.content?.md || '');
    } else {
      navigate('/notes');
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      init();
    }
  }, [id]);

  const saveNote = async () => {
    if (!id || !note) return;

    const res = await updateNoteById(localStorage.token, id, {
      title: title || t('Untitled'),
      data: {
        content: {
          json: null,
          html: content, // In a full implementation, this would be rendered markdown
          md: content
        },
        files: note.data?.files || []
      },
      access_control: note.access_control || {}
    }).catch((e) => {
      toast.error(`${e}`);
      return null;
    });

    if (res) {
      toast.success(t('Note saved'));
    }
  };

  // Auto-save on changes
  useEffect(() => {
    if (!note) return;

    const timeout = setTimeout(() => {
      saveNote();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [title, content]);

  if (loading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <div
      id="note-container"
      className={`w-full h-full ${showSidebar ? 'md:max-w-[calc(100%-260px)]' : ''}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notes')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Input
            className="text-xl font-semibold border-0 focus-visible:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Untitled')}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={saveNote}
          >
            <Save className="size-4" />
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <Textarea
            className="w-full h-full min-h-[500px] border-0 focus-visible:ring-0 resize-none font-mono"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('Start typing...')}
          />
        </div>
      </div>
    </div>
  );
}

