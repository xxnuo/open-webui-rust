import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store';

interface InterfaceProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  onSave: () => void;
}

export default function Interface({ saveSettings, onSave }: InterfaceProps) {
  const { t } = useTranslation();
  const { user, settings, config } = useAppStore();

  // UI Settings
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [showChatTitleInTab, setShowChatTitleInTab] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [notificationSoundAlways, setNotificationSoundAlways] = useState(false);
  const [userLocation, setUserLocation] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(false);
  const [copyFormatted, setCopyFormatted] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(true);

  // Chat Settings
  const [chatDirection, setChatDirection] = useState<'LTR' | 'RTL' | 'auto'>('auto');
  const [landingPageMode, setLandingPageMode] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [chatBubble, setChatBubble] = useState(true);
  const [showUsername, setShowUsername] = useState(false);
  const [widescreenMode, setWidescreenMode] = useState(false);
  const [temporaryChatByDefault, setTemporaryChatByDefault] = useState(false);
  const [chatFadeStreamingText, setChatFadeStreamingText] = useState(true);
  const [titleAutoGenerate, setTitleAutoGenerate] = useState(true);
  const [autoFollowUps, setAutoFollowUps] = useState(true);
  const [autoTags, setAutoTags] = useState(true);
  const [responseAutoCopy, setResponseAutoCopy] = useState(false);
  const [insertSuggestionPrompt, setInsertSuggestionPrompt] = useState(false);
  const [keepFollowUpPrompts, setKeepFollowUpPrompts] = useState(false);
  const [insertFollowUpPrompt, setInsertFollowUpPrompt] = useState(false);
  const [regenerateMenu, setRegenerateMenu] = useState(true);
  const [collapseCodeBlocks, setCollapseCodeBlocks] = useState(false);
  const [expandDetails, setExpandDetails] = useState(false);
  const [displayMultiModelResponsesInTabs, setDisplayMultiModelResponsesInTabs] = useState(false);
  const [scrollOnBranchChange, setScrollOnBranchChange] = useState(true);
  const [stylizedPdfExport, setStylizedPdfExport] = useState(true);
  const [showFloatingActionButtons, setShowFloatingActionButtons] = useState(true);
  const [webSearch, setWebSearch] = useState<string | null>(null);

  // Input Settings
  const [ctrlEnterToSend, setCtrlEnterToSend] = useState(false);
  const [richTextInput, setRichTextInput] = useState(true);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [insertPromptAsRichText, setInsertPromptAsRichText] = useState(false);
  const [promptAutocomplete, setPromptAutocomplete] = useState(false);
  const [largeTextAsFile, setLargeTextAsFile] = useState(false);

  // Artifacts Settings
  const [detectArtifacts, setDetectArtifacts] = useState(true);
  const [iframeSandboxAllowSameOrigin, setIframeSandboxAllowSameOrigin] = useState(false);
  const [iframeSandboxAllowForms, setIframeSandboxAllowForms] = useState(false);

  // Voice Settings
  const [voiceInterruption, setVoiceInterruption] = useState(false);

  // File Settings
  const [imageCompression, setImageCompression] = useState(false);
  const [imageCompressionInChannels, setImageCompressionInChannels] = useState(true);

  useEffect(() => {
    // Load all settings
    setHighContrastMode(settings?.highContrastMode ?? false);
    setShowChatTitleInTab(settings?.showChatTitleInTab ?? true);
    setNotificationSound(settings?.notificationSound ?? true);
    setNotificationSoundAlways(settings?.notificationSoundAlways ?? false);
    setUserLocation(settings?.userLocation ?? false);
    setHapticFeedback(settings?.hapticFeedback ?? false);
    setCopyFormatted(settings?.copyFormatted ?? false);
    setShowUpdateToast(settings?.showUpdateToast ?? true);

    setChatDirection(settings?.chatDirection ?? 'auto');
    setLandingPageMode(settings?.landingPageMode ?? '');
    setBackgroundImageUrl(settings?.backgroundImageUrl ?? null);
    setChatBubble(settings?.chatBubble ?? true);
    setShowUsername(settings?.showUsername ?? false);
    setWidescreenMode(settings?.widescreenMode ?? false);
    setTemporaryChatByDefault(settings?.temporaryChatByDefault ?? false);
    setChatFadeStreamingText(settings?.chatFadeStreamingText ?? true);
    setTitleAutoGenerate(settings?.title?.auto ?? true);
    setAutoFollowUps(settings?.autoFollowUps ?? true);
    setAutoTags(settings?.autoTags ?? true);
    setResponseAutoCopy(settings?.responseAutoCopy ?? false);
    setInsertSuggestionPrompt(settings?.insertSuggestionPrompt ?? false);
    setKeepFollowUpPrompts(settings?.keepFollowUpPrompts ?? false);
    setInsertFollowUpPrompt(settings?.insertFollowUpPrompt ?? false);
    setRegenerateMenu(settings?.regenerateMenu ?? true);
    setCollapseCodeBlocks(settings?.collapseCodeBlocks ?? false);
    setExpandDetails(settings?.expandDetails ?? false);
    setDisplayMultiModelResponsesInTabs(settings?.displayMultiModelResponsesInTabs ?? false);
    setScrollOnBranchChange(settings?.scrollOnBranchChange ?? true);
    setStylizedPdfExport(settings?.stylizedPdfExport ?? true);
    setShowFloatingActionButtons(settings?.showFloatingActionButtons ?? true);
    setWebSearch(settings?.webSearch ?? null);

    setCtrlEnterToSend(settings?.ctrlEnterToSend ?? false);
    setRichTextInput(settings?.richTextInput ?? true);
    setShowFormattingToolbar(settings?.showFormattingToolbar ?? false);
    setInsertPromptAsRichText(settings?.insertPromptAsRichText ?? false);
    setPromptAutocomplete(settings?.promptAutocomplete ?? false);
    setLargeTextAsFile(settings?.largeTextAsFile ?? false);

    setDetectArtifacts(settings?.detectArtifacts ?? true);
    setIframeSandboxAllowSameOrigin(settings?.iframeSandboxAllowSameOrigin ?? false);
    setIframeSandboxAllowForms(settings?.iframeSandboxAllowForms ?? false);

    setVoiceInterruption(settings?.voiceInterruption ?? false);

    setImageCompression(settings?.imageCompression ?? false);
    setImageCompressionInChannels(settings?.imageCompressionInChannels ?? true);
  }, []);

  const handleSave = async () => {
    await saveSettings({
      highContrastMode,
      showChatTitleInTab,
      notificationSound,
      notificationSoundAlways,
      userLocation,
      hapticFeedback,
      copyFormatted,
      showUpdateToast,
      chatDirection,
      landingPageMode,
      backgroundImageUrl,
      chatBubble,
      showUsername,
      widescreenMode,
      temporaryChatByDefault,
      chatFadeStreamingText,
      title: { auto: titleAutoGenerate },
      autoFollowUps,
      autoTags,
      responseAutoCopy,
      insertSuggestionPrompt,
      keepFollowUpPrompts,
      insertFollowUpPrompt,
      regenerateMenu,
      collapseCodeBlocks,
      expandDetails,
      displayMultiModelResponsesInTabs,
      scrollOnBranchChange,
      stylizedPdfExport,
      showFloatingActionButtons,
      webSearch,
      ctrlEnterToSend,
      richTextInput,
      showFormattingToolbar,
      insertPromptAsRichText,
      promptAutocomplete,
      largeTextAsFile,
      detectArtifacts,
      iframeSandboxAllowSameOrigin,
      iframeSandboxAllowForms,
      voiceInterruption,
      imageCompression,
      imageCompressionInChannels,
    });
    onSave();
  };

  const toggleChatDirection = () => {
    if (chatDirection === 'auto') {
      setChatDirection('LTR');
    } else if (chatDirection === 'LTR') {
      setChatDirection('RTL');
    } else {
      setChatDirection('auto');
    }
  };

  return (
    <div className="flex flex-col h-full justify-between text-sm">
      <div className="space-y-4 overflow-y-auto max-h-[28rem] md:max-h-full">
        {/* UI Section */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('UI')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('High Contrast Mode')} ({t('Beta')})</Label>
              <Switch
                checked={highContrastMode}
                onCheckedChange={(checked) => {
                  setHighContrastMode(checked);
                  saveSettings({ highContrastMode: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Display chat title in tab')}</Label>
              <Switch
                checked={showChatTitleInTab}
                onCheckedChange={(checked) => {
                  setShowChatTitleInTab(checked);
                  saveSettings({ showChatTitleInTab: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Notification Sound')}</Label>
              <Switch
                checked={notificationSound}
                onCheckedChange={(checked) => {
                  setNotificationSound(checked);
                  saveSettings({ notificationSound: checked });
                }}
              />
            </div>

            {notificationSound && (
              <div className="flex justify-between items-center pl-4">
                <Label className="text-xs">{t('Always Play Notification Sound')}</Label>
                <Switch
                  checked={notificationSoundAlways}
                  onCheckedChange={(checked) => {
                    setNotificationSoundAlways(checked);
                    saveSettings({ notificationSoundAlways: checked });
                  }}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Haptic Feedback')} ({t('Android')})</Label>
              <Switch
                checked={hapticFeedback}
                onCheckedChange={(checked) => {
                  setHapticFeedback(checked);
                  saveSettings({ hapticFeedback: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Copy Formatted Text')}</Label>
              <Switch
                checked={copyFormatted}
                onCheckedChange={(checked) => {
                  setCopyFormatted(checked);
                  saveSettings({ copyFormatted: checked });
                }}
              />
            </div>

            {user?.role === 'admin' && (
              <div className="flex justify-between items-center">
                <Label className="text-xs">{t('Toast notifications for new updates')}</Label>
                <Switch
                  checked={showUpdateToast}
                  onCheckedChange={(checked) => {
                    setShowUpdateToast(checked);
                    saveSettings({ showUpdateToast: checked });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('Chat')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Chat direction')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChatDirection}
                className="text-xs"
              >
                {chatDirection === 'LTR' ? t('LTR') : chatDirection === 'RTL' ? t('RTL') : t('Auto')}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Landing Page Mode')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newMode = landingPageMode === '' ? 'chat' : '';
                  setLandingPageMode(newMode);
                  saveSettings({ landingPageMode: newMode });
                }}
                className="text-xs"
              >
                {landingPageMode === '' ? t('Default') : t('Chat')}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Chat Bubble UI')}</Label>
              <Switch
                checked={chatBubble}
                onCheckedChange={(checked) => {
                  setChatBubble(checked);
                  saveSettings({ chatBubble: checked });
                }}
              />
            </div>

            {!chatBubble && (
              <div className="flex justify-between items-center pl-4">
                <Label className="text-xs">{t('Display the username instead of You in the Chat')}</Label>
                <Switch
                  checked={showUsername}
                  onCheckedChange={(checked) => {
                    setShowUsername(checked);
                    saveSettings({ showUsername: checked });
                  }}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Widescreen Mode')}</Label>
              <Switch
                checked={widescreenMode}
                onCheckedChange={(checked) => {
                  setWidescreenMode(checked);
                  saveSettings({ widescreenMode: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Temporary Chat by Default')}</Label>
              <Switch
                checked={temporaryChatByDefault}
                onCheckedChange={(checked) => {
                  setTemporaryChatByDefault(checked);
                  saveSettings({ temporaryChatByDefault: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Fade Effect for Streaming Text')}</Label>
              <Switch
                checked={chatFadeStreamingText}
                onCheckedChange={(checked) => {
                  setChatFadeStreamingText(checked);
                  saveSettings({ chatFadeStreamingText: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Title Auto-Generation')}</Label>
              <Switch
                checked={titleAutoGenerate}
                onCheckedChange={(checked) => {
                  setTitleAutoGenerate(checked);
                  saveSettings({ title: { auto: checked } });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Follow-Up Auto-Generation')}</Label>
              <Switch
                checked={autoFollowUps}
                onCheckedChange={(checked) => {
                  setAutoFollowUps(checked);
                  saveSettings({ autoFollowUps: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Chat Tags Auto-Generation')}</Label>
              <Switch
                checked={autoTags}
                onCheckedChange={(checked) => {
                  setAutoTags(checked);
                  saveSettings({ autoTags: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Always Collapse Code Blocks')}</Label>
              <Switch
                checked={collapseCodeBlocks}
                onCheckedChange={(checked) => {
                  setCollapseCodeBlocks(checked);
                  saveSettings({ collapseCodeBlocks: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Always Expand Details')}</Label>
              <Switch
                checked={expandDetails}
                onCheckedChange={(checked) => {
                  setExpandDetails(checked);
                  saveSettings({ expandDetails: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Display Multi-model Responses in Tabs')}</Label>
              <Switch
                checked={displayMultiModelResponsesInTabs}
                onCheckedChange={(checked) => {
                  setDisplayMultiModelResponsesInTabs(checked);
                  saveSettings({ displayMultiModelResponsesInTabs: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Scroll On Branch Change')}</Label>
              <Switch
                checked={scrollOnBranchChange}
                onCheckedChange={(checked) => {
                  setScrollOnBranchChange(checked);
                  saveSettings({ scrollOnBranchChange: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Stylized PDF Export')}</Label>
              <Switch
                checked={stylizedPdfExport}
                onCheckedChange={(checked) => {
                  setStylizedPdfExport(checked);
                  saveSettings({ stylizedPdfExport: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Web Search in Chat')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = webSearch === 'always' ? null : 'always';
                  setWebSearch(newValue);
                  saveSettings({ webSearch: newValue });
                }}
                className="text-xs"
              >
                {webSearch === 'always' ? t('Always') : t('Default')}
              </Button>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('Input')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Enter Key Behavior')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = !ctrlEnterToSend;
                  setCtrlEnterToSend(newValue);
                  saveSettings({ ctrlEnterToSend: newValue });
                }}
                className="text-xs"
              >
                {ctrlEnterToSend ? t('Ctrl+Enter to Send') : t('Enter to Send')}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Rich Text Input for Chat')}</Label>
              <Switch
                checked={richTextInput}
                onCheckedChange={(checked) => {
                  setRichTextInput(checked);
                  saveSettings({ richTextInput: checked });
                }}
              />
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Paste Large Text as File')}</Label>
              <Switch
                checked={largeTextAsFile}
                onCheckedChange={(checked) => {
                  setLargeTextAsFile(checked);
                  saveSettings({ largeTextAsFile: checked });
                }}
              />
            </div>
          </div>
        </div>

        {/* Artifacts Section */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('Artifacts')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">{t('Detect Artifacts Automatically')}</Label>
              <Switch
                checked={detectArtifacts}
                onCheckedChange={(checked) => {
                  setDetectArtifacts(checked);
                  saveSettings({ detectArtifacts: checked });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleSave}
          className="px-3.5 py-1.5 text-sm font-medium rounded-full"
        >
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}

