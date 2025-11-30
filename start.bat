@echo off
echo Starting Support Ticket Manager...
echo.

echo Starting Docker Compose services...
docker compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo Running migrations...
docker compose exec -T api npm run migrate

echo Seeding database...
docker compose exec -T api npm run seed

echo.
echo Setup complete!
echo.
echo Access the application:
echo   - Frontend: http://localhost:3000
echo   - API: http://localhost:3001
echo   - API Health: http://localhost:3001/health
echo.
echo To view logs:
echo   docker compose logs -f

