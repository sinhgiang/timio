@echo off
REM Mở Timio Kiosk với autoplay được bật
REM Double-click file này để mở màn hình chấm công

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --app=http://localhost:3000/checkin/demo ^
  --autoplay-policy=no-user-gesture-required ^
  --disable-infobars ^
  --noerrdialogs ^
  --kiosk-printing

echo Timio Kiosk dang mo...
