echo OFF
cls
if exist node_modules\ (
  node ./ttrpg-tools.js
) else (
  npm install && node ./ttrpg-tools.js
)