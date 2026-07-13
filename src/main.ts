import './styles/main.css';
import { Game } from './game';

const app = document.getElementById('app')!;
const game = new Game(app);
game.showTitle();
