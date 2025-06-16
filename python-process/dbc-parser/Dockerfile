FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY dbc_parser.py .

ENTRYPOINT ["python", "dbc_parser.py"]