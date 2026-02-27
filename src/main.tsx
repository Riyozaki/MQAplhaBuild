import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Modal from 'react-modal';
import App from './App.tsx';
import './index.css';

Modal.setAppElement('#root');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
