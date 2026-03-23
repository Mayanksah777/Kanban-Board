import { useCallback, useRef, useState } from 'react';

export function useToast(durationMs = 2500) {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const showToast = useCallback(
    (nextMessage) => {
      setMessage(nextMessage);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setMessage('');
      }, durationMs);
    },
    [durationMs]
  );

  return {
    message,
    showToast
  };
}