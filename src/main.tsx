import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Modal from 'react-modal';
import App from './App.tsx';
import './index.css';
import {store} from './store';
import {setStoreRef} from './services/api';

Modal.setAppElement('#root');

setStoreRef(store);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
