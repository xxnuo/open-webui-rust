import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

interface AdvancedParamsProps {
  admin?: boolean;
  params: Record<string, unknown>;
  setParams: (params: Record<string, unknown>) => void;
}

export default function AdvancedParams({ admin = false, params, setParams }: AdvancedParamsProps) {
  const { t } = useTranslation();

  const updateParam = (key: string, value: unknown) => {
    setParams({ ...params, [key]: value });
  };

  const toggleParam = (key: string) => {
    updateParam(key, params[key] === null ? 0 : null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-3 text-xs">
        {/* Stream Response */}
        <div className="flex w-full justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-xs font-medium cursor-help">
                {t('Stream Response')}
              </Label>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Enable or disable streaming responses for this model')}</p>
            </TooltipContent>
          </Tooltip>
          <Switch
            checked={params.stream_response ?? true}
            onCheckedChange={(checked) => updateParam('stream_response', checked)}
          />
        </div>

        {/* Temperature */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Temperature')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('temperature')}
                  className="text-xs h-7"
                >
                  {params.temperature === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Adjusts randomness of outputs, greater than 1 is random and 0 is deterministic')}</p>
            </TooltipContent>
          </Tooltip>
          {params.temperature !== null && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="2"
                value={params.temperature ?? 0.8}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value))}
                className="text-sm"
              />
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={params.temperature ?? 0.8}
                onChange={(e) => updateParam('temperature', parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Max Tokens */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Max Tokens')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('max_tokens')}
                  className="text-xs h-7"
                >
                  {params.max_tokens === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Maximum number of tokens to generate in the response')}</p>
            </TooltipContent>
          </Tooltip>
          {params.max_tokens !== null && (
            <Input
              type="number"
              min="1"
              value={params.max_tokens ?? 4096}
              onChange={(e) => updateParam('max_tokens', parseInt(e.target.value))}
              className="text-sm"
            />
          )}
        </div>

        {/* Top P */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Top P')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('top_p')}
                  className="text-xs h-7"
                >
                  {params.top_p === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text')}</p>
            </TooltipContent>
          </Tooltip>
          {params.top_p !== null && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={params.top_p ?? 0.9}
                onChange={(e) => updateParam('top_p', parseFloat(e.target.value))}
                className="text-sm"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={params.top_p ?? 0.9}
                onChange={(e) => updateParam('top_p', parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Top K */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Top K')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('top_k')}
                  className="text-xs h-7"
                >
                  {params.top_k === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Reduces the probability of generating nonsense')}</p>
            </TooltipContent>
          </Tooltip>
          {params.top_k !== null && (
            <Input
              type="number"
              min="1"
              value={params.top_k ?? 40}
              onChange={(e) => updateParam('top_k', parseInt(e.target.value))}
              className="text-sm"
            />
          )}
        </div>

        {/* Frequency Penalty */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Frequency Penalty')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('frequency_penalty')}
                  className="text-xs h-7"
                >
                  {params.frequency_penalty === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Penalize new tokens based on their frequency in the text so far')}</p>
            </TooltipContent>
          </Tooltip>
          {params.frequency_penalty !== null && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="-2"
                max="2"
                value={params.frequency_penalty ?? 0}
                onChange={(e) => updateParam('frequency_penalty', parseFloat(e.target.value))}
                className="text-sm"
              />
              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                value={params.frequency_penalty ?? 0}
                onChange={(e) => updateParam('frequency_penalty', parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Presence Penalty */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Presence Penalty')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('presence_penalty')}
                  className="text-xs h-7"
                >
                  {params.presence_penalty === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Penalize new tokens based on whether they appear in the text so far')}</p>
            </TooltipContent>
          </Tooltip>
          {params.presence_penalty !== null && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="-2"
                max="2"
                value={params.presence_penalty ?? 0}
                onChange={(e) => updateParam('presence_penalty', parseFloat(e.target.value))}
                className="text-sm"
              />
              <input
                type="range"
                min="-2"
                max="2"
                step="0.01"
                value={params.presence_penalty ?? 0}
                onChange={(e) => updateParam('presence_penalty', parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Seed */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Seed')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('seed')}
                  className="text-xs h-7"
                >
                  {params.seed === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Sets the random number seed to use for generation')}</p>
            </TooltipContent>
          </Tooltip>
          {params.seed !== null && (
            <Input
              type="number"
              min="0"
              value={params.seed ?? 0}
              onChange={(e) => updateParam('seed', parseInt(e.target.value))}
              placeholder={t('Enter Seed')}
              className="text-sm"
            />
          )}
        </div>

        {/* Stop Sequences */}
        <div className="w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex w-full justify-between items-center mb-1">
                <Label className="text-xs font-medium cursor-help">
                  {t('Stop Sequences')}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleParam('stop')}
                  className="text-xs h-7"
                >
                  {params.stop === null ? t('Default') : t('Custom')}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Comma-separated list of sequences where the API will stop generating')}</p>
            </TooltipContent>
          </Tooltip>
          {params.stop !== null && (
            <Input
              type="text"
              value={params.stop ?? ''}
              onChange={(e) => updateParam('stop', e.target.value)}
              placeholder={t('e.g., \\n, END, stop')}
              className="text-sm"
            />
          )}
        </div>

        {admin && (
          <>
            {/* Context Length (num_ctx) */}
            <div className="w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-full justify-between items-center mb-1">
                    <Label className="text-xs font-medium cursor-help">
                      {t('Context Length (num_ctx)')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => toggleParam('num_ctx')}
                      className="text-xs h-7"
                    >
                      {params.num_ctx === null ? t('Default') : t('Custom')}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Sets the size of the context window used to generate the next token')}</p>
                </TooltipContent>
              </Tooltip>
              {params.num_ctx !== null && (
                <Input
                  type="number"
                  min="1"
                  value={params.num_ctx ?? 2048}
                  onChange={(e) => updateParam('num_ctx', parseInt(e.target.value))}
                  className="text-sm"
                />
              )}
            </div>

            {/* Num GPU */}
            <div className="w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-full justify-between items-center mb-1">
                    <Label className="text-xs font-medium cursor-help">
                      {t('Number of GPUs')}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => toggleParam('num_gpu')}
                      className="text-xs h-7"
                    >
                      {params.num_gpu === null ? t('Default') : t('Custom')}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('The number of GPUs to use for model computation')}</p>
                </TooltipContent>
              </Tooltip>
              {params.num_gpu !== null && (
                <Input
                  type="number"
                  min="0"
                  value={params.num_gpu ?? 1}
                  onChange={(e) => updateParam('num_gpu', parseInt(e.target.value))}
                  className="text-sm"
                />
              )}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

