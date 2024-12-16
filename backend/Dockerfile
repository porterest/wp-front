# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY temp/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./temp .
