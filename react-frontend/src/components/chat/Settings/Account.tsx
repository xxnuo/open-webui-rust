import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, RefreshCw, Plus } from 'lucide-react';
import SensitiveInput from '@/components/common/SensitiveInput';
import UserProfileImage from './UserProfileImage';
import UpdatePasswordModal from './UpdatePasswordModal';
import { 
  updateUserProfile, 
  createAPIKey, 
  getAPIKey, 
  getSessionUser 
} from '@/lib/apis/auths';
import { generateInitialsImage, copyToClipboard } from '@/lib/utils';
import { useAppStore } from '@/store';

interface Config {
  features?: {
    enable_api_key?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface AccountProps {
  saveHandler?: () => void;
  config?: Config;
}

export default function Account({ saveHandler, config }: AccountProps) {
  const { t } = useTranslation();
  const { user, settings, setUser } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [_gender, set_Gender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [JWTTokenCopied, setJWTTokenCopied] = useState(false);
  const [APIKey, setAPIKey] = useState('');
  const [APIKeyCopied, setAPIKeyCopied] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.token;
        const userData = await getSessionUser(token);
        
        if (userData) {
          setName(userData.name ?? '');
          setProfileImageUrl(userData.profile_image_url ?? '');
          setBio(userData.bio ?? '');
          set_Gender(userData.gender ?? '');
          setGender(userData.gender ?? '');
          setDateOfBirth(userData.date_of_birth ?? '');
        }

        setWebhookUrl(settings?.notifications?.webhook_url ?? '');

        const apiKey = await getAPIKey(token).catch(() => '');
        setAPIKey(apiKey);

        setLoaded(true);
      } catch (error) {
        console.error('Failed to load account data:', error);
        toast.error(t('Failed to load account data'));
      }
    };

    fetchUserData();
  }, [settings, t]);

  const handleSubmit = async () => {
    try {
      let updatedProfileImageUrl = profileImageUrl;
      
      // Update profile image if name changed
      if (name !== user?.name) {
        if (profileImageUrl === generateInitialsImage(user?.name || '') || profileImageUrl === '') {
          updatedProfileImageUrl = generateInitialsImage(name);
          setProfileImageUrl(updatedProfileImageUrl);
        }
      }

      // Update webhook URL if changed (Note: This would need to be saved via settings API)
      // For now, we'll just update the profile
      
      const token = localStorage.token;
      const updatedUser = await updateUserProfile(token, {
        name: name,
        profile_image_url: updatedProfileImageUrl,
        bio: bio ? bio : null,
        gender: gender ? gender : null,
        date_of_birth: dateOfBirth ? dateOfBirth : null,
      });

      if (updatedUser) {
        // Get Session User Info to refresh
        const sessionUser = await getSessionUser(token);
        if (sessionUser) {
          setUser(sessionUser);
        }
        
        toast.success(t('Profile updated successfully'));
        if (saveHandler) {
          saveHandler();
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      const err = error as { message?: string };
      toast.error(err.message || t('Failed to update profile'));
    }
    return false;
  };

  const handleCreateAPIKey = async () => {
    try {
      const token = localStorage.token;
      const newAPIKey = await createAPIKey(token);
      if (newAPIKey) {
        setAPIKey(newAPIKey);
        toast.success(t('API Key created.'));
      } else {
        toast.error(t('Failed to create API Key.'));
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error(t('Failed to create API Key.'));
    }
  };

  const handleCopyJWTToken = async () => {
    await copyToClipboard(localStorage.token);
    setJWTTokenCopied(true);
    toast.success(t('Copied to clipboard'));
    setTimeout(() => {
      setJWTTokenCopied(false);
    }, 2000);
  };

  const handleCopyAPIKey = async () => {
    await copyToClipboard(APIKey);
    setAPIKeyCopied(true);
    toast.success(t('Copied to clipboard'));
    setTimeout(() => {
      setAPIKeyCopied(false);
    }, 2000);
  };

  const handleGenderChange = (value: string) => {
    set_Gender(value);
    if (value === 'custom') {
      setGender('');
    } else {
      setGender(value);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <div id="tab-account" className="flex flex-col h-full justify-between text-sm">
      <div className="overflow-y-scroll max-h-[28rem] md:max-h-full">
        <div className="space-y-4">
          <div>
            <div className="text-base font-medium">{t('Your Account')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('Manage your account information.')}
            </div>
          </div>

          <div className="flex space-x-5 my-4">
            <UserProfileImage
              profileImageUrl={profileImageUrl}
              setProfileImageUrl={setProfileImageUrl}
              user={user}
            />

            <div className="flex flex-1 flex-col space-y-3">
              <div className="flex flex-col w-full">
                <Label htmlFor="name" className="mb-1 text-xs font-medium">
                  {t('Name')}
                </Label>
                <Input
                  id="name"
                  className="w-full text-sm"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t('Enter your name')}
                />
              </div>

              <div className="flex flex-col w-full">
                <Label htmlFor="bio" className="mb-1 text-xs font-medium">
                  {t('Bio')}
                </Label>
                <Textarea
                  id="bio"
                  className="w-full text-sm min-h-[60px]"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('Share your background and interests')}
                />
              </div>

              <div className="flex flex-col w-full">
                <Label htmlFor="gender" className="mb-1 text-xs font-medium">
                  {t('Gender')}
                </Label>
                <Select value={_gender} onValueChange={handleGenderChange}>
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue placeholder={t('Prefer not to say')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('Prefer not to say')}</SelectItem>
                    <SelectItem value="male">{t('Male')}</SelectItem>
                    <SelectItem value="female">{t('Female')}</SelectItem>
                    <SelectItem value="custom">{t('Custom')}</SelectItem>
                  </SelectContent>
                </Select>
                
                {_gender === 'custom' && (
                  <Input
                    className="w-full text-sm mt-2"
                    type="text"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    placeholder={t('Enter your gender')}
                  />
                )}
              </div>

              <div className="flex flex-col w-full">
                <Label htmlFor="dob" className="mb-1 text-xs font-medium">
                  {t('Birth Date')}
                </Label>
                <Input
                  id="dob"
                  className="w-full text-sm"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>
          </div>

          {config?.features?.enable_user_webhooks && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col w-full">
                <Label htmlFor="webhook" className="mb-1 text-xs font-medium">
                  {t('Notification Webhook')}
                </Label>
                <Input
                  id="webhook"
                  className="w-full text-sm"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={t('Enter your webhook URL')}
                />
              </div>
            </>
          )}

          <Separator className="my-4" />

          {config?.features?.enable_login_form && (
            <div className="mt-2">
              <div className="flex justify-between items-center text-sm mb-2">
                <div className="font-medium">{t('Change Password')}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-medium text-muted-foreground"
                  onClick={() => setShowPasswordModal(true)}
                >
                  {t('Update')}
                </Button>
              </div>
            </div>
          )}

          {((config?.features?.enable_api_key ?? true) || user?.role === 'admin') && (
            <>
              <div className="flex justify-between items-center text-sm mt-4">
                <div className="font-medium">{t('API keys')}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-medium text-muted-foreground"
                  onClick={() => setShowAPIKeys(!showAPIKeys)}
                >
                  {showAPIKeys ? t('Hide') : t('Show')}
                </Button>
              </div>

              {showAPIKeys && (
                <div className="flex flex-col py-2.5 space-y-3">
                  {user?.role === 'admin' && (
                    <div className="w-full">
                      <div className="flex justify-between w-full mb-2">
                        <Label className="text-xs font-medium">{t('JWT Token')}</Label>
                      </div>
                      <div className="flex gap-2">
                        <SensitiveInput
                          value={localStorage.token}
                          readOnly
                          inputClassName="w-full text-sm"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCopyJWTToken}
                            >
                              {JWTTokenCopied ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('Copy to clipboard')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {(config?.features?.enable_api_key ?? true) && (
                    <div className="w-full">
                      {user?.role === 'admin' && (
                        <div className="flex justify-between w-full mb-2">
                          <Label className="text-xs font-medium">{t('API Key')}</Label>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {APIKey ? (
                          <>
                            <SensitiveInput
                              value={APIKey}
                              readOnly
                              inputClassName="w-full text-sm"
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCopyAPIKey}
                                >
                                  {APIKeyCopied ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('Copy to clipboard')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCreateAPIKey}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('Create new key')}</TooltipContent>
                            </Tooltip>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleCreateAPIKey}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('Create new secret key')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-3 text-sm font-medium">
        <Button
          onClick={handleSubmit}
          className="px-3.5 py-1.5 text-sm font-medium rounded-full"
        >
          {t('Save')}
        </Button>
      </div>

      <UpdatePasswordModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

