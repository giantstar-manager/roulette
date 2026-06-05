import './localization';
import options from './options';
import { registerServiceWorker } from './registerServiceWorker';
import { Roulette } from './roulette';
import { SoopController } from './soopController';

registerServiceWorker();

const roulette = new Roulette();

(window as any).roulette = roulette;
(window as any).options = options;
(window as any).SoopController = SoopController;
