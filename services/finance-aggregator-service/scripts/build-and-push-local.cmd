@echo off
REM Build, tag, and push finance-aggregator to local registry at localhost:5000
SET IMAGE_NAME=localhost:5000/finance-aggregator:local
cd /d %~dp0\..\
echo Building image %IMAGE_NAME% from %CD%
docker build -t %IMAGE_NAME% .
echo Pushing to local registry
docker push %IMAGE_NAME%
echo Done.
