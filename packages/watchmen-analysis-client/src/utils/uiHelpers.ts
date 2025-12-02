export const scrollToAnalysisPanel = () => {
  const rightPanel = document.querySelector('.w-1\/2.bg-gray-900');
  if (rightPanel) {
    rightPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add temporary highlight effect
    rightPanel.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
    setTimeout(() => {
      rightPanel.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
    }, 2000);
  }
};

export const highlightElement = (selector: string, duration: number = 2000) => {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
    setTimeout(() => {
      element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
    }, duration);
  }
};