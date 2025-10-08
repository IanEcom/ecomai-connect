import 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      's-page': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      's-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        heading?: string;
      };
      's-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLElement>, HTMLElement> & {
        kind?: 'primary' | 'secondary' | 'plain' | string;
      };
      // Voeg hier meer toe als je ze gebruikt:
      // 's-badge': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { tone?: string };
      // 's-card':  ...
    }
  }
}

export {};
