
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Sparkles, Play, Loader2, ArrowRight, Zap, Table2, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ModuleSelector from '@/components/ModuleSelector';
import ModelSelector from '@/components/ModelSelector';
import { moduleService, modelService, tableService, collectorService } from '@/services';
import TableSelector from '@/components/TableSelector';
import type { TriggerMode } from '@/services/collectorService';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ConfigurationForm = () => {
  const { t } = useTranslation('config');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelName, setSelectedModelName] = useState('');
  const aiFeatureFlag = (import.meta.env.VITE_AI_FEATURE_ENABLED === 'true');
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(aiFeatureFlag);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [timeError, setTimeError] = useState<string | null>(null);

  // Step 0: Trigger mode selection
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('by_table');

  // By Record mode: JSON editor state
  const [recordsJson, setRecordsJson] = useState<string>('[\n  {\n    "": ""\n  }\n]');
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const triggerModes = [
    {
      value: 'default' as TriggerMode,
      label: t('mode.fullSync'),
      description: t('mode.fullSyncDescription'),
      icon: Zap,
      details: t('mode.fullSyncDetails'),
    },
    {
      value: 'by_table' as TriggerMode,
      label: t('mode.byTable'),
      description: t('mode.byTableDescription'),
      icon: Table2,
      details: t('mode.byTableDetails'),
    },
    {
      value: 'by_record' as TriggerMode,
      label: t('mode.byRecord'),
      description: t('mode.byRecordDescription'),
      icon: FileText,
      details: t('mode.byRecordDetails'),
    },
  ];

  // Helpers for friendlier time inputs
  const toLocalInputValue = (input: Date | string) => {
    const d = typeof input === 'string' ? new Date(input) : input;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const roundToMinute = (date: Date) => {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
  };

  const toMySQLDateTime = (input: string) => {
    const d = new Date(input);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const validateTimeRange = (start: string, end: string) => {
    if (start && end && new Date(end) <= new Date(start)) {
      setTimeError(t('time.endAfterStart'));
    } else {
      setTimeError(null);
    }
  };

  const handleStartChange = (value: string) => {
    setStartTime(value);
    validateTimeRange(value, endTime);
  };

  const handleEndChange = (value: string) => {
    setEndTime(value);
    validateTimeRange(startTime, value);
  };

  const applyPreset = (preset: 'last1h' | 'last24h' | 'last7d' | 'today' | 'yesterday') => {
    const now = roundToMinute(new Date());
    if (preset === 'yesterday') {
      const yStart = new Date(now);
      yStart.setDate(yStart.getDate() - 1);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yStart);
      yEnd.setHours(23, 59, 0, 0);
      const s = toLocalInputValue(yStart);
      const e = toLocalInputValue(yEnd);
      setStartTime(s);
      setEndTime(e);
      validateTimeRange(s, e);
      return;
    }
    let start = now;
    switch (preset) {
      case 'last1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }
    const s = toLocalInputValue(start);
    const e = toLocalInputValue(now);
    setStartTime(s);
    setEndTime(e);
    validateTimeRange(s, e);
  };

  const validateRecordsJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setRecordsError(t('records.invalidArray'));
        return false;
      }
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          setRecordsError(t('records.invalidObject'));
          return false;
        }
        const keys = Object.keys(item);
        if (keys.length === 0) {
          setRecordsError(t('records.emptyObject'));
          return false;
        }
      }
      setRecordsError(null);
      return true;
    } catch {
      setRecordsError(t('records.invalidJson'));
      return false;
    }
  };

  // Ensure all services use real data instead of mock data
  useEffect(() => {
    moduleService.setMockDataMode(false);
    modelService.setMockDataMode(false);
    tableService.setMockDataMode(false);
  }, []);

  // Reset state when trigger mode changes
  useEffect(() => {
    setSubmitSucceeded(false);
    setStartTime('');
    setEndTime('');
    setSelectedTableName('');
    setActiveStep(0);
  }, [triggerMode]);

  // Reset test success state when configuration changes
  useEffect(() => {
    setSubmitSucceeded(false);
    setStartTime('');
    setEndTime('');
    setSelectedTableName('');
  }, [selectedModule, selectedModel]);

  // Step count depends on trigger mode
  const totalSteps = triggerMode === 'default' ? 1 : (triggerMode === 'by_table' ? 4 : 4);
  const stepLabels = triggerMode === 'default'
    ? [t('steps.mode')]
    : triggerMode === 'by_table'
      ? [t('steps.mode'), t('steps.module'), t('steps.model'), t('steps.table')]
      : [t('steps.mode'), t('steps.module'), t('steps.model'), t('steps.table')];

  // Validation helpers
  const needsTable = triggerMode === 'by_table' || triggerMode === 'by_record';
  const needsTimeRange = triggerMode === 'default' || triggerMode === 'by_table';
  const isConfigurationComplete = triggerMode === 'default'
    ? true
    : needsTable
      ? !!(selectedModule && selectedModel && selectedTableName)
      : !!(selectedModule && selectedModel);

  const handleNextStep = () => {
    if (activeStep < totalSteps - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleModeSelect = (mode: TriggerMode) => {
    setTriggerMode(mode);
  };

  const handleSubmit = async () => {
    // Validate time range for modes that need it
    if (needsTimeRange && (!startTime || !endTime)) {
      toast({
        title: t('toast.missingTimeTitle'),
        description: t('toast.missingTimeDescription'),
        variant: 'destructive',
      });
      return;
    }
    if (needsTimeRange && new Date(endTime) <= new Date(startTime)) {
      toast({
        title: t('toast.invalidTimeTitle'),
        description: t('toast.invalidTimeDescription'),
        variant: 'destructive',
      });
      return;
    }
    if (needsTable && !selectedTableName) {
      toast({
        title: t('toast.missingTableTitle'),
        description: t('toast.missingTableDescription'),
        variant: 'destructive',
      });
      return;
    }
    if (triggerMode === 'by_record') {
      if (!validateRecordsJson(recordsJson)) {
        toast({
          title: t('toast.invalidRecordsTitle'),
          description: recordsError || t('toast.invalidRecordsDescription'),
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const fmt = toMySQLDateTime;

      switch (triggerMode) {
        case 'default': {
          toast({ title: t('toast.runStartedTitle'), description: t('toast.fullSyncStarted') });
          await collectorService.triggerEvent({
            startTime: fmt(startTime),
            endTime: fmt(endTime),
          });
          toast({
            title: t('toast.runCompletedTitle'),
            description: t('toast.fullSyncCompleted'),
          });
          break;
        }
        case 'by_table': {
          toast({ title: t('toast.runStartedTitle'), description: t('toast.byTableStarted', { table: selectedTableName }) });
          await collectorService.triggerEventByTable({
            startTime: fmt(startTime),
            endTime: fmt(endTime),
            modelId: selectedModel,
            tableName: selectedTableName,
          });
          toast({
            title: t('toast.runCompletedTitle'),
            description: t('toast.byTableCompleted', { table: selectedTableName }),
          });
          break;
        }
        case 'by_record': {
          toast({ title: t('toast.runStartedTitle'), description: t('toast.byRecordStarted', { table: selectedTableName }) });
          const records = JSON.parse(recordsJson);
          await collectorService.triggerEventByRecord({
            tableName: selectedTableName,
            records,
          });
          toast({
            title: t('toast.runCompletedTitle'),
            description: t('toast.byRecordCompleted', { table: selectedTableName }),
          });
          break;
        }
      }
      setSubmitSucceeded(true);
    } catch (error: any) {
      toast({
        title: t('toast.runFailedTitle'),
        description: error?.message || t('toast.runFailedDescription'),
        variant: 'destructive',
      });
      setSubmitSucceeded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with AI Enhancement Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{t('headerTitle')}</h3>
          <p className="text-sm text-gray-600">{t('headerDescription')}</p>
        </div>
        {aiFeatureFlag && (
          <Button
            variant={isAiEnabled ? 'default' : 'outline'}
            size='sm'
            onClick={() => setIsAiEnabled(!isAiEnabled)}
            className='gap-2 self-start sm:self-auto'
          >
            <Sparkles className='h-4 w-4' />
            {isAiEnabled ? t('aiAssistanceOn') : t('aiAssistanceOff')}
          </Button>
        )}
      </div>

      <Separator className='my-6' />

      {/* Progress Indicator */}
      <div className='relative mb-8'>
        <div className='overflow-hidden h-2 mb-6 text-xs flex rounded bg-gray-200'>
          <div
            className='shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500'
            style={{ width: `${((activeStep + 1) / totalSteps) * 100}%` }}
          ></div>
        </div>
        <div className='flex justify-between'>
          {stepLabels.map((label, idx) => {
            const isComplete = activeStep > idx
              || (triggerMode === 'default' && idx === 0)
              || (idx === 1 && selectedModule)
              || (idx === 2 && selectedModel)
              || (idx === 3 && selectedTableName);
            const isActive = activeStep === idx;
            return (
              <div key={label} className={`text-center ${isActive || isComplete ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${isActive || isComplete ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {isComplete ? <CheckCircle className='h-5 w-5' /> : idx + 1}
                </div>
                <div className='text-xs mt-1'>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration Steps */}
      <div className='space-y-6'>
        {/* Step 0: Trigger Mode Selection */}
        <div className={`space-y-4 transition-all duration-300 ${activeStep === 0 ? 'block' : 'hidden'}`}>
          <div className='flex items-center gap-2 mb-4'>
            <div className='w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold'>
              1
            </div>
            <Label className='text-lg font-semibold'>{t('mode.select')}</Label>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {triggerModes.map((mode) => {
              const Icon = mode.icon;
              const isSelected = triggerMode === mode.value;
              return (
                <Card
                  key={mode.value}
                  className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleModeSelect(mode.value)}
                >
                  <CardContent className='p-5 space-y-3'>
                    <div className='flex items-center gap-3'>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className='h-5 w-5' />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {mode.label}
                        </p>
                        {isSelected && (
                          <CheckCircle className='h-4 w-4 text-blue-600 inline-block ml-1' />
                        )}
                      </div>
                    </div>
                    <p className='text-xs text-gray-600 leading-relaxed'>
                      {mode.description}
                    </p>
                    <code className='block text-[10px] text-gray-400 bg-gray-100 rounded px-2 py-1'>
                      {mode.details}
                    </code>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {triggerMode !== 'default' && (
            <div className='flex justify-end mt-4'>
              <Button
                onClick={handleNextStep}
                className='gap-2'
              >
                {t('mode.nextStep')}
                <ArrowRight className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>

        {/* Step 1: Module Selection (hidden for 'default' mode) */}
        {triggerMode !== 'default' && (
          <div className={`space-y-4 transition-all duration-300 ${activeStep === 1 ? 'block' : 'hidden'}`}>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold'>
                2
              </div>
              <Label className='text-lg font-semibold'>{t('steps.selectModule')}</Label>
              {selectedModule && <CheckCircle className='h-5 w-5 text-green-600' />}
            </div>
            <Card className='border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300'>
              <CardContent className='p-6'>
                <ModuleSelector
                  selectedModule={selectedModule}
                  onModuleSelect={setSelectedModule}
                  aiEnabled={isAiEnabled}
                />
              </CardContent>
            </Card>
            <div className='flex justify-between mt-4'>
              <Button
                variant='outline'
                onClick={handlePrevStep}
              >
                {t('steps.back')}
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedModule}
                className='gap-2'
              >
                {t('steps.nextStep')}
                <ArrowRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Model Selection (hidden for 'default' mode) */}
        {triggerMode !== 'default' && (
          <div className={`space-y-4 transition-all duration-300 ${activeStep === 2 ? 'block' : 'hidden'}`}>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold'>
                3
              </div>
              <Label className='text-lg font-semibold'>{t('steps.selectModel')}</Label>
              {selectedModel && <CheckCircle className='h-5 w-5 text-green-600' />}
            </div>
            <Card className='border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300'>
              <CardContent className='p-6'>
                <ModelSelector
                  selectedModule={selectedModule}
                  selectedModel={selectedModel}
                  onModelSelect={setSelectedModel}
                  onModelSelectDetail={(m) => setSelectedModelName(m.modelName)}
                  aiEnabled={isAiEnabled}
                />
              </CardContent>
            </Card>
            <div className='flex justify-between mt-4'>
              <Button
                variant='outline'
                onClick={handlePrevStep}
              >
                {t('steps.back')}
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedModel}
                className='gap-2'
              >
                {t('steps.nextStep')}
                <ArrowRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Table Selection (hidden for 'default' mode) */}
        {triggerMode !== 'default' && (
          <div className={`space-y-4 transition-all duration-300 ${activeStep === 3 ? 'block' : 'hidden'}`}>
            <div className='flex items-center gap-2 mb-4'>
              <div className='w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-semibold'>
                4
              </div>
              <Label className='text-lg font-semibold'>{t('steps.selectTable')}</Label>
              {selectedTableName && <CheckCircle className='h-5 w-5 text-green-600' />}
            </div>
            <Card className='border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300'>
              <CardContent className='p-6'>
                <TableSelector
                  selectedModule={selectedModule}
                  selectedModel={selectedModel}
                  selectedModelName={selectedModelName}
                  selectedTables={selectedTableName ? [selectedTableName] : []}
                  onTablesSelect={(tables) => setSelectedTableName(tables[0] || '')}
                  aiEnabled={isAiEnabled}
                  isSingleSelection={true}
                />
              </CardContent>
            </Card>
            <div className='flex justify-between mt-4'>
              <Button
                variant='outline'
                onClick={handlePrevStep}
              >
                {t('steps.back')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator className='my-6' />

      {/* Time Range Selection (for 'default' and 'by_table' modes) */}
      {needsTimeRange && (
        <Card className='border border-gray-200 shadow-sm'>
          <CardContent className='p-6 space-y-4'>
            <div className='flex flex-wrap gap-2 items-center justify-between'>
              <p className='text-xs text-gray-600'>{t('time.title')}</p>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' onClick={() => applyPreset('last1h')}>{t('time.last1h')}</Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('last24h')}>{t('time.last24h')}</Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('last7d')}>{t('time.last7d')}</Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('today')}>{t('time.today')}</Button>
                <Button variant='outline' size='sm' onClick={() => applyPreset('yesterday')}>{t('time.yesterday')}</Button>
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='startTime' className='text-sm font-medium'>{t('time.start')}</Label>
                <div className='mt-2 flex items-center gap-2'>
                  <Input
                    id='startTime'
                    type='datetime-local'
                    value={startTime}
                    onChange={(e) => handleStartChange(e.target.value)}
                    onBlur={() => startTime && setStartTime(toLocalInputValue(roundToMinute(new Date(startTime))))}
                    step={60}
                    max={toLocalInputValue(new Date())}
                  />
                </div>
                {startTime && (
                  <p className='text-xs text-gray-500 mt-1'>{t('time.mysqlPrefix', { value: toMySQLDateTime(startTime) })}</p>
                )}
              </div>
              <div>
                <Label htmlFor='endTime' className='text-sm font-medium'>{t('time.end')}</Label>
                <div className='mt-2 flex items-center gap-2'>
                  <Input
                    id='endTime'
                    type='datetime-local'
                    value={endTime}
                    onChange={(e) => handleEndChange(e.target.value)}
                    onBlur={() => endTime && setEndTime(toLocalInputValue(roundToMinute(new Date(endTime))))}
                    step={60}
                    max={toLocalInputValue(new Date())}
                  />
                  <Button variant='ghost' size='sm' onClick={() => handleEndChange(toLocalInputValue(roundToMinute(new Date())))}>{t('time.now')}</Button>
                </div>
                {endTime && (
                  <p className='text-xs text-gray-500 mt-1'>{t('time.mysqlPrefix', { value: toMySQLDateTime(endTime) })}</p>
                )}
              </div>
            </div>
            {timeError && (
              <p className='text-sm text-red-600'>{timeError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Records JSON Editor (for 'by_record' mode only) */}
      {triggerMode === 'by_record' && (
        <Card className='border border-gray-200 shadow-sm'>
          <CardContent className='p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label className='text-sm font-medium'>{t('records.title')}</Label>
                <p className='text-xs text-gray-500 mt-1'>
                  {t('records.description')}
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setRecordsJson('[\n  {\n    "": ""\n  }\n]');
                  setRecordsError(null);
                }}
              >
                {t('records.reset')}
              </Button>
            </div>
            <textarea
              className={`w-full h-48 px-3 py-2 rounded-md border font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                recordsError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
              }`}
              value={recordsJson}
              onChange={(e) => {
                setRecordsJson(e.target.value);
                if (recordsError) {
                  validateRecordsJson(e.target.value);
                }
              }}
              onBlur={() => validateRecordsJson(recordsJson)}
              placeholder='[&#10;  {&#10;    "policy_chg_id": "10042506"&#10;  }&#10;]'
              spellCheck={false}
            />
            {recordsError && (
              <p className='text-sm text-red-600'>{recordsError}</p>
            )}
            <p className='text-xs text-gray-400'>
              {t('records.example')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className='flex flex-col sm:flex-row gap-3 sm:justify-end'>
        <Button
          variant='outline'
          onClick={handleSubmit}
          disabled={(!isConfigurationComplete && triggerMode !== 'default') || isSubmitting}
          className='gap-2'
        >
          {isSubmitting ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Play className='h-4 w-4' />
          )}
          {isSubmitting ? t('submit.running') : t('submit.run')}
        </Button>
      </div>

      {/* Success indicator */}
      {submitSucceeded && (
        <Card className='p-4 bg-green-50 border border-green-200'>
          <div className='flex items-center gap-2'>
            <CheckCircle className='h-5 w-5 text-green-600' />
            <p className='text-sm text-green-800'>
              {t('submit.success')} <Link to='/monitor' className='underline font-medium'>Monitor</Link>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ConfigurationForm;
