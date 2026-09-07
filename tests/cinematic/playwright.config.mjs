import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export default defineConfig({
  testDir:'.',testMatch:'*.spec.mjs',timeout:45000,retries:0,workers:2,
  reporter:[['list'],['html',{outputFolder:'report',open:'never'}]],outputDir:'results',
  use:{baseURL:'http://127.0.0.1:4174',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1440,height:1080},launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
    {name:'phone-chromium',use:{browserName:'chromium',viewport:{width:390,height:844},hasTouch:true}},
    {name:'tablet-webkit',use:{browserName:'webkit',viewport:{width:834,height:1194},hasTouch:true}},
  ],
  webServer:{command:'node node_modules/vite/bin/vite.js --config tests/cinematic/vite.config.mjs',cwd:root,url:'http://127.0.0.1:4174',reuseExistingServer:!process.env.CI,timeout:60000},
});
