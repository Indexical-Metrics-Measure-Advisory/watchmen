import {Buffer} from 'buffer';
// @ts-ignore
import process from 'process/browser';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './app';
import * as serviceWorker from './serviceWorker';

// attach to window, therefore 3rd libs can use it directly
window.Buffer = Buffer;
window.process = process;

const style = 'color:rgba(94,119,171,0.9);';
console.info(`%c
 ██       ██             ██           ██                                     ██       ██         ██          ██████   ██ ██                    ██  
░██      ░██            ░██          ░██                                    ░██      ░██        ░██         ██░░░░██ ░██░░                    ░██  
░██   █  ░██  ██████   ██████  █████ ░██      ██████████   █████  ███████   ░██   █  ░██  █████ ░██        ██    ░░  ░██ ██  █████  ███████  ██████
░██  ███ ░██ ░░░░░░██ ░░░██░  ██░░░██░██████ ░░██░░██░░██ ██░░░██░░██░░░██  ░██  ███ ░██ ██░░░██░██████   ░██        ░██░██ ██░░░██░░██░░░██░░░██░ 
░██ ██░██░██  ███████   ░██  ░██  ░░ ░██░░░██ ░██ ░██ ░██░███████ ░██  ░██  ░██ ██░██░██░███████░██░░░██  ░██        ░██░██░███████ ░██  ░██  ░██  
░████ ░░████ ██░░░░██   ░██  ░██   ██░██  ░██ ░██ ░██ ░██░██░░░░  ░██  ░██  ░████ ░░████░██░░░░ ░██  ░██  ░░██    ██ ░██░██░██░░░░  ░██  ░██  ░██  
░██░   ░░░██░░████████  ░░██ ░░█████ ░██  ░██ ███ ░██ ░██░░██████ ███  ░██  ░██░   ░░░██░░██████░██████    ░░██████  ███░██░░██████ ███  ░██  ░░██ 
░░       ░░  ░░░░░░░░    ░░   ░░░░░  ░░   ░░ ░░░  ░░  ░░  ░░░░░░ ░░░   ░░   ░░       ░░  ░░░░░░ ░░░░░       ░░░░░░  ░░░ ░░  ░░░░░░ ░░░   ░░    ░░  
`, style);

const nameStyle = 'font-variant:petite-caps;font-weight:bold;text-transform:capitalize;color:white;background-color:rgba(94,119,171,0.9);padding:2px 6px;border-top-left-radius:6px;border-bottom-left-radius:6px;';
const valueStyle = 'color:white;font-weight:bold;background-color:rgba(255,161,0,0.9);padding:2px 6px;';
const valueAtEndStyle = 'color:white;font-weight:bold;background-color:rgba(255,161,0,0.9);padding:2px 6px;border-top-right-radius:6px;border-bottom-right-radius:6px;';
console.info(`%c${process.env.REACT_APP_NAME}%cv${process.env.REACT_APP_VERSION}%cIMMA By Matryoshka`, nameStyle, valueStyle,
	`color:white;font-weight:bold;background-color:rgba(205,42,51,0.9);padding:2px 6px;border-top-right-radius:6px;border-bottom-right-radius:6px;`);
console.info(`%cReact%c${React.version}`, nameStyle, valueAtEndStyle);
console.groupCollapsed('%cBuild Parameters', `font-variant:petite-caps;font-weight:bold;text-transform:capitalize;color:white;background-color:rgba(94,119,171,0.9);padding:2px 6px;border-radius:6px;`);
Object.keys(process.env)
	.filter(key => key.startsWith('REACT_APP_') && !['REACT_APP_VERSION', 'REACT_APP_NAME'].includes(key))
	.sort()
	.map(key => ({key, value: process.env[key]}))
	.forEach(param => console.info(`%c${param.key}%c${param.value}`, nameStyle, valueAtEndStyle));
console.groupEnd();

document.title = process.env.REACT_APP_DOCUMENT_TITLE || 'Watchmen Web Client, IMMA';

const root = createRoot(document.getElementById('root')!);
root.render(<App/>);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

