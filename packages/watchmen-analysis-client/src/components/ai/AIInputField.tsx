
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Calendar, Mail } from 'lucide-react';
import { BusinessService } from '@/services/businessService';
import { BusinessChallenge } from '@/model/business';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AIInputFieldProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
  placeholder: string;
}

const businessService = new BusinessService();

interface CommandChallengeProps {
  challenges: BusinessChallenge[];
  handleSelectChallenge: (challenge: BusinessChallenge) => void;
}

const  CommandChallenge :React.FC<CommandChallengeProps> = ({challenges,handleSelectChallenge })=> {
  return (
    <Command className="rounded-lg border shadow-md md:min-w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
        {challenges.map(challenge => (
            <CommandItem
            key={challenge.id}
            value={challenge.title}
            onSelect={() => handleSelectChallenge(challenge)}
          >
            {challenge.title}
            </CommandItem>
          ))}
         
        </CommandGroup>
       
    
      </CommandList>
    </Command>
  )
}

const AIInputField: React.FC<AIInputFieldProps> = ({
  inputValue,
  setInputValue,
  handleSendMessage,
  isLoading,
  placeholder
}) => {
  const [challenges, setChallenges] = useState<BusinessChallenge[]>([]);
  const [showChallenges, setShowChallenges] = useState(false);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  useEffect(() => {
    const loadChallenges = async () => {
      if (!showChallenges) return;
      try {
        setLoadingChallenges(true);
        const data = await businessService.getChallenges();
        if (!data) {
          setChallenges([]);
          return;
        }
        const validChallenges = Array.isArray(data) ? data.filter(challenge => 
          challenge && typeof challenge === 'object' && 'id' in challenge && 'title' in challenge
        ) : [];
        if (showChallenges) { // 确保在数据加载完成时仍然需要显示
          setChallenges(validChallenges);
        }
      } catch (error) {
        console.error('Error loading challenges:', error);
        setChallenges([]);
      } finally {
        if (showChallenges) { // 确保在加载完成时仍然需要显示
          setLoadingChallenges(false);
        }
      }
    };

    if (showChallenges) {
      loadChallenges();
    }
  }, [showChallenges]);

  useEffect(() => {
    if (inputValue === '#') {
      setShowChallenges(true);
    } else if (!inputValue.startsWith('#')) {
      setShowChallenges(false);
      setChallenges([]);
    }
  }, [inputValue]);

  const handleSelectChallenge = (challenge: BusinessChallenge) => {
    setInputValue(`#${challenge.title} : `);
    setShowChallenges(false);
  };

  return (
    <div className="flex items-center gap-2 w-full relative">
      <Popover open={showChallenges} onOpenChange={(open) => {
        // setShowChallenges(open);
        if (!open) {
          setChallenges([]);
          setLoadingChallenges(false);
        }
      }}>
        <PopoverTrigger asChild>
          <Textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="flex-grow resize-none h-10 py-2 px-3"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
      />
        </PopoverTrigger>
        {showChallenges && (
          <PopoverContent className="p-0" align="start">
            <CommandChallenge challenges={challenges} handleSelectChallenge={handleSelectChallenge} />
          </PopoverContent>
        )}
      </Popover>
      <Button 
        onClick={handleSendMessage} 
        disabled={isLoading || !inputValue.trim()}
        className="shrink-0 h-10 w-10"
        size="icon"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default AIInputField;
