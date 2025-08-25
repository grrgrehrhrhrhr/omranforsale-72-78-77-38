import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializePerformanceOptimizations } from './utils/performanceOptimizer'
import './utils/errorMonitoring'

// تهيئة بسيطة ومحسنة
const initializeApp = async () => {
  try {
    await initializePerformanceOptimizations();
  } catch (error) {
    // تجاهل أخطاء التهيئة لتجنب توقف التطبيق
  }
};

// تهيئة التطبيق
initializeApp();

createRoot(document.getElementById("root")!).render(<App />);
