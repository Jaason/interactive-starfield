import { Starfield } from '../src/index.js';

const canvas = document.querySelector('#starfield');
const ctx = canvas.getContext('2d');

new Starfield(canvas, ctx);
