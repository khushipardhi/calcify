import React from 'react';

export type Mode = 'deg' | 'rad';

export interface CalculatorState {
  display: string;
  expression: string;
  result: string | null;
  memory: number;
  mode: Mode;
  history: string[];
}

export type ActionType = 
  | 'digit' 
  | 'operator' 
  | 'function' 
  | 'clear' 
  | 'delete' 
  | 'equals' 
  | 'memory' 
  | 'toggle-mode';

export interface ButtonConfig {
  label: string;
  value: string;
  type: ActionType;
  className?: string;
  icon?: React.ReactNode;
}
