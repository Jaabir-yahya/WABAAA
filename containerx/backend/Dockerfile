FROM python:3.11-slim

WORKDIR /app

COPY requirements/base.txt ./requirements/base.txt
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . .

RUN useradd -m -u 1000 containerx && chown -R containerx:containerx /app
USER containerx

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
