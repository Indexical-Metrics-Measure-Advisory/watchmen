
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BrainCircuit, Minimize } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import AIMessage, { Message } from './AIMessage';
import AIModeSelector from './AIModeSelector';
import AIInputField from './AIInputField';
import { getAIResponse, getWelcomeMessages } from './AIResponseGenerator';
import { AIMode } from '@/services/aiService';

interface AIAssistantProps {
  className?: string;
  mode?: AIMode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  className, 
  mode = 'hypothesis-analysis', 
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const location = useLocation();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const welcomeMessages = getWelcomeMessages();

  useEffect(() => {
    setMessages([{
      id: '1',
      content: welcomeMessages[currentMode],
      role: 'ai',
      timestamp: new Date(),
    }]);

    const params = new URLSearchParams(location.search);
    const validateMode = params.get('aiValidate');
    
    if (validateMode === 'true') {
      setCurrentMode('hypothesis-analysis');
      
      setTimeout(() => {
        const challengeId = params.get('challengeId');
        if (challengeId) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            content: `I've analyzed the hypotheses related to challenge #${challengeId}. Would you like me to validate any specific hypothesis?`,
            role: 'ai',
            timestamp: new Date(),
          }]);
        }
      }, 1000);
    }
  }, [currentMode, location.search]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await getAIResponse(inputValue, currentMode);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        role: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const changeMode = (newMode: 'hypothesis-analysis' | 'challenge-monitor') => {
    if (newMode !== currentMode) {
      setCurrentMode(newMode);
      setMessages([{
        id: Date.now().toString(),
        content: welcomeMessages[newMode],
        role: 'ai',
        timestamp: new Date(),
      }]);
    }
  };

  const getModeTitle = () => {
    switch (currentMode) {
      case 'challenge-monitor':
        return 'Business Challenge Monitor';

      case 'hypothesis-analysis':
      default:
        return 'Hypothesis Analysis Assistant';
    }
  };

  if (isCollapsed) {
    return (
      <Card className={cn("glass-card w-16 h-16 flex items-center justify-center cursor-pointer transition-all duration-300", className)} onClick={onToggleCollapse}>
        <BrainCircuit className="h-6 w-6 text-primary" />
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card flex flex-col h-full min-h-[800px] min-w-[400px]", className)}>
      <CardHeader className="flex-none pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            AI {getModeTitle()}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <AIModeSelector currentMode={currentMode} onModeChange={changeMode} />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onToggleCollapse}
            >
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {currentMode === 'hypothesis-analysis' && 'Intelligently analyze your hypotheses and provide data-supported insights'}
          {currentMode === 'challenge-monitor' && 'Continuously monitor business challenges and detect anomalies'}
          {/* {currentMode === 'improvement-actions' && 'Generate data-driven actions to improve business outcomes'} */}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-auto p-0 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="h-full px-8">
          <div className="space-y-8 py-8">
            {messages.map((message) => (
              <AIMessage key={message.id} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex max-w-[80%] rounded-lg p-3 bg-muted ml-0">
                <div className="mr-2 mt-0.5">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex-none p-4 pt-3">
        <div className="w-full">
          <AIInputField
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={`Use # select a challenge , Ask about ${currentMode === 'hypothesis-analysis' ? 'hypothesis validation' : currentMode === 'challenge-monitor' ? 'business challenges' : 'improvement actions'}... `}
          />
        </div>
      </CardFooter>
    </Card>
  );
};

export default AIAssistant;
