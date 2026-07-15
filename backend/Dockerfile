FROM python:3.12-slim
WORKDIR /app

COPY pyproject.toml ./
COPY stock_dashboard_backend ./stock_dashboard_backend

RUN pip install --no-cache-dir .

EXPOSE 8080
ENTRYPOINT ["uvicorn", "stock_dashboard_backend.app:app", "--host", "0.0.0.0", "--port", "8080"]
