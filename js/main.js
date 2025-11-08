// js/main.js
import { initApp, renderRoute } from './app.js';

window.addEventListener('hashchange', renderRoute);
document.addEventListener('DOMContentLoaded', initApp);

