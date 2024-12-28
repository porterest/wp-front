# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV TZ='Europe/Moscow'

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .
