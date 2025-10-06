@echo off
REM Build, tag, and push news-aggregator to local registry at localhost:5000
SET IMAGE_NAME=localhost:5000/news-aggregator:local
cd /d %~dp0\..\
echo Building image %IMAGE_NAME% from %CD%
docker build -t %IMAGE_NAME% .
echo Pushing to local registry
docker push %IMAGE_NAME%
echo Done.
