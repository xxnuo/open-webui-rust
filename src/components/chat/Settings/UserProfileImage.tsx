import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pencil } from 'lucide-react';
import { generateInitialsImage, canvasPixelTest } from '@/lib/utils';
import { getGravatarUrl } from '@/lib/apis/utils';
import type { SessionUser } from '@/store';

interface UserProfileImageProps {
  profileImageUrl: string;
  setProfileImageUrl: (url: string) => void;
  user: SessionUser | undefined;
}

export default function UserProfileImage({
  profileImageUrl,
  setProfileImageUrl,
  user,
}: UserProfileImageProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(t('Please select a valid image file (PNG, JPG, GIF, WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const originalImageUrl = event.target?.result as string;
      const img = new Image();
      img.src = originalImageUrl;

      img.onload = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate the aspect ratio of the image
        const aspectRatio = img.width / img.height;

        // Calculate the new width and height to fit within 250x250
        let newWidth, newHeight;
        if (aspectRatio > 1) {
          newWidth = 250 * aspectRatio;
          newHeight = 250;
        } else {
          newWidth = 250;
          newHeight = 250 / aspectRatio;
        }

        // Set the canvas size
        canvas.width = 250;
        canvas.height = 250;

        // Calculate the position to center the image
        const offsetX = (250 - newWidth) / 2;
        const offsetY = (250 - newHeight) / 2;

        // Draw the image on the canvas
        ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

        // Get the base64 representation of the compressed image
        const compressedSrc = canvas.toDataURL('image/jpeg');

        // Display the compressed image
        setProfileImageUrl(compressedSrc);
      };
    };

    reader.readAsDataURL(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setProfileImageUrl('/user.png');
  };

  const handleInitials = () => {
    if (canvasPixelTest()) {
      setProfileImageUrl(generateInitialsImage(user?.name || ''));
    } else {
      toast.info(
        t(
          'Fingerprint spoofing detected: Unable to use initials as avatar. Defaulting to default profile image.'
        ),
        {
          duration: 10000,
        }
      );
      setProfileImageUrl('/user.png');
    }
  };

  const handleGravatar = async () => {
    try {
      const token = localStorage.token;
      const url = await getGravatarUrl(token, user?.email);
      if (url) {
        setProfileImageUrl(url);
      } else {
        toast.error(t('Failed to load Gravatar'));
      }
    } catch (error) {
      console.error('Failed to load Gravatar:', error);
      toast.error(t('Failed to load Gravatar'));
    }
  };

  return (
    <div className="flex flex-col self-start group">
      <input
        ref={fileInputRef}
        id="profile-image-input"
        type="file"
        hidden
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="self-center flex">
        <button
          type="button"
          className="relative rounded-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar className="size-14 md:size-18">
            <AvatarImage
              src={profileImageUrl || generateInitialsImage(user?.name || '')}
              alt="profile"
            />
            <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition">
            <div className="p-1 rounded-full bg-white text-black border-gray-100 shadow">
              <Pencil className="size-3" />
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-col w-full justify-center mt-2 space-y-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-center text-muted-foreground rounded-lg py-0.5 h-auto opacity-0 group-hover:opacity-100 transition-all"
          onClick={handleRemove}
        >
          {t('Remove')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-center rounded-lg py-0.5 h-auto opacity-0 group-hover:opacity-100 transition-all"
          onClick={handleInitials}
        >
          {t('Initials')}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-center rounded-lg py-0.5 h-auto opacity-0 group-hover:opacity-100 transition-all"
          onClick={handleGravatar}
        >
          {t('Gravatar')}
        </Button>
      </div>
    </div>
  );
}

