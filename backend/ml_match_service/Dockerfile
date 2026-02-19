FROM python:3.11-slim

WORKDIR /app

# Install system deps for faiss
RUN apt-get update && apt-get install -y build-essential libgcc-9-dev libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
