
"use client";

import { useState, useEffect, useCallback } from 'react';

export interface LoggedError {
    message: string;
    timestamp: string;
    id: string;
}

const MAX_ERRORS = 50;

export const useErrorLog = () => {
  const [errors, setErrors] = useState<LoggedError[]>([]);

  useEffect(() => {
    try {
      const storedErrors = localStorage.getItem('errorLog');
      if (storedErrors) {
        setErrors(JSON.parse(storedErrors));
      }
    } catch (e) {
      console.error("Failed to parse error log from localStorage", e);
      localStorage.removeItem('errorLog');
    }
  }, []);

  const addError = useCallback((message: string) => {
    setErrors(prevErrors => {
      const newError: LoggedError = {
        message,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID(),
      };
      
      const updatedErrors = [newError, ...prevErrors].slice(0, MAX_ERRORS);
      
      try {
        localStorage.setItem('errorLog', JSON.stringify(updatedErrors));
      } catch (e) {
        console.error("Failed to save error log to localStorage", e);
      }

      return updatedErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    localStorage.removeItem('errorLog');
  }, []);

  return { errors, addError, clearErrors };
};
